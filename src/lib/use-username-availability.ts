import { useEffect, useState } from "react";
import { api } from "./api-client";
import { usernameError } from "./usernames";

type Result = {
  username: string;
  status: "available" | "taken" | "error";
  message: string;
};
export function useUsernameAvailability(username: string) {
  const [result, setResult] = useState<Result | null>(null);
  const [revision, setRevision] = useState(0);
  const validation = usernameError(username);
  useEffect(() => {
    setResult(null);
    if (validation) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<{ username: string; available: boolean }>(
        `/api/username?username=${encodeURIComponent(username)}`,
        undefined,
        controller.signal,
      )
        .then((response) => {
          if (controller.signal.aborted) return;
          setResult({
            username,
            status: response.available ? "available" : "taken",
            message: response.available
              ? "This username is available."
              : "This username is taken. Try another one.",
          });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({
              username,
              status: "error",
              message: "Couldn’t check availability. Try again.",
            });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, validation, revision]);

  const current = !username
    ? {
        status: "idle" as const,
        message: "3–24 lowercase letters, numbers, or underscores.",
      }
    : validation
      ? { status: "invalid" as const, message: validation }
      : result?.username === username
        ? result
        : { status: "checking" as const, message: "Checking availability…" };
  return {
    ...current,
    retry: () => {
      setResult(null);
      setRevision((value) => value + 1);
    },
  };
}
