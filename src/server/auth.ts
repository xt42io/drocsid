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

// Discord first, then GitHub, to match the order of the sign-in buttons.
const SOCIAL_PROVIDERS = ["discord", "github"] as const;
export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number];

const providerEnvKeys: Record<SocialProviderId, { id: string; secret: string }> =
  {
    discord: { id: "DISCORD_CLIENT_ID", secret: "DISCORD_CLIENT_SECRET" },
    github: { id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET" },
  };

// A provider only works when both its client id and secret are set. The client
// reads this list so it never shows a button the server cannot serve.
export function configuredSocialProviders(): SocialProviderId[] {
  return SOCIAL_PROVIDERS.filter((provider) => {
    const keys = providerEnvKeys[provider];
    return Boolean(process.env[keys.id] && process.env[keys.secret]);
  });
}

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
    // Store the OAuth state in one encrypted 10-minute cookie. The database
    // strategy also pins a signed cookie to just 5 minutes, and the callback
    // rejects the flow as a state mismatch once that shorter cookie is gone.
    account: { storeStateStrategy: "cookie" },
    socialProviders: Object.fromEntries(
      configuredSocialProviders().map((provider) => {
        const keys = providerEnvKeys[provider];
        return [
          provider,
          {
            clientId: process.env[keys.id]!,
            clientSecret: process.env[keys.secret]!,
          },
        ];
      }),
    ),
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
