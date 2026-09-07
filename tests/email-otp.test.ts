import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { makeAuth } from "../src/server/auth";
import { sendAuthEmail, type AuthEmail } from "../src/server/email";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const sent: AuthEmail[] = [];
process.env.BETTER_AUTH_SECRET = "isolated-email-test-" + "a".repeat(40);
process.env.BETTER_AUTH_URL = "http://localhost:1515";
const auth = makeAuth(db, async (message) => {
  sent.push(message);
});
let ip = 1;
function request(path: string, body: unknown, cookie?: string) {
  return auth.handler(
    new Request(`http://localhost:1515/api/auth/${path}`, {
      method: "POST",
      headers: {
        origin: "http://localhost:1515",
        "content-type": "application/json",
        "x-forwarded-for": `192.0.2.${ip++}`,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
async function signup(email: string) {
  const response = await request("email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response;
}
function code(email: string, type = "sign-in") {
  return sent.findLast(
    (message) => message.email === email && message.type === type,
  )!.otp;
}
async function clearSendLimit() {
  await db.delete(schema.limits);
}
before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
});
after(async () => {
  await engine.close();
});

test("signup has no session until the hashed six-digit verification code is redeemed once", async () => {
  const email = "verify@example.test";
  const response = await signup(email);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(
    (await db.select().from(schema.user).where(eq(schema.user.email, email)))
      .length,
    0,
  );
  assert.match(code(email), /^\d{6}$/);
  const rows = await db.select().from(schema.verification);
  const stored = rows.find((row) => row.identifier.includes(email))!;
  assert.ok(stored);
  assert.notEqual(stored.value.split(":")[0], code(email));
  assert.ok(stored.expiresAt.getTime() - Date.now() <= 300_000);
  const verified = await request("sign-in/email-otp", {
    email,
    otp: code(email),
  });
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  assert.equal(session?.user.emailVerified, true);
  assert.notEqual(
    (await request("sign-in/email-otp", { email, otp: code(email) })).status,
    200,
  );
});

test("expired and repeatedly incorrect codes cannot verify an account", async () => {
  const email = "expired@example.test";
  await signup(email);
  await db.update(schema.verification).set({ expiresAt: new Date(0) });
  assert.notEqual(
    (await request("sign-in/email-otp", { email, otp: code(email) })).status,
    200,
  );
  const limited = "attempts@example.test";
  await signup(limited);
  const wrong = code(limited) === "000000" ? "111111" : "000000";
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.notEqual(
      (await request("sign-in/email-otp", { email: limited, otp: wrong }))
        .status,
      200,
    );
  }
  const locked = await request("sign-in/email-otp", {
    email: limited,
    otp: code(limited),
  });
  assert.equal(locked.status, 403);
  assert.equal((await locked.json()).code, "TOO_MANY_ATTEMPTS");
});

test("resend budget is enforced, and replacing a code invalidates the old one", async () => {
  const email = "resend@example.test";
  await signup(email);
  const first = code(email);
  const blocked = await request("email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
  assert.equal(blocked.status, 429);
  await clearSendLimit();
  const resent = await request("email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
  assert.equal(resent.status, 200);
  const latest = code(email);
  // A random repeat is valid; otherwise the previous generation must fail.
  if (first !== latest)
    assert.notEqual(
      (await request("sign-in/email-otp", { email, otp: first })).status,
      200,
    );
  assert.equal(
    (await request("sign-in/email-otp", { email, otp: latest })).status,
    200,
  );
});

test("all password login, registration, change, and reset endpoints are disabled even for legacy accounts", async () => {
  const { hashPassword } = await import("better-auth/crypto");
  const userId = crypto.randomUUID();
  const email = "legacy@example.test";
  const password = "Legacy-password-123!";
  await db
    .insert(schema.user)
    .values({ id: userId, email, name: "Legacy", emailVerified: true });
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: await hashPassword(password),
  });
  for (const path of [
    "sign-in/email",
    "sign-up/email",
    "change-password",
    "set-password",
    "request-password-reset",
    "reset-password",
    "email-otp/request-password-reset",
    "forget-password/email-otp",
    "email-otp/reset-password",
  ]) {
    const response = await request(path, {
      email,
      password,
      name: "Legacy",
      newPassword: password,
      currentPassword: password,
      otp: "123456",
      token: "old-token",
    });
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  await signup(email);
  const signedIn = await request("sign-in/email-otp", {
    email,
    otp: code(email),
    name: "Should not rename",
  });
  assert.equal(signedIn.status, 200);
  const data = await signedIn.json();
  assert.equal(data.user.id, userId);
  assert.equal(data.user.name, "Legacy");
});

test("new accounts are created only after code verification, with a profile and no password", async () => {
  const email = "new@example.test";
  await signup(email);
  assert.equal(
    (await db.select().from(schema.user).where(eq(schema.user.email, email)))
      .length,
    0,
  );
  const response = await request("sign-in/email-otp", {
    email,
    otp: code(email),
  });
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.emailVerified, true);
  assert.equal(user.name, "");
  assert.equal(
    (
      await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, user.id))
    ).length,
    1,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.account)
        .where(eq(schema.account.userId, user.id))
    ).length,
    0,
  );
});

test("missing Sendbyte config fails before signup persists an account", async () => {
  delete process.env.SENDBYTE_API_KEY;
  delete process.env.SENDBYTE_FROM;
  const unconfigured = makeAuth(db);
  const result = await unconfigured.handler(
    new Request(
      "http://localhost:1515/api/auth/email-otp/send-verification-otp",
      {
        method: "POST",
        headers: {
          origin: "http://localhost:1515",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "unconfigured@example.test",
          name: "Test",
          type: "sign-in",
        }),
      },
    ),
  );
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, "EMAIL_UNAVAILABLE");
  assert.equal(
    (
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, "unconfigured@example.test"))
    ).length,
    0,
  );
});

test("Sendbyte uses the configured sender, safe templates, and one idempotency key across retries", async () => {
  process.env.SENDBYTE_API_KEY = "sk_test_ignored_in_mock";
  process.env.SENDBYTE_FROM = "Drocsid <hello@example.test>";
  const calls: { url: unknown; init: RequestInit | undefined }[] = [];
  const mocked = mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return calls.length === 1
      ? Response.json(
          {
            error: {
              code: "internal_error",
              message: "private provider details",
            },
          },
          { status: 500 },
        )
      : Response.json({ id: "em_mock" }, { status: 201 });
  });
  try {
    await sendAuthEmail({
      email: "recipient@example.test",
      otp: "123456",
      type: "sign-in",
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://api.sendbyte.africa/v1/emails");
    assert.equal(calls[0].init!.body, calls[1].init!.body);
    const payload = JSON.parse(calls[0].init!.body as string);
    assert.equal(payload.from, process.env.SENDBYTE_FROM);
    assert.equal(payload.to, "recipient@example.test");
    assert.ok(payload.html.includes("123456"));
    assert.ok(payload.text.includes("5 minutes"));
    assert.ok(!payload.subject.includes("123456"));
    assert.ok(!payload.idempotency_key.includes("123456"));
  } finally {
    mocked.mock.restore();
  }
  const failed = mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          code: "domain_not_verified",
          message: "private provider details",
        },
      },
      { status: 422 },
    ),
  );
  try {
    await assert.rejects(
      () =>
        sendAuthEmail({
          email: "recipient@example.test",
          otp: "123456",
          type: "sign-in",
        }),
      (error: any) => {
        assert.equal(error.status, "SERVICE_UNAVAILABLE");
        assert.equal(error.body.code, "EMAIL_DELIVERY_FAILED");
        assert.ok(!error.body.message.includes("private"));
        return true;
      },
    );
  } finally {
    failed.mock.restore();
    delete process.env.SENDBYTE_API_KEY;
    delete process.env.SENDBYTE_FROM;
  }
});
