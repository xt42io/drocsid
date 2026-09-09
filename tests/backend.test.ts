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
test("real Better Auth code signup, session, disabled password login and logout", async () => {
  process.env.BETTER_AUTH_SECRET = "test-only-" + "a".repeat(40);
  process.env.BETTER_AUTH_URL = "http://localhost:1515";
  let code = "";
  const auth = makeAuth(db, async ({ otp }) => {
    code = otp;
  });
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
    request("email-otp/send-verification-otp", {
      email: "auth@example.test",
      type: "sign-in",
    }),
  );
  assert.equal(signup.status, 200);
  assert.equal(signup.headers.get("set-cookie"), null);
  const verified = await auth.handler(
    request("sign-in/email-otp", {
      email: "auth@example.test",
      otp: code,
    }),
  );
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  assert.ok(cookie.includes("session_token"));
  const me = await auth.handler(request("get-session", undefined, cookie));
  assert.equal((await me.json()).user.email, "auth@example.test");
  const accounts = await db.select().from(schema.account);
  assert.equal(accounts.length, 0);
  const invalid = await auth.handler(
    request("sign-in/email", {
      email: "auth@example.test",
      password: "wrong-password",
    }),
  );
  assert.equal(invalid.status, 404);
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
test("blocking preserves DM history and attachments while rejecting interaction in both directions", async (t) => {
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
  const { liveMessage, authorizeRoom } =
    await import("../src/server/realtime/data");
  const { normalDirectMessages, dmReadOnly } =
    await import("../src/lib/direct-messages");
  const { applyLiveMessage } = await import("../src/lib/live-state");
  const conversationId = "dm:outsider:owner";
  const attachmentId = crypto.randomUUID();
  await db.insert(schema.attachments).values({
    id: attachmentId,
    conversationId,
    uploaderId: "owner",
    messageId: id,
    path: `test/${attachmentId}`,
    originalName: "history.png",
    contentType: "image/png",
    byteSize: 8,
    status: "ready",
  });
  let downloads = 0;
  const storage = {
    async createSignedUrl() {
      return { signedUrl: { url: "https://storage.example.test/history" } };
    },
    async createFileUpload() {
      assert.fail("Blocked users must not get an upload session");
    },
  } as unknown as Parameters<typeof prepareUpload>[3];
  t.mock.method(globalThis, "fetch", async () => {
    downloads++;
    return new Response("original", {
      headers: { "content-type": "image/png" },
    });
  });
  for (const [from, to, viewer] of [
    ["owner", "outsider", viewers[0]],
    ["outsider", "owner", viewers[2]],
  ] as const) {
    const key = `dm:${to}`;
    assert.equal((await requireConversation(db, from, key)).id, conversationId);
    const state = await snapshot(db, viewer);
    assert.ok(state.messages.some((m) => m.id === id));
    assert.ok(normalDirectMessages(state).some((p) => p.id === to));
    assert.equal(
      state.dmConversations.find((d) => d.personId === to)?.messagingBlocked,
      true,
    );
    assert.equal(dmReadOnly(state, key), true);
    assert.ok(
      (await messagePage(db, from, key)).messages.some((m) => m.id === id),
    );
    assert.ok(
      (await searchMessages(db, from, "Private hello")).some(
        (m) => m.id === id,
      ),
    );
    const live = await liveMessage(db, from, conversationId, id);
    assert.equal(live?.message?.id, id);
    assert.equal(live?.dmConversation?.messagingBlocked, true);
    assert.equal(
      dmReadOnly(
        applyLiveMessage(state, {
          ...live!,
          dmConversation: { ...live!.dmConversation!, messagingBlocked: false },
        }),
        key,
      ),
      true,
    );
    assert.equal(
      await (await attachmentResponse(db, from, attachmentId, storage)).text(),
      "original",
    );
    for (const extra of [
      { text: "Fast path" },
      { text: "Slow @mention path" },
      { text: "Thread reply", threadOf: id },
      { text: "Attachment", attachments: [attachmentId] },
    ]) {
      const rejectedId = crypto.randomUUID();
      await assert.rejects(
        () =>
          send(db, from, {
            type: "message.send",
            id: rejectedId,
            conversation: key,
            attachments: [],
            ...extra,
          }),
        /unavailable/,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.messages)
            .where(eq(schema.messages.id, rejectedId))
        ).length,
        0,
      );
    }
    await assert.rejects(
      () =>
        action(from, {
          type: "message.send",
          id: crypto.randomUUID(),
          conversation: key,
          text: "Direct HTTP action",
          attachments: [],
        }),
      /unavailable/,
    );
    await assert.rejects(
      () => action(from, { type: "reaction", id, emoji: "👍" }),
      /unavailable/,
    );
    await assert.rejects(
      () => authorizeRoom(db, from, { conversation: key }),
      /unavailable/,
    );
    await assert.rejects(
      () =>
        prepareUpload(
          db,
          from,
          {
            conversation: key,
            filename: "new.png",
            contentType: "image/png",
            byteSize: 8,
          },
          storage,
        ),
      /unavailable/,
    );
  }
  assert.equal(downloads, 2);
  await assert.rejects(
    () => attachmentResponse(db, "member", attachmentId, storage),
    /access/,
  );
  assert.equal(downloads, 2);
  assert.equal(
    (await snapshot(db, viewers[0])).blocked.includes("outsider"),
    false,
  );
  assert.equal(
    (await snapshot(db, viewers[2])).blocked.includes("owner"),
    true,
  );
  // One person's unblock cannot override the other person's block.
  await action("owner", { type: "friend", id: "outsider", operation: "block" });
  await action("outsider", {
    type: "friend",
    id: "owner",
    operation: "unblock",
  });
  await assert.rejects(
    () =>
      send(db, "outsider", {
        type: "message.send",
        id: crypto.randomUUID(),
        conversation: "dm:owner",
        text: "Still blocked",
        attachments: [],
      }),
    /unavailable/,
  );
  await action("owner", {
    type: "friend",
    id: "outsider",
    operation: "unblock",
  });
  assert.equal(
    (await snapshot(db, viewers[0])).dmConversations.find(
      (d) => d.personId === "outsider",
    )?.messagingBlocked,
    false,
  );
  assert.ok(
    (
      await send(db, "outsider", {
        type: "message.send",
        id: crypto.randomUUID(),
        conversation: "dm:owner",
        text: "Unblocked",
        attachments: [],
      })
    ).message,
  );
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
    let imageFetches = 0;
    globalThis.fetch = async (input) => {
      imageFetches++;
      assert.match(
        new URL(String(input)).searchParams.get("tr") ?? "",
        /w:420/,
      );
      return new Response("webp", {
        headers: { "content-type": "image/webp" },
      });
    };
    const thumbnail = await attachmentResponse(
      db,
      "member",
      upload.id,
      storage,
      "chat-420",
    );
    assert.equal(thumbnail.headers.get("content-type"), "image/webp");
    assert.equal(thumbnail.headers.get("content-length"), null);
    assert.equal(await thumbnail.text(), "webp");
    await assert.rejects(
      () => attachmentResponse(db, "outsider", upload.id, storage, "chat-420"),
      /access/,
    );
    assert.equal(imageFetches, 1); // Authorization must precede contacting Byteship.

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
    const originalFetch = globalThis.fetch;
    let imageFetches = 0;
    globalThis.fetch = async (input) => {
      imageFetches++;
      assert.match(new URL(String(input)).searchParams.get("tr") ?? "", /w:80/);
      return new Response("webp", {
        headers: { "content-type": "image/webp" },
      });
    };
    const avatar = await avatarResponse(db, upload.id, storage, "avatar-80");
    assert.equal(avatar.headers.get("content-type"), "image/webp");
    assert.equal(avatar.headers.get("content-length"), null);
    assert.equal(await avatar.text(), "webp");
    await assert.rejects(
      () => avatarResponse(db, crypto.randomUUID(), storage, "avatar-80"),
      /not found/,
    );
    assert.equal(imageFetches, 1);
    globalThis.fetch = originalFetch;
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
  const received: { type: string; id?: string; newMessage?: boolean }[] = [];
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
    assert.equal(
      received.find((e) => e.type === "message" && e.id === input.id)
        ?.newMessage,
      true,
    );
    await send(db, "owner", input);
    assert.equal(received.filter((e) => e.id === input.id).length, 1);
  } finally {
    await unlisten();
  }
});

test("reaction writes use one query, are idempotent, publish live updates and enforce access and quota", async () => {
  const { setReaction } = await import("../src/server/reactions");
  const room = await community();
  await action("member", { type: "community.join", id: room });
  const id = crypto.randomUUID();
  await action("owner", {
    type: "message.send",
    id,
    conversation: `${room}:general`,
    text: "React here",
    attachments: [],
  });
  let calls = 0;
  const measured = {
    execute: (query: Parameters<Database["execute"]>[0]) => {
      calls++;
      return db.execute(query);
    },
  } as Database;
  const input = { id, emoji: "👍", active: true };
  const events: string[] = [];
  const unlisten = await engine.listen("drocsid_live", (payload) =>
    events.push(payload),
  );
  try {
    assert.deepEqual(await setReaction(measured, "member", input), {
      ...input,
      count: 1,
    });
    assert.equal(calls, 1);
    assert.ok(events.some((event) => JSON.parse(event).id === id));
    const eventCount = events.length;
    assert.equal((await setReaction(db, "member", input)).count, 1);
    assert.equal(
      events.length,
      eventCount,
      "An idempotent retry does not publish a second change",
    );
    assert.equal((await setReaction(db, "owner", input)).count, 2);
    assert.equal(
      (await setReaction(db, "member", { ...input, active: false })).count,
      1,
    );
    assert.equal(
      (await setReaction(db, "member", { ...input, active: false })).count,
      1,
    );
    await assert.rejects(
      () => setReaction(db, "outsider", input),
      /unavailable/,
    );
    const secret = crypto.randomUUID();
    await action("owner", {
      type: "message.send",
      id: secret,
      conversation: `${room}:private`,
      text: "Private",
      attachments: [],
    });
    await assert.rejects(
      () => setReaction(db, "member", { ...input, id: secret }),
      /unavailable/,
    );
    await db
      .insert(schema.limits)
      .values({ key: "actions:member", count: 120 })
      .onConflictDoUpdate({
        target: schema.limits.key,
        set: { count: 120, windowStart: new Date() },
      });
    await assert.rejects(() => setReaction(db, "member", input), /too fast/);
    assert.equal(
      (
        await db
          .select()
          .from(schema.reactions)
          .where(
            and(
              eq(schema.reactions.messageId, id),
              eq(schema.reactions.userId, "member"),
            ),
          )
      ).length,
      0,
    );
    await db
      .delete(schema.limits)
      .where(eq(schema.limits.key, "actions:member"));
    await action("owner", { type: "message.delete", id });
    await assert.rejects(() => setReaction(db, "member", input), /unavailable/);
    await assert.rejects(
      () => setReaction(db, "member", { ...input, id: crypto.randomUUID() }),
      /unavailable/,
    );
    const dm = await send(db, "owner", {
      type: "message.send",
      id: crypto.randomUUID(),
      conversation: "dm:outsider",
      text: "DM reactions",
      attachments: [],
    });
    await action("outsider", {
      type: "friend",
      id: "owner",
      operation: "block",
    });
    for (const userId of ["owner", "outsider"])
      await assert.rejects(
        () => setReaction(db, userId, { ...input, id: dm.message!.id }),
        /unavailable/,
      );
    await action("outsider", {
      type: "friend",
      id: "owner",
      operation: "unblock",
    });
  } finally {
    await unlisten();
  }
});

test("channel writes commit in one query, preserve permissions and notify only community members", async () => {
  const { putChannel } = await import("../src/server/channels");
  const room = await community();
  await action("member", { type: "community.join", id: room });
  let calls = 0;
  const measured = {
    execute: (query: Parameters<Database["execute"]>[0]) => {
      calls++;
      return db.execute(query);
    },
  } as Database;
  const input = {
    type: "channel.put" as const,
    communityId: room,
    channel: {
      id: "fast-channel",
      name: "fast-channel",
      description: "New topic",
      group: "NEW CATEGORY",
      private: false,
    },
  };
  const events: { type: string; userId?: string }[] = [];
  const unlisten = await engine.listen("drocsid_live", (payload) =>
    events.push(JSON.parse(payload)),
  );
  try {
    const result = await putChannel(measured, "owner", input);
    assert.equal(calls, 1);
    assert.deepEqual(result, {
      communityId: room,
      channel: { ...input.channel, icon: "", hasMessages: false },
    });
    assert.deepEqual(
      events
        .filter((e) => e.type === "invalidate")
        .map((e) => e.userId)
        .sort(),
      ["member", "owner"],
    );
    assert.ok(
      !events.some((e) => e.type === "access"),
      "Creating a channel must not disconnect every socket",
    );
    assert.ok(
      (await snapshot(db, viewers[1])).communities
        .find((c) => c.id === room)
        ?.channels.some((c) => c.id === input.channel.id),
    );
    events.length = 0;
    await putChannel(db, "owner", input);
    assert.equal(
      events.length,
      0,
      "Retrying the same channel must not invalidate or disconnect clients",
    );
    const uncategorized = await putChannel(db, "owner", {
      ...input,
      channel: {
        ...input.channel,
        id: "uncategorized",
        name: "uncategorized",
        group: "",
      },
    });
    assert.equal(uncategorized.channel.group, "");
    const [storedUncategorized] = await db
      .select({ categoryId: schema.conversations.categoryId })
      .from(schema.conversations)
      .where(eq(schema.conversations.id, `${room}:uncategorized`));
    assert.equal(storedUncategorized.categoryId, null);
    events.length = 0;
    for (const userId of ["member", "outsider"])
      await assert.rejects(
        () =>
          putChannel(db, userId, {
            ...input,
            channel: {
              ...input.channel,
              id: `denied-${userId}`,
              name: `denied-${userId}`,
              group: "DENIED CATEGORY",
            },
          }),
        /owners and admins/,
      );
    assert.equal(
      (
        await db
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.communityId, room),
              eq(schema.categories.name, "DENIED CATEGORY"),
            ),
          )
      ).length,
      0,
    );
    const edited = await putChannel(db, "owner", {
      ...input,
      channel: {
        ...input.channel,
        description: "Updated",
        private: true,
        group: "MOVED",
      },
    });
    assert.equal(edited.channel.private, true);
    assert.equal(edited.channel.group, "MOVED");
    await assert.rejects(
      () => requireConversation(db, "member", `${room}:${input.channel.id}`),
      /access/,
    );
    await action("owner", {
      type: "member.role",
      communityId: room,
      userId: "member",
      role: "Admin",
    });
    await putChannel(db, "member", {
      ...input,
      channel: { ...input.channel, id: "admin-channel", name: "admin-channel" },
    });
    await assert.rejects(() =>
      putChannel(db, "owner", {
        ...input,
        channel: {
          ...input.channel,
          id: "duplicate",
          group: "SHOULD ROLL BACK",
        },
      }),
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.communityId, room),
              eq(schema.categories.name, "SHOULD ROLL BACK"),
            ),
          )
      ).length,
      0,
    );
    await action("owner", {
      type: "channel.delete",
      communityId: room,
      id: input.channel.id,
    });
    await assert.rejects(
      () =>
        putChannel(db, "owner", {
          ...input,
          channel: { ...input.channel, group: "NO RESURRECTION" },
        }),
      /no longer available/,
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.communityId, room),
              eq(schema.categories.name, "NO RESURRECTION"),
            ),
          )
      ).length,
      0,
    );
    await db
      .insert(schema.limits)
      .values({ key: "actions:owner", count: 120 })
      .onConflictDoUpdate({
        target: schema.limits.key,
        set: { count: 120, windowStart: new Date() },
      });
    await assert.rejects(
      () =>
        putChannel(db, "owner", {
          ...input,
          channel: {
            ...input.channel,
            id: "limited",
            name: "limited",
            group: "QUOTA CATEGORY",
          },
        }),
      /too fast/,
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.communityId, room),
              eq(schema.categories.name, "QUOTA CATEGORY"),
            ),
          )
      ).length,
      0,
    );
  } finally {
    await db
      .delete(schema.limits)
      .where(eq(schema.limits.key, "actions:owner"));
    await unlisten();
  }
});

test("channel icons persist through creation and edits; a first message permanently dismisses setup", async () => {
  const { putChannel } = await import("../src/server/channels");
  const room = await community();
  const channel = {
    id: "icon-room",
    name: "icon-room",
    group: "CHAT",
    description: "",
    icon: "🌻",
  };
  const created = await putChannel(db, "owner", {
    type: "channel.put",
    communityId: room,
    channel,
  });
  assert.equal(created.channel.icon, "🌻");
  assert.equal(created.channel.hasMessages, false);
  const read = async () =>
    (await snapshot(db, viewers[0], 0)).communities
      .find((c) => c.id === room)!
      .channels.find((c) => c.id === channel.id)!;
  assert.equal((await read()).icon, "🌻");
  await putChannel(db, "owner", {
    type: "channel.put",
    communityId: room,
    channel: { ...channel, icon: "👩🏽‍💻" },
  });
  assert.equal((await read()).icon, "👩🏽‍💻");
  for (const icon of ["🌻", "👩🏽‍💻", "🇳🇬", "1️⃣", ""])
    assert.ok(
      actionSchema.safeParse({
        type: "channel.put",
        communityId: room,
        channel: { ...channel, icon },
      }).success,
    );
  assert.equal(
    actionSchema.safeParse({
      type: "channel.put",
      communityId: room,
      channel: { ...channel, icon: "https://example.com" },
    }).success,
    false,
  );
  const id = crypto.randomUUID();
  await send(db, "owner", {
    type: "message.send",
    id,
    conversation: `${room}:${channel.id}`,
    text: "Hello",
    attachments: [],
  });
  assert.equal((await read()).hasMessages, true);
  await action("owner", { type: "message.delete", id });
  assert.equal(
    (await read()).hasMessages,
    true,
    "Deleting the first message must not bring setup back",
  );
  await putChannel(db, "owner", {
    type: "channel.put",
    communityId: room,
    channel: { ...channel, icon: "" },
  });
  assert.equal((await read()).icon, "");
});

test("Byteship community icons bind on successful creation, enforce manager access, replace and remove", async () => {
  const {
    prepareCommunityIcon,
    completeCommunityIcon,
    discardCommunityIcon,
    removeCommunityIcon,
    communityIconResponse,
  } = await import("../src/server/community-icons");
  const { directory } = await import("../src/server/directory");
  let content = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const storage = {
    async createFileUpload(path: string, input: { visibility: string }) {
      assert.ok(path.startsWith("community-icons/"));
      assert.equal(input.visibility, "private");
      return {
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
      return { signedUrl: { url: "https://storage.example.test/icon" } };
    },
  } as unknown as Parameters<typeof prepareCommunityIcon>[3];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(content);
  try {
    const image = { contentType: "image/png" as const, byteSize: 8 };
    const draft = await prepareCommunityIcon(db, "owner", image, storage);
    await assert.rejects(
      () => completeCommunityIcon(db, "member", draft.id, storage),
      /not found/,
    );
    await assert.rejects(
      () => communityIconResponse(db, draft.id, storage),
      /not found/,
    );
    await completeCommunityIcon(db, "owner", draft.id, storage);
    await assert.rejects(
      () => communityIconResponse(db, draft.id, storage),
      /not found/,
      "A ready unbound icon is never publicly served",
    );
    const id = crypto.randomUUID();
    const create = {
      type: "community.create",
      id,
      iconUploadId: draft.id,
      community: {
        name: "Image community",
        description: "",
        icon: "",
        color: "purple",
        category: "Tests",
      },
      channels: [
        { id: "general", name: "general", description: "", group: "CHAT" },
      ],
    };
    await assert.rejects(() => action("member", create), /unavailable/);
    assert.equal(
      (
        await db
          .select()
          .from(schema.communities)
          .where(eq(schema.communities.id, id))
      ).length,
      0,
      "Unauthorized icon binding rolls back the whole creation",
    );
    await action("owner", create);
    const url = `/api/community-icons/${draft.id}`;
    const read = async () =>
      (await snapshot(db, viewers[0], 0)).communities.find((c) => c.id === id)!;
    assert.equal((await read()).iconUrl, url);
    assert.equal(
      (
        await directory(db, "outsider", {
          kind: "communities",
          query: "",
          id,
          offset: 0,
        })
      ).communities?.[0].iconUrl,
      url,
    );
    await discardCommunityIcon(db, "owner", draft.id);
    const response = await communityIconResponse(db, draft.id, storage);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal((await response.arrayBuffer()).byteLength, 8);
    const conditional = new Request(`http://localhost${url}`, {
      headers: { "If-None-Match": response.headers.get("etag")! },
    });
    assert.equal(
      (
        await communityIconResponse(
          db,
          draft.id,
          storage,
          undefined,
          conditional,
        )
      ).status,
      304,
    );
    await assert.rejects(
      () =>
        prepareCommunityIcon(
          db,
          "member",
          { ...image, communityId: id },
          storage,
        ),
      /owners and admins/,
    );
    await assert.rejects(
      () => removeCommunityIcon(db, "outsider", id),
      /owners and admins/,
    );
    const replacement = await prepareCommunityIcon(
      db,
      "owner",
      { ...image, communityId: id },
      storage,
    );
    await completeCommunityIcon(db, "owner", replacement.id, storage);
    assert.equal(
      (await read()).iconUrl,
      `/api/community-icons/${replacement.id}`,
    );
    await assert.rejects(
      () =>
        communityIconResponse(db, draft.id, storage, undefined, conditional),
      /not found/,
      "Removed icons cannot return 304",
    );
    await removeCommunityIcon(db, "owner", id);
    assert.equal((await read()).iconUrl, undefined);
    await assert.rejects(
      () => communityIconResponse(db, replacement.id, storage),
      /not found/,
    );
    const invalid = await prepareCommunityIcon(db, "owner", image, storage);
    content = new TextEncoder().encode("notimage");
    await assert.rejects(
      () => completeCommunityIcon(db, "owner", invalid.id, storage),
      /Choose a PNG/,
    );
    await discardCommunityIcon(db, "owner", invalid.id);
    await assert.rejects(
      () => completeCommunityIcon(db, "owner", invalid.id, storage),
      /not found/,
    );
    const pending = await prepareCommunityIcon(
      db,
      "owner",
      { ...image, communityId: id },
      storage,
    );
    await db
      .update(schema.members)
      .set({ role: "Member" })
      .where(
        and(
          eq(schema.members.communityId, id),
          eq(schema.members.userId, "owner"),
        ),
      );
    await assert.rejects(
      () => completeCommunityIcon(db, "owner", pending.id, storage),
      /owners and admins/,
      "Permissions are checked again on completion",
    );
    await assert.rejects(() =>
      prepareCommunityIcon(
        db,
        "owner",
        { ...image, byteSize: 6 * 1024 * 1024 },
        storage,
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("welcome usernames check global availability and profile saves enforce uniqueness atomically", async () => {
  const { usernameAvailability } = await import("../src/server/usernames");
  const a = crypto.randomUUID(),
    b = crypto.randomUUID();
  for (const id of [a, b]) {
    await db
      .insert(schema.user)
      .values({
        id,
        name: "",
        email: `${id}@example.test`,
        emailVerified: true,
      });
    await ensureProfile(db, { id, name: "" });
  }
  const profile = {
    type: "profile",
    name: "New friend",
    handle: "welcome_friend",
    color: "peach",
    bio: "",
    activity: "",
    status: "online",
  };
  assert.equal(
    (await usernameAvailability(db, a, "welcome_friend")).available,
    true,
  );
  await action(a, profile);
  assert.equal(
    (await usernameAvailability(db, a, "welcome_friend")).available,
    true,
  );
  assert.equal(
    (await usernameAvailability(db, b, "welcome_friend")).available,
    false,
  );
  await assert.rejects(() => action(b, profile));
  const [other] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, b));
  assert.equal(other.name, "");
  for (const handle of ["admin", "everyone", "you", "A BAD NAME", "ab"]) {
    await assert.rejects(() => usernameAvailability(db, a, handle));
    assert.equal(actionSchema.safeParse({ ...profile, handle }).success, false);
  }
  const saved = await snapshot(db, { id: a, name: "New friend" });
  assert.equal(saved.profile.handle, "welcome_friend");
  assert.equal(saved.profile.name, "New friend");
  assert.equal(saved.onboardingComplete, false);
});
