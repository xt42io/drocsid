import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

export type EmailCodePurpose =
  "email-verification" | "sign-in" | "forget-password";

export async function requestEmailCode(
  email: string,
  purpose: EmailCodePurpose,
) {
  return purpose === "forget-password"
    ? authClient.emailOtp.requestPasswordReset({ email })
    : authClient.emailOtp.sendVerificationOtp({ email, type: purpose });
}

export function EmailCodeForm({
  email,
  purpose,
  onBack,
  onVerified,
}: {
  email: string;
  purpose: EmailCodePurpose;
  onBack: () => void;
  onVerified: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState(60);
  const [complete, setComplete] = useState(false);
  const reset = purpose === "forget-password";
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (complete)
    return (
      <div className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-tight">
          Your password is updated.
        </h2>
        <p role="status" className="text-sm leading-6 text-[#707662]">
          You can now sign in with your new password. Your other sessions have
          been signed out.
        </p>
        <Link
          to="/sign-in"
          className="inline-flex rounded-lg bg-orange px-5 py-3 text-sm font-semibold text-[#3e2118]"
        >
          Back to log in
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="font-mono text-[10px] tracking-widest text-[#707662]">
          CHECK YOUR INBOX
        </span>
        <h2 className="text-4xl font-semibold tracking-tight">
          {reset
            ? "A fresh set of keys."
            : purpose === "sign-in"
              ? "Your code. Your space."
              : "One last step."}
        </h2>
        <p className="text-sm leading-6 text-[#707662]">
          {purpose === "email-verification"
            ? "Enter the six-digit verification code for"
            : "If an account exists, we’ll send a six-digit code to"}{" "}
          <strong className="wrap-anywhere font-semibold text-[#424938]">
            {email}
          </strong>
          .
        </p>
      </header>
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || resending) return;
          if (!/^\d{6}$/.test(otp)) {
            setError("Enter the six-digit code from your email.");
            input.current?.focus();
            return;
          }
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const result = reset
              ? await authClient.emailOtp.resetPassword({
                  email,
                  otp,
                  password,
                })
              : purpose === "sign-in"
                ? await authClient.signIn.emailOtp({ email, otp })
                : await authClient.emailOtp.verifyEmail({ email, otp });
            if (result.error) {
              setError(
                result.error.message ||
                  "That code couldn’t be verified. Please try again.",
              );
              return;
            }
            setOtp("");
            setPassword("");
            if (reset) setComplete(true);
            else onVerified();
          } catch {
            setError("Could not reach the server. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-2">
          <label htmlFor={`${id}-code`} className="block text-sm font-semibold">
            Verification code
          </label>
          <input
            ref={input}
            id={`${id}-code`}
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            disabled={busy || resending}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            aria-invalid={!!error}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            className="h-16 w-full rounded-xl border border-[#dcded2] bg-[#fcfcf8] px-4 text-center font-mono text-3xl tracking-[0.4em] text-[#424938] focus:border-[#e58965] focus:outline-2 focus:outline-[#f45e3830] disabled:opacity-60"
          />
          <p id={`${id}-hint`} className="text-xs text-[#707662]">
            Expires in 5 minutes. Use the most recent code.
          </p>
        </div>
        {reset && (
          <div className="space-y-2">
            <label
              htmlFor={`${id}-password`}
              className="block text-sm font-semibold"
            >
              New password
            </label>
            <input
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              disabled={busy || resending}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="h-12 w-full rounded-lg border border-[#dcded2] bg-[#fcfcf8] px-4 text-base text-[#424938] focus:border-[#e58965] focus:outline-2 focus:outline-[#f45e3830]"
            />
          </div>
        )}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm leading-5 text-[#b04830]"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-[#52623d]">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || resending}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange px-5 py-3 text-sm font-semibold text-[#3e2118] hover:bg-[#ed724d] disabled:cursor-wait disabled:opacity-60"
        >
          {busy && (
            <span
              aria-hidden="true"
              className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
            />
          )}
          {busy
            ? "Checking…"
            : reset
              ? "Update password"
              : purpose === "sign-in"
                ? "Sign in"
                : "Verify email & continue"}
        </button>
      </form>
      <div className="space-y-4 text-center text-sm">
        <button
          type="button"
          disabled={remaining > 0 || busy || resending}
          className="font-semibold text-[#76523e] underline-offset-4 hover:underline disabled:cursor-default disabled:text-[#858e77] disabled:no-underline"
          onClick={async () => {
            if (remaining > 0 || busy || resending) return;
            setResending(true);
            setError("");
            setNotice("");
            try {
              const result = await requestEmailCode(email, purpose);
              setRemaining(60);
              if (result.error) {
                setError(result.error.message || "Could not resend your code.");
                return;
              }
              setOtp("");
              setNotice(
                "A new code was requested. Check your inbox and spam folder.",
              );
              input.current?.focus();
            } catch {
              setError("Could not reach the server. Please try again.");
            } finally {
              setResending(false);
            }
          }}
        >
          {resending
            ? "Requesting code…"
            : remaining > 0
              ? `Resend code in ${remaining}s`
              : "Resend code"}
        </button>
        <div>
          <button
            type="button"
            disabled={busy || resending}
            onClick={onBack}
            className="text-[#707662] underline underline-offset-4 disabled:opacity-50"
          >
            Use a different email
          </button>
        </div>
        {purpose === "email-verification" && (
          <p className="text-xs text-[#707662]">
            Already have an account?{" "}
            <Link to="/sign-in" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
