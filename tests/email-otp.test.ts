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
const password = "Original-password-123!";
async function signup(email: string) {
  const response = await request("sign-up/email", {
    email,
    name: "OTP tester",
    password,
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response;
}
function code(email: string, type = "email-verification") {
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
  assert.equal((await response.json()).token, null);
  assert.match(code(email), /^\d{6}$/);
  const rows = await db.select().from(schema.verification);
  const stored = rows.find((row) => row.identifier.includes(email))!;
  assert.ok(stored);
  assert.notEqual(stored.value.split(":")[0], code(email));
  assert.ok(stored.expiresAt.getTime() - Date.now() <= 300_000);
  const denied = await request("sign-in/email", { email, password });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, "EMAIL_NOT_VERIFIED");
  const verified = await request("email-otp/verify-email", {
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
    (await request("email-otp/verify-email", { email, otp: code(email) }))
      .status,
    200,
  );
});

test("expired and repeatedly incorrect codes cannot verify an account", async () => {
  const email = "expired@example.test";
  await signup(email);
  await db.update(schema.verification).set({ expiresAt: new Date(0) });
  assert.notEqual(
    (await request("email-otp/verify-email", { email, otp: code(email) }))
      .status,
    200,
  );
  const limited = "attempts@example.test";
  await signup(limited);
  const wrong = code(limited) === "000000" ? "111111" : "000000";
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.notEqual(
      (await request("email-otp/verify-email", { email: limited, otp: wrong }))
        .status,
      200,
    );
  }
  const locked = await request("email-otp/verify-email", {
    email: limited,
    otp: code(limited),
  });
  assert.equal(locked.status, 403);
  assert.equal((await locked.json()).code, "TOO_MANY_ATTEMPTS");
});

test("resend budget is shared across endpoints, and replacing a code invalidates the old one", async () => {
  const email = "resend@example.test";
  await signup(email);
  const first = code(email);
  const blocked = await request("email-otp/request-password-reset", { email });
  assert.equal(blocked.status, 429);
  await clearSendLimit();
  const resent = await request("email-otp/send-verification-otp", {
    email,
    type: "email-verification",
  });
  assert.equal(resent.status, 200);
  const latest = code(email);
  // A random repeat is valid; otherwise the previous generation must fail.
  if (first !== latest)
    assert.notEqual(
      (await request("email-otp/verify-email", { email, otp: first })).status,
      200,
    );
  assert.equal(
    (await request("email-otp/verify-email", { email, otp: latest })).status,
    200,
  );
});

test("password reset uses its own code, changes the password and revokes existing sessions", async () => {
  const email = "reset@example.test";
  await signup(email);
  const verifyCode = code(email);
  const verified = await request("email-otp/verify-email", {
    email,
    otp: verifyCode,
  });
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  await clearSendLimit();
  assert.equal(
    (await request("email-otp/request-password-reset", { email })).status,
    200,
  );
  const newPassword = "Changed-password-456!";
  assert.notEqual(
    (
      await request("email-otp/reset-password", {
        email,
        otp: verifyCode,
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("email-otp/reset-password", {
        email,
        otp: code(email, "forget-password"),
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    await auth.api.getSession({ headers: new Headers({ cookie }) }),
    null,
  );
  assert.equal(
    (await request("sign-in/email", { email, password })).status,
    401,
  );
  assert.equal(
    (await request("sign-in/email", { email, password: newPassword })).status,
    200,
  );
  assert.notEqual(
    (
      await request("email-otp/reset-password", {
        email,
        otp: code(email, "forget-password"),
        password: newPassword,
      })
    ).status,
    200,
  );
});

test("sign-in codes support existing users without registering unknown addresses", async () => {
  const email = "passwordless@example.test";
  await signup(email);
  await clearSendLimit();
  await request("email-otp/send-verification-otp", { email, type: "sign-in" });
  const signedIn = await request("sign-in/email-otp", {
    email,
    otp: code(email, "sign-in"),
  });
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).user.emailVerified, true);
  const before = sent.length;
  const unknown = "unknown@example.test";
  assert.equal(
    (await request("email-otp/request-password-reset", { email: unknown }))
      .status,
    200,
  );
  await clearSendLimit();
  assert.equal(
    (
      await request("email-otp/send-verification-otp", {
        email: unknown,
        type: "sign-in",
      })
    ).status,
    200,
  );
  assert.equal(sent.length, before);
  assert.equal(
    (await db.select().from(schema.user).where(eq(schema.user.email, unknown)))
      .length,
    0,
  );
});

test("missing Sendbyte config fails before signup persists an account", async () => {
  delete process.env.SENDBYTE_API_KEY;
  delete process.env.SENDBYTE_FROM;
  const unconfigured = makeAuth(db);
  const result = await unconfigured.handler(
    new Request("http://localhost:1515/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        origin: "http://localhost:1515",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "unconfigured@example.test",
        name: "Test",
        password,
      }),
    }),
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
      type: "email-verification",
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
