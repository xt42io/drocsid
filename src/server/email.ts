import { SendByte } from "@sendbyte/node";
import { randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";

export type AuthEmail = {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
};
export type SendAuthEmail = (message: AuthEmail) => Promise<void>;

export function emailConfigured() {
  return !!(
    process.env.SENDBYTE_API_KEY?.trim() && process.env.SENDBYTE_FROM?.trim()
  );
}

export function requireEmailConfiguration() {
  if (!emailConfigured())
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_UNAVAILABLE",
      message: "Email delivery is not configured on this server yet.",
    });
}

export function authEmailContent({ otp, type }: AuthEmail) {
  if (!/^\d{6}$/.test(otp))
    throw new Error("Invalid authentication code format");
  const title =
    type === "forget-password"
      ? "Reset your password"
      : type === "sign-in"
        ? "Your sign-in code"
        : "Verify your email";
  const explanation =
    type === "forget-password"
      ? "Enter this code in Drocsid to choose a new password."
      : type === "sign-in"
        ? "Enter this code in Drocsid to sign in."
        : "Enter this code in Drocsid to confirm your email address.";
  return {
    subject: `${title} — Drocsid`,
    text: `${title}\n\n${explanation}\n\n${otp}\n\nThis code expires in 5 minutes and can only be used once. Never share it. If you did not request it, you can ignore this email.`,
    html: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:32px 16px;background:#171717;font-family:Arial,sans-serif;color:#f5f5f5"><table role="presentation" style="max-width:480px;width:100%;margin:auto;border:1px solid #353535;border-radius:20px;background:#202020"><tr><td style="padding:36px"><div style="font-size:25px;font-weight:700">drocsid<span style="color:#ff643e">.</span></div><h1 style="font-size:26px;margin:32px 0 16px">${title}</h1><p style="color:#bdbdbd;line-height:1.6">${explanation}</p><div style="margin:28px 0;padding:22px 12px;border-radius:12px;background:#2b2b2b;text-align:center;font-size:36px;font-family:monospace;letter-spacing:8px;color:#ff8b69">${otp}</div><p style="color:#bdbdbd;font-size:14px;line-height:1.6">This code expires in <strong>5 minutes</strong> and can only be used once. Never share it.</p><p style="margin-top:28px;color:#999;font-size:12px;line-height:1.6">If you did not request this code, you can ignore this email.</p></td></tr></table></body></html>`,
  };
}

// One key per issued email; network retries reuse it without exposing the OTP.
export const sendAuthEmail: SendAuthEmail = async (message) => {
  requireEmailConfiguration();
  try {
    const client = new SendByte(process.env.SENDBYTE_API_KEY!.trim(), {
      timeoutMs: 8000,
      maxAttempts: 2,
    });
    const result = await client.emails.send({
      from: process.env.SENDBYTE_FROM!.trim(),
      to: message.email,
      ...authEmailContent(message),
      idempotency_key: `auth-${randomUUID()}`,
    });
    if (!result.id) throw new Error("Missing email acknowledgement");
  } catch {
    // Provider errors may contain recipients or message content; never expose them.
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_FAILED",
      message:
        "We couldn’t send your code. Please wait a minute and try again.",
    });
  }
};
