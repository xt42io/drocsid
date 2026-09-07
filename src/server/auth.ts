import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import nodemailer from "nodemailer";
import { getDb, type Database } from "./db";
import * as schema from "./db/schema";

export function makeAuth(db: Database) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "Set BETTER_AUTH_SECRET to a random value of at least 32 characters.",
    );
  const emailEnabled = !!(process.env.SMTP_URL && process.env.SMTP_FROM);
  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:1515",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      ...(emailEnabled
        ? {
            sendResetPassword: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await nodemailer.createTransport(process.env.SMTP_URL!).sendMail({
                from: process.env.SMTP_FROM,
                to: user.email,
                subject: "Reset your Drocsid password",
                text: `Use this link to reset your password: ${url}\n\nIf you did not request this, you can ignore this email.`,
              });
            },
          }
        : {}),
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
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  });
}
let instance: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (instance ??= makeAuth(getDb()));
}
