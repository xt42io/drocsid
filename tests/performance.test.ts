import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { defaults, type Action } from "../src/lib/contracts";
import { ensureProfile, requireConversation } from "../src/server/access";
import { snapshot, searchMessages } from "../src/server/queries";
import { directory } from "../src/server/directory";
import { makeAuth } from "../src/server/auth";
import { sendMessage } from "../src/server/send-message";
import { fastAction } from "../src/server/fast-actions";
import { invalidateActions } from "../src/server/invalidation";
import { liveMessages } from "../src/server/realtime/data";
import { markRead } from "../src/server/read-state";
import { attachmentResponse, verifyStoredUpload } from "../src/server/uploads";

const engine = new PGlite();
let queries = 0;
const database = drizzle(engine, {
  schema,
  logger: {
    logQuery() {
      queries++;
    },
  },
});
const db = database as unknown as Database;
const room = "performance-room",
  channel = `${room}:general`;
const send = (
  overrides: Partial<Extract<Action, { type: "message.send" }>> = {},
  userId = "owner",
) =>
  sendMessage(db, userId, {
    type: "message.send",
    id: crypto.randomUUID(),
    conversation: channel,
    text: "Performance baseline",
    attachments: [],
    ...overrides,
  });
before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const id of ["owner", "member", "outsider"]) {
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@performance.test` });
    await ensureProfile(db, { id, name: id });
    await db
      .update(schema.profiles)
      .set({ handle: `user_${id}`, onboardingComplete: true })
      .where(eq(schema.profiles.userId, id));
  }
  await db.insert(schema.communities).values({
    id: room,
    name: "Performance",
    description: "",
    icon: "sun",
    color: "purple",
    category: "Tests",
  });
  await db.insert(schema.members).values([
    { communityId: room, userId: "owner", role: "Owner" },
    { communityId: room, userId: "member" },
  ]);
  await db.insert(schema.conversations).values({
    id: channel,
    kind: "channel",
    communityId: room,
    channelId: "general",
    name: "general",
  });
});
after(() => engine.close());

test("bootstrap uses two reads, metadata refresh one, and unrelated profiles use paged discovery", async () => {
  await send();
  queries = 0;
  const full = await snapshot(db, { id: "owner", name: "owner" });
  assert.equal(queries, 2);
  assert.deepEqual(
    full.people.map((p) => p.id),
    ["member"],
  );
  assert.ok(full.messages.length);
  queries = 0;
  const metadata = await snapshot(db, { id: "owner", name: "owner" }, 0);
  assert.equal(queries, 1);
  assert.deepEqual(metadata.messages, []);
  const found = await directory(db, "owner", {
    kind: "people",
    query: "outsider",
    offset: 0,
  });
  assert.equal(found.people?.[0].id, "outsider");
  assert.ok(
    !JSON.stringify(found).includes("performance.test"),
    "Directory does not expose emails",
  );
});

test("joined communities survive the discovery bound; reconnect sync retains old IDs but removes tombstones", async () => {
  const joined = "zz-joined";
  await db.insert(schema.communities).values(
    Array.from({ length: 55 }, (_, index) => ({
      id: `catalog-${index}`,
      name: `Catalog ${index}`,
      description: "",
      icon: "sun",
      color: "purple",
      category: "Catalog",
    })),
  );
  await db.insert(schema.communities).values({
    id: joined,
    name: "Joined later",
    description: "",
    icon: "sun",
    color: "purple",
    category: "Catalog",
  });
  await db
    .insert(schema.members)
    .values({ communityId: joined, userId: "owner" });
  const state = await snapshot(db, { id: "owner", name: "owner" }, 0);
  assert.ok(state.communities.some((c) => c.id === joined && c.joined));
  assert.ok(state.communities.filter((c) => !c.joined).length <= 50);
  const page = await directory(db, "owner", {
    kind: "communities",
    query: "Catalog",
    category: "Catalog",
    offset: 0,
  });
  assert.equal(page.communities?.length, 50);
  assert.equal(page.hasMore, true);
  const second = await directory(db, "owner", {
    kind: "communities",
    query: "Catalog",
    offset: 50,
  });
  assert.equal(second.communities?.length, 5);
  const old = (await send()).message!;
  const deleted = (await send()).message!;
  await db
    .update(schema.messages)
    .set({ createdAt: new Date(0) })
    .where(eq(schema.messages.id, old.id));
  await fastAction(db, "owner", { type: "message.delete", id: deleted.id });
  const synced = await snapshot(db, { id: "owner", name: "owner" }, 0, [
    old.id,
    deleted.id,
  ]);
  assert.deepEqual(
    synced.messages.map((m) => m.id),
    [old.id],
  );
});

test("session joins use one read and still respect immediate logout", async () => {
  process.env.BETTER_AUTH_SECRET = "performance-test-" + "a".repeat(40);
  let code = "";
  const auth = makeAuth(db, async ({ otp }) => {
    code = otp;
  });
  const signup = await auth.handler(
    new Request(
      "http://localhost:1515/api/auth/email-otp/send-verification-otp",
      {
        method: "POST",
        headers: {
          origin: "http://localhost:1515",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Auth performance",
          email: "auth@performance.test",
          type: "sign-in",
        }),
      },
    ),
  );
  assert.equal(signup.status, 200);
  const verified = await auth.api.signInEmailOTP({
    body: { email: "auth@performance.test", otp: code },
    asResponse: true,
  });
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  queries = 0;
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  assert.ok(session);
  assert.equal(queries, 1);
  await db
    .delete(schema.session)
    .where(eq(schema.session.id, session.session.id));
  assert.equal(
    await auth.api.getSession({ headers: new Headers({ cookie }) }),
    null,
  );
});

test("email, mentions, replies and attached messages each commit in one query", async () => {
  for (const text of [
    "hello@example.test",
    "`@everyone`",
    "Hi @user_member",
    "@everyone",
  ]) {
    queries = 0;
    assert.ok((await send({ text })).message);
    assert.equal(queries, 1, text);
  }
  const parent = (await send()).message!;
  queries = 0;
  const reply = await send({ threadOf: parent.id }, "member");
  assert.equal(queries, 1);
  assert.equal(reply.message?.threadOf, parent.id);
  const fileId = crypto.randomUUID();
  await db.insert(schema.attachments).values({
    id: fileId,
    uploaderId: "owner",
    conversationId: channel,
    path: `${fileId}.png`,
    originalName: "image.png",
    contentType: "image/png",
    byteSize: 8,
    status: "ready",
  });
  queries = 0;
  const attached = await send({ attachments: [fileId], text: "@user_member" });
  assert.equal(queries, 1);
  assert.equal(attached.message?.attachments?.[0].id, fileId);
  await assert.rejects(() => send({ attachments: [fileId] }), /attachment/);
  const otherFile = crypto.randomUUID();
  await db.insert(schema.attachments).values({
    id: otherFile,
    uploaderId: "member",
    conversationId: channel,
    path: `${otherFile}.png`,
    originalName: "image.png",
    contentType: "image/png",
    byteSize: 8,
    status: "ready",
  });
  await assert.rejects(() => send({ attachments: [otherFile] }), /attachment/);
  const duplicateId = crypto.randomUUID();
  const concurrent = await Promise.all([
    send({ id: duplicateId, attachments: [otherFile] }, "member"),
    send({ id: duplicateId, attachments: [otherFile] }, "member"),
  ]);
  assert.equal(concurrent[0].message?.id, concurrent[1].message?.id);
  assert.equal(concurrent[1].message?.attachments?.[0].id, otherFile);
});

test("category and message edits are atomic, scoped and enforce permissions", async () => {
  const events: { type: string; userId?: string }[] = [];
  const unlisten = await engine.listen("drocsid_live", (payload) =>
    events.push(JSON.parse(payload)),
  );
  try {
    queries = 0;
    assert.equal(
      await fastAction(db, "owner", {
        type: "category.create",
        communityId: room,
        name: "FAST",
      }),
      true,
    );
    assert.equal(queries, 1);
    assert.deepEqual(
      events
        .filter((e) => e.type === "invalidate")
        .map((e) => e.userId)
        .sort(),
      ["member", "owner"],
    );
    await assert.rejects(
      () =>
        fastAction(db, "member", {
          type: "category.create",
          communityId: room,
          name: "DENIED",
        }),
      /owners and admins/,
    );
    const message = (await send({ text: "Old content" })).message!;
    queries = 0;
    await fastAction(db, "owner", {
      type: "message.update",
      id: message.id,
      text: "Indexed searchableword",
      pinned: true,
      saved: true,
    });
    assert.equal(queries, 1);
    await assert.rejects(
      () =>
        fastAction(db, "member", {
          type: "message.update",
          id: message.id,
          text: "Wrong author",
        }),
      /cannot change/,
    );
    await assert.rejects(
      () =>
        fastAction(db, "member", {
          type: "message.update",
          id: message.id,
          pinned: false,
        }),
      /cannot change/,
    );
    await fastAction(db, "member", {
      type: "message.update",
      id: message.id,
      saved: true,
    });
    const frames = await liveMessages(
      db,
      ["owner", "member", "outsider"],
      channel,
      message.id,
    );
    assert.deepEqual(frames.map((f) => f.userId).sort(), ["member", "owner"]);
    assert.ok(frames.every((f) => f.frame.message?.saved));
    assert.equal(
      (await searchMessages(db, "member", "searchable")).some(
        (m) => m.id === message.id,
      ),
      true,
    );
    assert.deepEqual(await searchMessages(db, "outsider", "searchable"), []);
    await fastAction(db, "owner", { type: "message.delete", id: message.id });
    assert.deepEqual(await searchMessages(db, "member", "searchable"), []);
  } finally {
    await unlisten();
  }
});

test("opening existing DMs is read-only and never invalidates other accounts", async () => {
  await db
    .insert(schema.friendships)
    .values({ senderId: "owner", recipientId: "member", accepted: true });
  await requireConversation(db, "owner", "dm:member", true);
  const events: unknown[] = [];
  const unlisten = await engine.listen("drocsid_live", (value) =>
    events.push(JSON.parse(value)),
  );
  try {
    queries = 0;
    await requireConversation(db, "owner", "dm:member");
    await invalidateActions(db, "owner", [
      { type: "conversation.open", conversation: "dm:member" },
    ]);
    assert.equal(queries, 1);
    assert.deepEqual(events, []);
    queries = 0;
    await liveMessages(
      db,
      ["owner", "member", "outsider"],
      channel,
      (await send()).message!.id,
    );
    assert.equal(
      queries,
      2,
      "One send and one recipient batch, regardless of connected users",
    );
  } finally {
    await unlisten();
  }
});

test("media caching reauthorizes before 304 and reuses transformed bytes", async (t) => {
  const message = (await send()).message!;
  const id = crypto.randomUUID();
  await db.insert(schema.attachments).values({
    id,
    uploaderId: "owner",
    conversationId: channel,
    messageId: message.id,
    path: `cache/${id}.png`,
    originalName: "image.png",
    contentType: "image/png",
    byteSize: 8,
    status: "ready",
  });
  let downloads = 0,
    signatures = 0;
  const storage = {
    async createSignedUrl() {
      signatures++;
      return { signedUrl: { url: "https://storage.test/cache" } };
    },
  } as Parameters<typeof attachmentResponse>[3];
  t.mock.method(globalThis, "fetch", async () => {
    downloads++;
    return new Response("webp", { headers: { "content-type": "image/webp" } });
  });
  queries = 0;
  const first = await attachmentResponse(db, "member", id, storage, "chat-420");
  assert.equal(queries, 1);
  assert.equal(await first.text(), "webp");
  const conditional = new Request(
    `http://localhost:1515/api/attachments/${id}`,
    { headers: { "if-none-match": first.headers.get("etag")! } },
  );
  assert.equal(
    (
      await attachmentResponse(
        db,
        "member",
        id,
        storage,
        "chat-420",
        conditional,
      )
    ).status,
    304,
  );
  assert.equal(
    await (
      await attachmentResponse(db, "owner", id, storage, "chat-420")
    ).text(),
    "webp",
  );
  assert.equal(downloads, 1);
  assert.equal(signatures, 1);
  await assert.rejects(
    () =>
      attachmentResponse(db, "outsider", id, storage, "chat-420", conditional),
    /access/,
  );
  await fastAction(db, "owner", { type: "message.delete", id: message.id });
  await assert.rejects(
    () =>
      attachmentResponse(db, "member", id, storage, "chat-420", conditional),
    /not found/,
  );
});

test("upload signature ranges validate the complete object length without redownloading it", async (t) => {
  const storage = {
    async completePathUpload() {},
    async getFile() {
      return { file: { status: "ready", visibility: "private" } };
    },
    async createSignedUrl() {
      return { signedUrl: { url: "https://storage.test/range" } };
    },
  } as Parameters<typeof verifyStoredUpload>[1];
  const png = new Uint8Array(32);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  let total = 25000;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("range"), "bytes=0-31");
    return new Response(png, {
      status: 206,
      headers: { "content-range": `bytes 0-31/${total}` },
    });
  });
  const file = { path: "range", uploadId: "range-upload", byteSize: 25000 };
  assert.equal(await verifyStoredUpload(file, storage), "image/png");
  total = 24000;
  await assert.rejects(() => verifyStoredUpload(file, storage), /incomplete/);
});

test("read updates use one statement, advance monotonically, and reject outsiders", async () => {
  queries = 0;
  await markRead(db, "member", {
    type: "conversation.read",
    conversation: channel,
    through: new Date().toISOString(),
  });
  assert.equal(queries, 1);
  const before = (
    await db
      .select()
      .from(schema.readStates)
      .where(eq(schema.readStates.userId, "member"))
  )[0].readAt;
  const events: unknown[] = [];
  const unlisten = await engine.listen("drocsid_live", (event) =>
    events.push(JSON.parse(event)),
  );
  try {
    await markRead(db, "member", {
      type: "conversation.read",
      conversation: channel,
      through: new Date(0).toISOString(),
    });
    assert.equal(
      (
        await db
          .select()
          .from(schema.readStates)
          .where(eq(schema.readStates.userId, "member"))
      )[0].readAt.getTime(),
      before.getTime(),
    );
    assert.deepEqual(
      events,
      [],
      "Old read cursors do not cause redundant realtime events",
    );
    await assert.rejects(
      () =>
        markRead(db, "outsider", {
          type: "conversation.read",
          conversation: channel,
          through: new Date().toISOString(),
        }),
      /unavailable/,
    );
  } finally {
    await unlisten();
  }

  const precise = await send({ text: "Microsecond read cursor" });
  assert.ok(precise.message?.createdAt);
  await markRead(db, "member", {
    type: "conversation.read",
    conversation: channel,
    through: precise.message.createdAt,
    messageId: precise.message.id,
  });
  const refreshed = await snapshot(db, { id: "member", name: "member" }, 0);
  const unread = refreshed.communities
    .find((community) => community.id === room)
    ?.channels.find((item) => item.id === "general")?.unread;
  assert.equal(
    unread,
    0,
    "The exact database timestamp clears a message beyond JavaScript millisecond precision",
  );
});

test("permission notifications identify the affected account or channel, while topic edits need no reauthorization", async () => {
  const events: {
    type: string;
    userIds?: string[];
    conversationId?: string;
  }[] = [];
  const unlisten = await engine.listen("drocsid_live", (event) =>
    events.push(JSON.parse(event)),
  );
  try {
    await db
      .update(schema.conversations)
      .set({ description: "New topic" })
      .where(eq(schema.conversations.id, channel));
    assert.ok(!events.some((event) => event.type === "access"));
    await db
      .update(schema.conversations)
      .set({ private: true })
      .where(eq(schema.conversations.id, channel));
    assert.ok(
      events.some(
        (event) => event.type === "access" && event.conversationId === channel,
      ),
    );
    await db
      .update(schema.conversations)
      .set({ private: false })
      .where(eq(schema.conversations.id, channel));
    await db
      .insert(schema.blocks)
      .values({ userId: "owner", targetId: "member" });
    assert.ok(
      events.some(
        (event) =>
          event.type === "access" &&
          event.userIds?.join(",") === "owner,member",
      ),
    );
    await db.delete(schema.blocks).where(eq(schema.blocks.userId, "owner"));
  } finally {
    await unlisten();
  }
});

test("PostgreSQL can use the committed full-text index for prefix searches", async () => {
  await db.transaction(async (tx) => {
    // A tiny fixture legitimately favors another partial index. Give the planner
    // enough ordinary history to distinguish indexed search from scanning it all.
    await tx.execute(sql`insert into messages (id, conversation_id, author_id, content)
      select 'search-fixture-' || n, ${channel}, 'owner', 'Ordinary chat history' from generate_series(1, 10000) n`);
    await tx.execute(sql`analyze messages`);
    await tx.execute(sql`set local enable_seqscan = off`);
    const plan = await tx.execute(
      sql`explain (format json) select id from messages where deleted_at is null and to_tsvector('simple', content) @@ to_tsquery('simple', 'performance:*')`,
    );
    assert.match(JSON.stringify(plan.rows), /message_search_idx/);
  });
});

test("joining a community is one atomic write and repeated joins do not invalidate it again", async () => {
  const id = "fast-join-room";
  await db.insert(schema.communities).values({
    id,
    name: "Join",
    description: "",
    icon: "sun",
    color: "purple",
    category: "Tests",
  });
  await db
    .insert(schema.members)
    .values({ communityId: id, userId: "owner", role: "Owner" });
  const events: { type: string; userId?: string }[] = [];
  const unlisten = await engine.listen("drocsid_live", (event) =>
    events.push(JSON.parse(event)),
  );
  try {
    queries = 0;
    assert.equal(
      await fastAction(db, "outsider", { type: "community.join", id }),
      true,
    );
    assert.equal(queries, 1);
    assert.deepEqual(
      events
        .filter((event) => event.type === "invalidate")
        .map((event) => event.userId)
        .sort(),
      ["outsider", "owner"],
    );
    const joined = await snapshot(db, { id: "outsider", name: "outsider" }, 0);
    assert.ok(
      joined.communities.find((community) => community.id === id)?.joined,
    );
    events.length = 0;
    await fastAction(db, "outsider", { type: "community.join", id });
    assert.deepEqual(events, []);
  } finally {
    await unlisten();
  }
});
