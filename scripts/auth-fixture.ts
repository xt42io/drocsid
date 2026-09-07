// Disposable integration fixtures verify through the real OTP flow with in-memory delivery.
// This helper is used only by opt-in smoke/benchmark scripts, never by application routes.
import assert from "node:assert/strict";
import { makeAuth } from "../src/server/auth";
import { getDb } from "../src/server/db";

export async function createAuthFixture(email: string, name: string) {
  assert.ok(
    email.endsWith("@example.test"),
    "Fixtures must use example.test addresses",
  );
  let code = "";
  const auth = makeAuth(getDb(), async ({ otp }) => {
    code = otp;
  });
  const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
  const request = (path: string, body: unknown) =>
    new Request(`${base}/api/auth/${path}`, {
      method: "POST",
      headers: {
        origin: new URL(base).origin,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const signup = await auth.handler(
    request("sign-up/email", { email, name, password: crypto.randomUUID() }),
  );
  assert.equal(signup.status, 200);
  const { user } = await signup.json();
  assert.match(code, /^\d{6}$/);
  const verified = await auth.handler(
    request("email-otp/verify-email", { email, otp: code }),
  );
  assert.equal(verified.status, 200);
  return { user, cookie: verified.headers.get("set-cookie")!.split(";")[0] };
}
