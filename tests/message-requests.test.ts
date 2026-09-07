import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { ensureProfile, requireConversation } from "../src/server/access";
import { mutate } from "../src/server/actions";
import { sendMessage } from "../src/server/send-message";
import { snapshot, messagePage, searchMessages } from "../src/server/queries";
import { liveMessage, authorizeRoom } from "../src/server/realtime/data";
import { prepareUpload } from "../src/server/uploads";
import { actionSchema, defaults } from "../src/lib/contracts";
import { applyLiveMessage } from "../src/lib/live-state";
import {
  incomingMessageRequests,
  normalDirectMessages,
  dmReadOnly,
} from "../src/lib/direct-messages";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const viewer = (id: string) => ({ id, name: id });
const state = (id: string) => snapshot(db, viewer(id));
const action = (id: string, value: unknown) =>
  db.transaction((tx) =>
    mutate(tx as unknown as Database, id, actionSchema.parse(value)),
  );
const send = (
  from: string,
  to: string,
  text = "Hello",
  attachments: string[] = [],
) =>
  sendMessage(db, from, {
    type: "message.send",
    id: crypto.randomUUID(),
    conversation: `dm:${to}`,
    text,
    attachments,
  });

before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const id of ["alice", "bob", "carl", "dana"]) {
    await db
      .insert(schema.user)
      .values({ ...viewer(id), email: `${id}@requests.test` });
    await ensureProfile(db, viewer(id));
  }
  await db.insert(schema.communities).values({
    id: "requests-test",
    name: "Requests",
    description: "Tests",
    icon: "sun",
    color: "purple",
    category: "Tests",
  });
  await db.insert(schema.members).values(
    ["alice", "bob", "carl"].map((userId) => ({
      userId,
      communityId: "requests-test",
    })),
  );
});
after(() => engine.close());

test("non-friend DMs arrive atomically as requests, stay read-only, and become normal DMs only on acceptance", async () => {
  await action("alice", { type: "conversation.open", conversation: "dm:bob" });
  const beforeMessage = await state("bob");
  assert.equal(
    incomingMessageRequests(beforeMessage).length,
    0,
    "Opening an empty DM must not send a request",
  );
  const sent = await send("alice", "bob", "Hello @user_bob");
  const frame = await liveMessage(db, "bob", "dm:alice:bob", sent.message!.id);
  assert.equal(frame?.dmConversation?.status, "pending");
  assert.equal(frame?.dmConversation?.incoming, true);
  const live = applyLiveMessage(beforeMessage, frame!);
  assert.equal(incomingMessageRequests(live).length, 1);
  assert.equal(
    normalDirectMessages(live).length,
    0,
    "No flash in the normal DM list",
  );
  assert.equal(
    incomingMessageRequests(await state("bob")).length,
    1,
    "Requests survive refresh",
  );
  assert.equal(
    normalDirectMessages(await state("alice")).length,
    1,
    "Sender keeps their outgoing DM",
  );
  assert.equal(
    (await state("bob")).activities.length,
    0,
    "Mentions cannot escape the requests inbox",
  );
  assert.equal((await messagePage(db, "bob", "dm:alice")).messages.length, 1);
  await assert.rejects(
    () => send("bob", "alice"),
    /Accept this message request/,
  );
  await assert.rejects(
    () => send("bob", "alice", "Hi @user_alice"),
    /Accept this message request/,
  );
  await assert.rejects(
    () =>
      action("bob", { type: "reaction", id: sent.message!.id, emoji: "👍" }),
    /Accept this message request/,
  );
  await assert.rejects(
    () =>
      prepareUpload(
        db,
        "bob",
        {
          conversation: "dm:alice",
          filename: "test.png",
          contentType: "image/png",
          byteSize: 12,
        },
        {} as never,
      ),
    /Accept this message request/,
  );
  for (const [user, other] of [
    ["alice", "bob"],
    ["bob", "alice"],
  ]) {
    await assert.rejects(
      () => authorizeRoom(db, user, { conversation: `dm:${other}` }),
      /message request/,
    );
    await action(user, {
      type: "conversation.read",
      conversation: `dm:${other}`,
      through: new Date().toISOString(),
    });
  }
  assert.equal((await db.select().from(schema.readStates)).length, 0);
  await assert.rejects(
    () =>
      action("alice", {
        type: "dm.request",
        personId: "bob",
        operation: "accept",
      }),
    /incoming message request/,
  );
  await assert.rejects(
    () =>
      action("carl", {
        type: "dm.request",
        personId: "alice",
        operation: "accept",
      }),
    /unavailable/,
  );
  await action("bob", {
    type: "dm.request",
    personId: "alice",
    operation: "accept",
  });
  const accepted = await state("bob");
  assert.equal(
    accepted.friends.length,
    0,
    "Message acceptance is separate from friendship",
  );
  assert.equal(incomingMessageRequests(accepted).length, 0);
  assert.equal(normalDirectMessages(accepted).length, 1);
  assert.equal(
    incomingMessageRequests(applyLiveMessage(accepted, frame!)).length,
    0,
    "A delayed pending frame cannot undo acceptance",
  );
  assert.equal(
    await authorizeRoom(db, "bob", { conversation: "dm:alice" }),
    "dm:alice:bob",
  );
  assert.ok((await send("bob", "alice")).message);
  await action("bob", {
    type: "conversation.read",
    conversation: "dm:alice",
    through: new Date().toISOString(),
  });
  assert.equal((await db.select().from(schema.readStates)).length, 1);
});

test("declining persists and revokes recipient history, while every send path and reopening stay blocked", async () => {
  const sent = await send("alice", "carl");
  const stale = await liveMessage(
    db,
    "carl",
    "dm:alice:carl",
    sent.message!.id,
  );
  await action("carl", {
    type: "dm.request",
    personId: "alice",
    operation: "decline",
  });
  const declined = await state("carl");
  assert.equal(incomingMessageRequests(declined).length, 0);
  assert.equal(normalDirectMessages(declined).length, 0);
  const delayed = applyLiveMessage(declined, stale!);
  assert.equal(incomingMessageRequests(delayed).length, 0);
  assert.ok(!delayed.messages.some((m) => m.id === sent.message!.id));
  assert.ok(!declined.messages.some((m) => m.id === sent.message!.id));
  assert.equal(
    await liveMessage(db, "carl", "dm:alice:carl", sent.message!.id),
    null,
  );
  await assert.rejects(
    () => messagePage(db, "carl", "dm:alice"),
    /unavailable/,
  );
  await assert.rejects(() => send("alice", "carl"), /unavailable/);
  await assert.rejects(
    () => send("alice", "carl", "Hello @user_carl"),
    /unavailable/,
  );
  await action("alice", { type: "conversation.open", conversation: "dm:carl" });
  await assert.rejects(
    () =>
      action("carl", { type: "conversation.open", conversation: "dm:alice" }),
    /access/,
  );
  assert.equal(
    (await requireConversation(db, "alice", "dm:carl")).dmStatus,
    "declined",
  );
  await assert.rejects(
    () =>
      action("carl", {
        type: "dm.request",
        personId: "alice",
        operation: "accept",
      }),
    /unavailable/,
  );
  const found = await searchMessages(db, "carl", "Hello");
  assert.ok(!found.some((m) => m.id === sent.message!.id));
});

test("friendship acceptance bypasses requests, and privacy preferences and blocks still apply", async () => {
  await db
    .update(schema.profiles)
    .set({ preferences: { ...defaults, directMessages: false } })
    .where(eq(schema.profiles.userId, "dana"));
  await assert.rejects(() => send("alice", "dana"), /Become friends/);
  await action("alice", { type: "friend", id: "dana", operation: "request" });
  await action("dana", { type: "friend", id: "alice", operation: "accept" });
  assert.ok((await send("alice", "dana")).message);
  assert.equal(
    (await requireConversation(db, "dana", "dm:alice")).dmStatus,
    "accepted",
  );
  await action("dana", { type: "friend", id: "alice", operation: "block" });
  await assert.rejects(() => send("alice", "dana"), /unavailable/);
  await assert.rejects(
    () =>
      action("alice", {
        type: "dm.request",
        personId: "dana",
        operation: "accept",
      }),
    /unavailable/,
  );
  // Explicitly becoming friends also accepts an outstanding or declined DM.
  await action("alice", { type: "friend", id: "carl", operation: "request" });
  await action("carl", { type: "friend", id: "alice", operation: "accept" });
  assert.equal(
    (await requireConversation(db, "carl", "dm:alice")).dmStatus,
    "accepted",
  );
});

test("migration moves old one-way non-friend DMs to requests without moving reciprocal or friend conversations", async () => {
  const legacy = new PGlite();
  try {
    const journal = JSON.parse(
      readFileSync("drizzle/meta/_journal.json", "utf8"),
    );
    for (const entry of journal.entries.filter(
      (e: { idx: number }) => e.idx < 5,
    ))
      await legacy.exec(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
    await legacy.exec(`
      INSERT INTO "user" (id,name,email) VALUES ('a','a','a@test'),('b','b','b@test'),('c','c','c@test'),('d','d','d@test');
      INSERT INTO conversations (id,kind) VALUES ('oneway','dm'),('replied','dm'),('friends','dm'),('empty','dm');
      INSERT INTO conversation_members VALUES ('oneway','a'),('oneway','b'),('replied','a'),('replied','c'),('friends','a'),('friends','d'),('empty','b'),('empty','c');
      INSERT INTO messages (id,conversation_id,author_id,content) VALUES ('1','oneway','a','hi'),('2','replied','a','hi'),('3','replied','c','hi back'),('4','friends','a','hi');
      INSERT INTO friendships (sender_id,recipient_id,accepted) VALUES ('a','d',true);
    `);
    await legacy.exec(
      readFileSync("drizzle/0005_message_requests.sql", "utf8"),
    );
    const { rows } = await legacy.query<{
      id: string;
      dm_status: string;
      dm_initiator_id: string | null;
    }>("SELECT id,dm_status,dm_initiator_id FROM conversations ORDER BY id");
    assert.deepEqual(
      rows.map((r) => [r.id, r.dm_status]),
      [
        ["empty", "pending"],
        ["friends", "accepted"],
        ["oneway", "pending"],
        ["replied", "accepted"],
      ],
    );
    assert.equal(rows.find((r) => r.id === "oneway")?.dm_initiator_id, "a");
    assert.equal(rows.find((r) => r.id === "empty")?.dm_initiator_id, null);
    assert.equal(
      (
        await legacy.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM messages",
        )
      ).rows[0].count,
      4,
    );
  } finally {
    await legacy.close();
  }
});

test("blocking a pending request preserves its preview without accepting it or allowing replies", async () => {
  const sent = await send("carl", "bob", "Request history stays visible");
  const { setReaction } = await import("../src/server/reactions");
  await assert.rejects(
    () =>
      setReaction(db, "bob", {
        id: sent.message!.id,
        emoji: "👍",
        active: true,
      }),
    /unavailable/,
  );
  await action("bob", { type: "friend", id: "carl", operation: "block" });
  for (const [from, to] of [
    ["bob", "carl"],
    ["carl", "bob"],
  ]) {
    const snapshot = await state(from);
    assert.equal(dmReadOnly(snapshot, `dm:${to}`), true);
    assert.ok(snapshot.messages.some((m) => m.id === sent.message!.id));
    assert.equal(
      snapshot.dmConversations.find((d) => d.personId === to)?.status,
      "pending",
    );
    await assert.rejects(() => send(from, to), /unavailable/);
    await assert.rejects(
      () => authorizeRoom(db, from, { conversation: `dm:${to}` }),
      /unavailable/,
    );
  }
  assert.ok(
    incomingMessageRequests(await state("bob")).some(
      (d) => d.personId === "carl",
    ),
  );
  assert.ok(
    !normalDirectMessages(await state("bob")).some((p) => p.id === "carl"),
  );
  await assert.rejects(
    () =>
      action("bob", {
        type: "dm.request",
        personId: "carl",
        operation: "accept",
      }),
    /unavailable/,
  );
  await action("bob", { type: "friend", id: "carl", operation: "unblock" });
  assert.equal(dmReadOnly(await state("bob"), "dm:carl"), true);
  assert.equal(dmReadOnly(await state("carl"), "dm:bob"), false);
  await assert.rejects(
    () => send("bob", "carl"),
    /Accept this message request/,
  );
});
