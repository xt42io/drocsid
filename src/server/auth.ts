import { ensureProfile, takeLimit } from "./access";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins/email-otp";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { createHmac } from "node:crypto";
import {
  requireEmailConfiguration,
  sendAuthEmail,
  type SendAuthEmail,
} from "./email";
import { getDb, type Database } from "./db";
import * as schema from "./db/schema";

export function makeAuth(
  db: Database,
  deliverEmail: SendAuthEmail = sendAuthEmail,
) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "Set BETTER_AUTH_SECRET to a random value of at least 32 characters.",
    );
  return betterAuth({
    secret,
    advanced: { database: { joins: true } },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:1515",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
        storeOTP: "hashed",
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
        rateLimit: { window: 60, max: 5 },
        sendVerificationOTP: deliverEmail,
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const sending = [
          "/sign-up/email",
          "/email-otp/send-verification-otp",
          "/email-otp/request-password-reset",
          "/forget-password/email-otp",
          "/send-verification-email",
        ].includes(ctx.path);
        if (!sending) return;
        if (deliverEmail === sendAuthEmail) requireEmailConfiguration();
        const email =
          typeof ctx.body?.email === "string"
            ? ctx.body.email.trim().toLowerCase()
            : "";
        if (!email) return;
        // Shared across processes and purposes, so switching endpoints cannot bypass resend limits.
        const key = createHmac("sha256", secret).update(email).digest("hex");
        try {
          await takeLimit(db, key, "auth-email", 1);
        } catch (error) {
          if ((error as { status?: number }).status !== 429) throw error;
          throw new APIError("TOO_MANY_REQUESTS", {
            code: "EMAIL_RATE_LIMITED",
            message: "Please wait a minute before requesting another code.",
          });
        }
      }),
    },
    socialProviders:
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {},
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await ensureProfile(db, user);
          },
        },
      },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  });
}
let instance: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (instance ??= makeAuth(getDb()));
}
