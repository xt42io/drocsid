import { ensureProfile, takeLimit } from "./access.ts";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins/email-otp";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { createHmac } from "node:crypto";
import {
  requireEmailConfiguration,
  sendAuthEmail,
  type SendAuthEmail,
} from "./email.ts";
import { getDb, type Database } from "./db/index.ts";
import * as schema from "./db/schema.ts";

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
    emailAndPassword: { enabled: false },
    disabledPaths: [
      "/sign-in/email",
      "/sign-up/email",
      "/change-password",
      "/set-password",
      "/request-password-reset",
      "/reset-password",
      "/email-otp/request-password-reset",
      "/forget-password/email-otp",
      "/email-otp/reset-password",
    ],
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
        storeOTP: "hashed",
        disableSignUp: false,
        rateLimit: { window: 60, max: 5 },
        sendVerificationOTP: deliverEmail,
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path.includes("password") ||
          ctx.path === "/sign-in/email" ||
          ctx.path === "/sign-up/email"
        )
          throw new APIError("FORBIDDEN", {
            code: "PASSWORD_AUTH_DISABLED",
            message: "Use an email code to sign in.",
          });
        const sending = ctx.path === "/email-otp/send-verification-otp";
        if (sending && ctx.body?.type !== "sign-in")
          throw new APIError("BAD_REQUEST", { message: "Use a sign-in code." });
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
    socialProviders: {
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
      ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
        ? {
            discord: {
              clientId: process.env.DISCORD_CLIENT_ID,
              clientSecret: process.env.DISCORD_CLIENT_SECRET,
            },
          }
        : {}),
    },
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
