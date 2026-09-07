import { useEffect, useRef, useState } from "react";
import type { Person } from "../../lib/demo-data";
import { useApp } from "../../lib/app-state";
import { api } from "../../lib/api-client";
import { uploadFile } from "../../lib/upload-file";
import { PersonAvatar } from "./primitives";

export function AvatarUpload({
  person,
  onBusyChange,
}: {
  person: Person;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { refresh, notify } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => () => operation.current?.abort(), []);

  async function change(file?: File) {
    if (operation.current) return;
    setError("");
    if (
      file &&
      (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
        !file.size ||
        file.size > 5 * 1024 * 1024)
    ) {
      setError("Choose a PNG, JPEG, WebP or GIF image up to 5 MB.");
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    onBusyChange?.(true);
    setProgress(0);
    let uploadId: string | undefined;
    try {
      if (file) {
        // Catch unreadable/corrupt images before starting a storage upload.
        const objectUrl = URL.createObjectURL(file);
        try {
          const image = new Image();
          image.src = objectUrl;
          await image.decode();
        } catch {
          throw new Error(
            "This image could not be opened. Choose another photo.",
          );
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
        const upload = await api<{
          id: string;
          url: string;
          headers: Record<string, string>;
        }>(
          "/api/avatars",
          {
            type: "prepare",
            byteSize: file.size,
            contentType: file.type,
          },
          controller.signal,
        );
        uploadId = upload.id;
        await uploadFile(file, upload, controller.signal, setProgress);
        await api(
          "/api/avatars",
          { type: "complete", id: upload.id },
          controller.signal,
        );
      } else {
        await api("/api/avatars", { type: "remove" }, controller.signal);
      }
      await refresh();
      notify(file ? "Profile photo updated." : "Profile photo removed.");
    } catch (e) {
      if (uploadId)
        void api("/api/avatars", { type: "discard", id: uploadId }).catch(
          () => {},
        );
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Could not update your photo. Please retry.",
        );
    } finally {
      operation.current = null;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="a-avatar-upload" aria-busy={busy}>
      <PersonAvatar person={person} large />
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        aria-label="Choose profile photo"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void change(file);
        }}
      />
      <div className="a-avatar-upload-actions">
        <button
          type="button"
          className="a-button secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {person.avatarUrl ? "Change photo" : "Upload photo"}
        </button>
        {person.avatarUrl && (
          <button
            type="button"
            className="a-text-link"
            disabled={busy}
            onClick={() => void change()}
          >
            Remove photo
          </button>
        )}
      </div>
      <small role="status">
        {busy
          ? progress >= 95
            ? "Saving photo…"
            : `Updating photo… ${progress}%`
          : "PNG, JPEG, WebP or GIF · Up to 5 MB"}
      </small>
      {busy && (
        <progress
          aria-label="Photo upload progress"
          max={100}
          value={progress}
        />
      )}
      {error && (
        <p className="a-form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
