import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import { OtpInput } from "./otp-input";

export async function requestEmailCode(email: string) {
  return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}

export function EmailCodeForm({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState(60);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="font-mono text-[10px] tracking-widest text-[#707662]">
          CHECK YOUR INBOX
        </span>
        <h2 className="text-4xl font-semibold tracking-tight">
          Your code. Your space.
        </h2>
        <p className="text-sm leading-6 text-[#707662]">
          Enter the six-digit code sent to{" "}
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
            const result = await authClient.signIn.emailOtp({
              email,
              otp,
            });
            if (result.error) {
              setError(
                result.error.message ||
                  "That code couldn’t be verified. Please try again.",
              );
              return;
            }
            setOtp("");
            onVerified();
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
          <OtpInput
            firstInputRef={input}
            id={`${id}-code`}
            value={otp}
            disabled={busy || resending}
            onChange={(value) => {
              setOtp(value);
              setError("");
            }}
            invalid={!!error}
            describedBy={`${id}-hint${error ? ` ${id}-error` : ""}`}
          />
          <p id={`${id}-hint`} className="text-xs text-[#707662]">
            Expires in 5 minutes. Use the most recent code.
          </p>
        </div>
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
          {busy ? "Checking…" : "Verify & continue"}
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
              const result = await requestEmailCode(email);
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
      </div>
    </div>
  );
}
