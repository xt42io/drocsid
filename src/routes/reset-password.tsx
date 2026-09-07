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
    <main className="auth-form-wrap" id="main">
      <h1>A fresh set of keys.</h1>
      {complete ? (
        <>
          <p>Your password has been changed.</p>
          <Link to="/sign-in">Back to log in</Link>
        </>
      ) : (
        <form
          className="auth-form"
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
          <label className="form-field">
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
          <button className="button button-orange" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
          <Link to="/forgot-password">Request another reset link</Link>
        </form>
      )}
    </main>
  );
}
