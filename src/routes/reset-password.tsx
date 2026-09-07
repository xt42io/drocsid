import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});
function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  return (
    <main
      data-ui="auth-form-wrap"
      className="w-full max-w-93 m-auto py-18.75 min-[1600px]:max-w-102.5 max-[800px]:py-13.75 max-[580px]:py-[38px_46px] max-[580px]:max-w-95"
      id="main"
    >
      <h1>A fresh set of keys.</h1>
      {complete ? (
        <>
          <p>Your password has been changed.</p>
          <Link to="/sign-in">Back to log in</Link>
        </>
      ) : (
        <form
          data-ui="auth-form"
          className="flex flex-col gap-4.5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage("");
            try {
              const token = new URLSearchParams(window.location.search).get(
                "token",
              );
              if (!token) {
                setMessage(
                  "This reset link is missing or expired. Request a new one.",
                );
                return;
              }
              const result = await authClient.resetPassword({
                newPassword: password,
                token,
              });
              if (result.error)
                setMessage(
                  result.error.message || "Could not reset your password.",
                );
              else {
                setPassword("");
                setComplete(true);
              }
            } catch {
              setMessage("Could not reach the server. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label
            data-ui="form-field"
            className="flex flex-col [&_label]:block [&_label]:text-[14px] [&_label]:font-semibold [&_label]:mb-2 [&_input]:w-full [&_input]:border [&_input]:border-solid [&_input]:border-[#dcded2] [&_input]:bg-[#fcfcf8] [&_input]:h-11.75 [&_input]:py-0 [&_input]:px-3.25 [&_input]:rounded-md [&_input]:text-[#424938] [&_input]:text-[14px] [&_input]:[outline:none] [&_input]:[transition:border-color_0.15s,box-shadow_0.15s] [&_input::placeholder]:text-[#818974] [&_input:focus]:border-[#e58965] [&_input:focus]:shadow-[0_0_0_3px_#f45e3810] [&_input[aria-invalid='true']]:border-[#cc5d48] [&_input[aria-invalid='true']]:bg-[#fff8f2] max-[580px]:[&_label]:text-[13px] max-[580px]:[&_input]:text-[16px] max-[580px]:[&_input]:h-12 max-[580px]:[&_input]:px-3 max-[580px]:[&_input::placeholder]:text-[12px]"
          >
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              minLength={8}
              maxLength={128}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && <p role="alert">{message}</p>}
          <button
            data-ui="button button-orange"
            className="inline-flex items-center justify-center gap-3 border border-solid border-transparent min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-orange text-[#3e2118] shadow-[0_2px_0_#d842201c] hover:transform-[translateY(-2px)] hover:bg-[#ed724d] hover:shadow-[0_5px_12px_#ee58202a] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
            disabled={busy}
          >
            {busy ? "Updating…" : "Update password"}
          </button>
          <Link to="/forgot-password">Request another reset link</Link>
        </form>
      )}
    </main>
  );
}
