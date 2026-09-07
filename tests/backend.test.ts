import { sendMessage as send } from "../src/server/send-message";
import {
  prepareAvatar,
  completeAvatar,
  discardAvatar,
  removeAvatar,
  avatarResponse,
  avatarSchema,
} from "../src/server/avatars";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { makeAuth } from "../src/server/auth";
import { mutate } from "../src/server/actions";
import {
  ensureProfile,
  requireConversation,
  takeLimit,
} from "../src/server/access";
import { snapshot, messagePage, searchMessages } from "../src/server/queries";
import {
  prepareUpload,
  completeUpload,
  attachmentResponse,
} from "../src/server/uploads";
import { requireOrigin, readJson } from "../src/server/http";
import { actionSchema, defaults } from "../src/lib/contracts";
import { stateActions } from "../src/lib/state-actions";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const viewers = ["owner", "member", "outsider"].map((id) => ({ id, name: id }));
before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const viewer of viewers) {
    await db
      .insert(schema.user)
      .values({ ...viewer, email: `${viewer.id}@example.test` });
    await ensureProfile(db, viewer);
  }
});
after(async () => {
  await engine.close();
});
async function action(userId: string, input: unknown) {
  return db.transaction((tx) =>
    mutate(tx as unknown as Database, userId, actionSchema.parse(input)),
  );
}
async function community() {
  const id = crypto.randomUUID();
  await action("owner", {
    type: "community.create",
    id,
    community: {
      name: "Test room",
      description: "Only for tests",
      icon: "sun",
      color: "purple",
      category: "Tests",
    },
    channels: [
      { id: "general", name: "general", description: "", group: "CHAT" },
      {
        id: "private",
        name: "private",
        description: "",
        group: "CHAT",
        private: true,
      },
    ],
  });
  return id;
}
test("real Better Auth sign-up, password hashing, session, wrong-password rejection and logout", async () => {
  process.env.BETTER_AUTH_SECRET = "test-only-" + "a".repeat(40);
  process.env.BETTER_AUTH_URL = "http://localhost:1515";
  const auth = makeAuth(db);
  const request = (path: string, body?: unknown, cookie?: string) =>
    new Request(`http://localhost:1515/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        origin: "http://localhost:1515",
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const signup = await auth.handler(
    request("sign-up/email", {
      email: "auth@example.test",
      name: "Auth test",
      password: "Password123!",
    }),
  );
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get("set-cookie")!.split(";")[0];
  assert.ok(cookie.includes("session_token"));
  const me = await auth.handler(request("get-session", undefined, cookie));
  assert.equal((await me.json()).user.email, "auth@example.test");
  const [account] = await db.select().from(schema.account);
  assert.notEqual(account.password, "Password123!");
  const invalid = await auth.handler(
    request("sign-in/email", {
      email: "auth@example.test",
      password: "wrong-password",
    }),
  );
  assert.equal(invalid.status, 401);
  await auth.handler(request("sign-out", {}, cookie));
  assert.equal(
    await (
      await auth.handler(request("get-session", undefined, cookie))
    ).json(),
    null,
  );
});
test("members cannot manage channels; private channels and messages stay private across every read path", async () => {
  const id = await community();
  await action("member", { type: "community.join", id });
  await assert.rejects(
    () =>
      action("member", {
        type: "category.create",
        communityId: id,
        name: "NO",
      }),
    /owners and admins/,
  );
  const secret = crypto.randomUUID();
  await action("owner", {
    type: "message.send",
    id: secret,
    conversation: `${id}:private`,
    text: "private needle",
    attachments: [],
  });
  await assert.rejects(
    () => requireConversation(db, "member", `${id}:private`),
    /access/,
  );
  const state = await snapshot(db, viewers[1]);
  assert.ok(!state.messages.some((m) => m.id === secret));
  assert.ok(
    !state.communities
      .find((c) => c.id === id)!
      .channels.some((c) => c.id === "private"),
  );
  assert.equal(
    (await searchMessages(db, "member", "private needle")).length,
    0,
  );
  await assert.rejects(
    () => messagePage(db, "member", `${id}:private`),
    /access/,
  );
  await action("owner", {
    type: "channel.access",
    conversation: `${id}:private`,
    userId: "member",
    allow: true,
  });
  assert.ok(
    (await messagePage(db, "member", `${id}:private`)).messages.some(
      (m) => m.id === secret,
    ),
  );
  await action("member", { type: "community.leave", id });
  await action("member", { type: "community.join", id });
  await assert.rejects(
    () => requireConversation(db, "member", `${id}:private`),
    /access/,
  );
});
test("message retries are idempotent; edits, deletions, reactions, saves and threads are authorized", async () => {
  const id = await community();
  await action("member", { type: "community.join", id });
  const messageId = crypto.randomUUID();
  const input = {
    type: "message.send",
    id: messageId,
    conversation: `${id}:general`,
    text: "Hello!",
    attachments: [],
  };
  await action("owner", input);
  await action("owner", input);
  assert.equal(
    (
      await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, messageId))
    ).length,
    1,
  );
  await assert.rejects(
    () =>
      action("member", {
        type: "message.update",
        id: messageId,
        text: "stolen",
      }),
    /own messages/,
  );
  await assert.rejects(
    () => action("member", { type: "message.delete", id: messageId }),
    /cannot delete/,
  );
  await action("member", { type: "reaction", id: messageId, emoji: "🧡" });
  await action("member", {
    type: "message.update",
    id: messageId,
    saved: true,
  });
  const memberState = await snapshot(db, viewers[1]);
  assert.equal(
    memberState.messages.find((m) => m.id === messageId)?.reactions[0].mine,
    true,
  );
  assert.equal(
    memberState.messages.find((m) => m.id === messageId)?.saved,
    true,
  );
  assert.equal(
    (await snapshot(db, viewers[0])).messages.find((m) => m.id === messageId)
      ?.saved,
    false,
  );
  await action("member", { type: "reaction", id: messageId, emoji: "🧡" });
  const reply = crypto.randomUUID();
  await action("member", {
    type: "message.send",
    id: reply,
    conversation: `${id}:general`,
    text: "reply",
    threadOf: messageId,
    attachments: [],
  });
  await assert.rejects(
    () =>
      action("owner", {
        type: "message.send",
        id: crypto.randomUUID(),
        conversation: `${id}:private`,
        text: "cross-channel reply",
        threadOf: messageId,
        attachments: [],
      }),
    /original message/,
  );
  await action("owner", { type: "message.delete", id: messageId });
  assert.ok(
    !(await snapshot(db, viewers[1])).messages.some(
      (m) => m.id === messageId || m.id === reply,
    ),
  );
});
test("mentions resolve on the server, and invalid group mentions roll back the message", async () => {
  const id = await community();
  await action("member", { type: "community.join", id });
  const ownMessage = crypto.randomUUID();
  await action("owner", {
    type: "message.send",
    id: ownMessage,
    conversation: `${id}:general`,
    text: "Hello @everyone",
    attachments: [],
  });
  assert.equal(
    (
      await db
        .select()
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, "member"),
            eq(schema.notifications.messageId, ownMessage),
          ),
        )
    ).length,
    1,
  );
  const rejected = crypto.randomUUID();
  await assert.rejects(
    () =>
      action("member", {
        type: "message.send",
        id: rejected,
        conversation: `${id}:general`,
        text: "@everyone spam",
        attachments: [],
      }),
    /owners and admins/,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, rejected))
    ).length,
    0,
  );
});
test("friend acceptance cannot be forged and blocking revokes DM access", async () => {
  await assert.rejects(
    () =>
      action("outsider", { type: "friend", id: "owner", operation: "accept" }),
    /incoming request/,
  );
  await action("owner", {
    type: "friend",
    id: "outsider",
    operation: "request",
  });
  await action("outsider", {
    type: "friend",
    id: "owner",
    operation: "accept",
  });
  const id = crypto.randomUUID();
  await action("owner", {
    type: "message.send",
    id,
    conversation: "dm:outsider",
    text: "Private hello",
    attachments: [],
  });
  assert.ok(
    (await snapshot(db, viewers[2])).messages.some(
      (m) => m.id === id && m.conversation === "dm:owner",
    ),
  );
  await action("outsider", { type: "friend", id: "owner", operation: "block" });
  await assert.rejects(
    () => requireConversation(db, "owner", "dm:outsider"),
    /unavailable/,
  );
  assert.ok(
    !(await snapshot(db, viewers[0])).messages.some((m) => m.id === id),
  );
  await action("outsider", {
    type: "friend",
    id: "owner",
    operation: "unblock",
  });
});
test("message cursors have no duplicates or gaps for equal timestamps", async () => {
  const id = await community();
  const now = new Date();
  const values = Array.from({ length: 63 }, () => ({
    id: crypto.randomUUID(),
    conversationId: `${id}:general`,
    authorId: "owner",
    content: "history",
    createdAt: now,
  }));
  await db.insert(schema.messages).values(values);
  const first = await messagePage(db, "owner", `${id}:general`);
  const second = await messagePage(
    db,
    "owner",
    `${id}:general`,
    first.messages[0].id,
  );
  assert.equal(first.messages.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(second.messages.length, 13);
  assert.equal(second.hasMore, false);
  assert.equal(
    new Set([...first.messages, ...second.messages].map((m) => m.id)).size,
    63,
  );
});
test("upload ownership, private visibility, actual bytes and message binding are verified", async () => {
  const id = await community();
  await action("member", { type: "community.join", id });
  let path = "";
  let ready = false;
  const storage = {
    async createFileUpload(p: string, input: { visibility: string }) {
      assert.equal(input.visibility, "private");
      path = p;
      return {
        file: { id: "file-id" },
        upload: {
          id: "upload-id",
          url: "https://storage.example.test/put",
          headers: { "content-type": "image/png" },
        },
      };
    },
    async getFile(p: string) {
      assert.equal(p, path);
      return {
        file: {
          status: ready ? "ready" : "pending",
          byteSize: 0,
          visibility: "private",
        },
      };
    },
    async completePathUpload() {
      ready = true;
    },
    async createSignedUrl() {
      return { signedUrl: { url: "https://storage.example.test/read" } };
    },
  } as unknown as Parameters<typeof prepareUpload>[3];
  const upload = await prepareUpload(
    db,
    "owner",
    {
      conversation: `${id}:general`,
      filename: "../image.png",
      contentType: "image/png",
      byteSize: 8,
    },
    storage,
  );
  await assert.rejects(
    () => completeUpload(db, "member", upload.id, storage),
    /not found/,
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array(9));
  try {
    await assert.rejects(
      () => completeUpload(db, "owner", upload.id, storage),
      /larger than expected/,
    );
    globalThis.fetch = async () =>
      new Response(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const file = await completeUpload(db, "owner", upload.id, storage);
    assert.equal(file.contentType, "image/png");
    await assert.rejects(
      () =>
        action("member", {
          type: "message.send",
          id: crypto.randomUUID(),
          conversation: `${id}:general`,
          text: "",
          attachments: [upload.id],
        }),
      /attachment/,
    );
    const messageId = crypto.randomUUID();
    const delivered = await send(db, "owner", {
      type: "message.send",
      id: messageId,
      conversation: `${id}:general`,
      text: "",
      attachments: [upload.id],
    });
    assert.equal(delivered.message?.attachments?.[0]?.id, upload.id);
    assert.equal(
      (await attachmentResponse(db, "member", upload.id, storage)).headers.get(
        "content-type",
      ),
      "image/png",
    );
    await assert.rejects(
      () => attachmentResponse(db, "outsider", upload.id, storage),
      /access/,
    );
    await assert.rejects(
      () =>
        action("owner", {
          type: "message.send",
          id: crypto.randomUUID(),
          conversation: `${id}:general`,
          text: "",
          attachments: [upload.id],
        }),
      /attachment/,
    );
    await action("owner", { type: "message.delete", id: messageId });
    await assert.rejects(
      () => attachmentResponse(db, "member", upload.id, storage),
      /not found/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("request validation, CSRF and shared rate limits reject invalid input", async () => {
  assert.throws(
    () =>
      requireOrigin(
        new Request("http://localhost:1515/api/app", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    /must come from/,
  );
  assert.throws(() =>
    actionSchema.parse({
      type: "message.send",
      id: crypto.randomUUID(),
      conversation: "x",
      text: "",
      attachments: [],
    }),
  );
  await assert.rejects(
    () =>
      readJson(
        new Request("http://localhost:1515/api/app", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "x".repeat(128001),
        }),
      ),
    /too large/,
  );
  await takeLimit(db, "owner", "test", 1);
  await assert.rejects(() => takeLimit(db, "owner", "test", 1), /too fast/);
});
test("UI adapter sends only scoped actions and never trusts changed authorship or roles", async () => {
  const previous = await snapshot(db, viewers[0]);
  const next = structuredClone(previous);
  next.drafts.test = "local draft";
  next.people = [];
  next.messages = [];
  assert.deepEqual(stateActions(previous, next), []);
  next.preferences = { ...defaults, theme: "light" };
  assert.equal(stateActions(previous, next)[0]?.type, "preferences");
});

test("avatar ownership, image validation, persistence, replacement and removal", async () => {
  let content = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const storage = {
    async createFileUpload(path: string, input: { visibility: string }) {
      assert.ok(path.startsWith("avatars/owner/"));
      assert.equal(input.visibility, "private");
      return {
        file: { id: "avatar-file" },
        upload: {
          id: "upload",
          url: "https://storage.example.test/put",
          headers: {},
        },
      };
    },
    async completePathUpload() {},
    async getFile() {
      return { file: { status: "ready", visibility: "private", byteSize: 0 } };
    },
    async createSignedUrl() {
      return { signedUrl: { url: "https://storage.example.test/read" } };
    },
  } as unknown as Parameters<typeof prepareAvatar>[3];
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(content);
  try {
    assert.equal(
      avatarSchema.safeParse({
        byteSize: 6 * 1024 * 1024,
        contentType: "image/png",
      }).success,
      false,
    );
    assert.equal(
      avatarSchema.safeParse({ byteSize: 8, contentType: "image/svg+xml" })
        .success,
      false,
    );
    const upload = await prepareAvatar(
      db,
      "owner",
      { byteSize: 8, contentType: "image/png" },
      storage,
    );
    await assert.rejects(
      () => completeAvatar(db, "member", upload.id, storage),
      /not found/,
    );
    await assert.rejects(
      () => avatarResponse(db, upload.id, storage),
      /not found/,
    );
    content = new TextEncoder().encode("<script>");
    await assert.rejects(
      () => completeAvatar(db, "owner", upload.id, storage),
      /Choose a PNG/,
    );
    content = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    await discardAvatar(db, "member", upload.id);
    const result = await completeAvatar(db, "owner", upload.id, storage);
    assert.equal(
      (await snapshot(db, viewers[0])).profile.avatarUrl,
      result.url,
    );
    assert.equal(
      (await snapshot(db, viewers[1])).people.find((p) => p.id === "owner")
        ?.avatarUrl,
      result.url,
    );
    assert.equal(
      (await completeAvatar(db, "owner", upload.id, storage)).url,
      result.url,
    );
    assert.equal(
      (await avatarResponse(db, upload.id, storage)).headers.get(
        "content-type",
      ),
      "image/png",
    );
    await discardAvatar(db, "owner", upload.id); // Cancellation cannot remove an active photo.
    await avatarResponse(db, upload.id, storage);
    const replacement = await prepareAvatar(
      db,
      "owner",
      { byteSize: 8, contentType: "image/png" },
      storage,
    );
    await completeAvatar(db, "owner", replacement.id, storage);
    await assert.rejects(
      () => avatarResponse(db, upload.id, storage),
      /not found/,
    );
    await assert.rejects(
      () => completeAvatar(db, "owner", upload.id, storage),
      /not found/,
    );
    await removeAvatar(db, "member"); // Removing your own photo cannot affect another account.
    await avatarResponse(db, replacement.id, storage);
    await removeAvatar(db, "owner");
    assert.equal((await snapshot(db, viewers[0])).profile.avatarUrl, undefined);
    await assert.rejects(
      () => avatarResponse(db, replacement.id, storage),
      /not found/,
    );
    const cancelled = await prepareAvatar(
      db,
      "owner",
      { byteSize: 8, contentType: "image/png" },
      storage,
    );
    await discardAvatar(db, "owner", cancelled.id);
    await assert.rejects(
      () => completeAvatar(db, "owner", cancelled.id, storage),
      /not found/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("onboarding can finish without joining a community, then create an owned community", async () => {
  const before = await snapshot(db, viewers[2]);
  const commands = stateActions(before, {
    ...before,
    onboardingComplete: true,
  });
  for (const command of commands) await action("outsider", command);
  const skipped = await snapshot(db, viewers[2]);
  assert.equal(skipped.onboardingComplete, true);
  assert.deepEqual(
    skipped.communities.filter((c) => c.joined).map((c) => c.id),
    before.communities.filter((c) => c.joined).map((c) => c.id),
  );
  const id = crypto.randomUUID();
  await action("outsider", {
    type: "community.create",
    id,
    community: {
      name: "My own place",
      description: "",
      icon: "sun",
      color: "purple",
      category: "Community",
    },
    channels: [
      { id: "general", name: "general", description: "", group: "CHAT" },
    ],
  });
  const created = (await snapshot(db, viewers[2])).communities.find(
    (c) => c.id === id,
  )!;
  assert.equal(created.joined, true);
  assert.equal(created.memberRoles?.you, "Owner");
});

test("fast message writes enforce access, retries and rate limits without full-state invalidation", async () => {
  const room = await community();
  await action("member", { type: "community.join", id: room });
  const input = {
    type: "message.send" as const,
    id: crypto.randomUUID(),
    conversation: `${room}:general`,
    text: "Fast hello",
    attachments: [],
  };
  const previousEvents = new Set(
    (await db.select().from(schema.events)).map((e) => e.id),
  );
  const sent = await send(db, "owner", input);
  assert.equal(sent.message?.text, "Fast hello");
  assert.equal(sent.message?.author, "you");
  const recipients = (await db.select().from(schema.events))
    .filter((e) => !previousEvents.has(e.id))
    .map((e) => e.userId)
    .sort();
  assert.deepEqual(recipients, []);

  const eventCount = (await db.select().from(schema.events)).length;
  assert.equal((await send(db, "owner", input)).message?.id, input.id);
  assert.equal((await db.select().from(schema.events)).length, eventCount);
  await assert.rejects(() => send(db, "member", input), /already in use/);
  await assert.rejects(
    () => send(db, "outsider", { ...input, id: crypto.randomUUID() }),
    /access/,
  );
  await assert.rejects(
    () =>
      send(db, "member", {
        ...input,
        id: crypto.randomUUID(),
        conversation: `${room}:private`,
      }),
    /access/,
  );
  const privateSend = await send(db, "owner", {
    ...input,
    id: crypto.randomUUID(),
    conversation: `${room}:private`,
  });
  assert.ok(privateSend.message);
  await action("owner", {
    type: "channel.access",
    conversation: `${room}:private`,
    userId: "member",
    allow: true,
  });
  assert.ok(
    (
      await send(db, "member", {
        ...input,
        id: crypto.randomUUID(),
        conversation: `${room}:private`,
      })
    ).message,
  );
  await action("owner", { type: "message.delete", id: input.id });
  assert.equal((await send(db, "owner", input)).message, null);
  const fresh = { ...input, id: crypto.randomUUID() };
  const retries = await Promise.all([
    send(db, "owner", fresh),
    send(db, "owner", fresh),
  ]);
  assert.equal(retries[0].message?.id, retries[1].message?.id);
  assert.equal(
    (
      await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, fresh.id))
    ).length,
    1,
  );
  const limitKey = "actions:owner";
  await db
    .update(schema.limits)
    .set({ count: 120, windowStart: new Date() })
    .where(eq(schema.limits.key, limitKey));
  const limited = { ...input, id: crypto.randomUUID() };
  await assert.rejects(() => send(db, "owner", limited), /too fast/);
  assert.equal(
    (
      await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, limited.id))
    ).length,
    0,
  );
  await db.delete(schema.limits).where(eq(schema.limits.key, limitKey));
});

test("dedicated send path handles replies, mentions and existing/new DMs", async () => {
  const room = await community();
  await action("member", { type: "community.join", id: room });
  const base = {
    type: "message.send" as const,
    conversation: `${room}:general`,
    attachments: [],
  };
  const parent = await send(db, "owner", {
    ...base,
    id: crypto.randomUUID(),
    text: "Hello @everyone",
  });
  const reply = await send(db, "member", {
    ...base,
    id: crypto.randomUUID(),
    text: "Reply",
    threadOf: parent.message!.id,
  });
  assert.equal(reply.message?.threadOf, parent.message!.id);
  assert.equal(
    (
      await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.messageId, reply.message!.id))
    ).length,
    1,
  );
  await assert.rejects(
    () =>
      send(db, "member", { ...base, id: crypto.randomUUID(), text: "@admin" }),
    /owners and admins/,
  );
  const dm = {
    ...base,
    conversation: "dm:member",
    id: crypto.randomUUID(),
    text: "New DM",
  };
  assert.ok((await send(db, "owner", dm)).message);
  assert.ok(
    (
      await send(db, "owner", {
        ...dm,
        id: crypto.randomUUID(),
        text: "Existing DM",
      })
    ).message,
  );
  await action("member", { type: "friend", id: "owner", operation: "block" });
  await assert.rejects(
    () => send(db, "owner", { ...dm, id: crypto.randomUUID() }),
    /unavailable/,
  );
  await action("member", { type: "friend", id: "owner", operation: "unblock" });
});

test("live message projections reauthorize recipients and include edits, reactions, saves, files and tombstones", async () => {
  const { liveMessage, authorizeRoom } =
    await import("../src/server/realtime/data");
  const room = await community();
  await action("member", { type: "community.join", id: room });
  const conversation = `${room}:general`;
  const id = crypto.randomUUID();
  await send(db, "owner", {
    type: "message.send",
    id,
    conversation,
    text: "Live hello",
    attachments: [],
  });
  const frame = await liveMessage(db, "member", conversation, id);
  assert.equal(frame?.message?.text, "Live hello");
  assert.equal(frame?.message?.author, "owner");
  assert.equal(frame?.person?.name, "owner");
  assert.equal(await liveMessage(db, "outsider", conversation, id), null);
  assert.equal(await liveMessage(db, "member", `${room}:private`, id), null);
  await assert.rejects(
    () => authorizeRoom(db, "member", { conversation, threadOf: "missing" }),
    /unavailable/,
  );
  await action("member", { type: "reaction", id, emoji: "👍" });
  await action("member", { type: "message.update", id, saved: true });
  assert.deepEqual(
    (await liveMessage(db, "member", conversation, id))?.message?.reactions,
    [{ emoji: "👍", count: 1, mine: true }],
  );
  assert.equal(
    (await liveMessage(db, "member", conversation, id))?.message?.saved,
    true,
  );
  assert.equal(
    (await liveMessage(db, "owner", conversation, id))?.message?.saved,
    false,
  );
  await action("owner", { type: "message.update", id, text: "Edited live" });
  assert.equal(
    (await liveMessage(db, "member", conversation, id))?.message?.text,
    "Edited live",
  );
  await action("owner", { type: "message.delete", id });
  assert.equal(
    (await liveMessage(db, "member", conversation, id))?.message,
    null,
  );
  await action("member", { type: "community.leave", id: room });
  assert.equal(await liveMessage(db, "member", conversation, id), null);
});

test("database notifications publish committed messages, never rolled-back writes or retries", async () => {
  const room = await community();
  const received: { type: string; id?: string }[] = [];
  const unlisten = await engine.listen("drocsid_live", (payload) =>
    received.push(JSON.parse(payload)),
  );
  const input = {
    type: "message.send" as const,
    id: crypto.randomUUID(),
    conversation: `${room}:general`,
    text: "Commit only",
    attachments: [],
  };
  try {
    await assert.rejects(
      () =>
        db.transaction(async (tx) => {
          await send(tx as unknown as Database, "owner", input);
          throw new Error("rollback");
        }),
      /rollback/,
    );
    assert.equal(received.filter((e) => e.id === input.id).length, 0);
    await send(db, "owner", input);
    assert.equal(
      received.filter((e) => e.type === "message" && e.id === input.id).length,
      1,
    );
    await send(db, "owner", input);
    assert.equal(received.filter((e) => e.id === input.id).length, 1);
  } finally {
    await unlisten();
  }
});
