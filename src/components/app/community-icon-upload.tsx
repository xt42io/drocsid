import { useEffect, useRef, useState } from "react";
import type { Community } from "../../types/app";
import { api } from "../../lib/api-client";
import { uploadFile } from "../../lib/upload-file";
import { useApp } from "../../lib/app-state";
import { CommunityIcon } from "./community-icon";
import { AppIcon } from "./primitives";
import { ButtonLoader } from "../button-loader";

export type IconUpload = { id: string; url: string };
export function CommunityIconUpload({
  community,
  communityId,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  community: Pick<Community, "icon" | "iconUrl">;
  communityId?: string;
  onChange?: (upload: IconUpload | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const { setState } = useApp((app) => ({ setState: app.setState }));
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  const draft = useRef<IconUpload | undefined>(undefined);
  const previewUrl = useRef<string | undefined>(undefined);
  const [preview, setPreview] = useState<string>();
  const [busyAction, setBusyAction] = useState<"upload" | "remove" | null>(
    null,
  );
  const busy = busyAction !== null;
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const discard = (id: string) => {
    void api("/api/community-icons", { type: "discard", id }).catch(() => {});
  };
  function clearPreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = undefined;
    if (mounted.current) setPreview(undefined);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current?.abort();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (draft.current) discard(draft.current.id);
    };
  }, []);
  async function change(file?: File) {
    if (operation.current || disabled) return;
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
    setBusyAction(file ? "upload" : "remove");
    onBusyChange?.(true);
    setProgress(0);
    let uploadId: string | undefined;
    const previousPreview = previewUrl.current;
    try {
      if (file) {
        const url = URL.createObjectURL(file);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
        } catch {
          URL.revokeObjectURL(url);
          throw new Error(
            "This image could not be opened. Choose another image.",
          );
        }
        if (controller.signal.aborted) {
          URL.revokeObjectURL(url);
          return;
        }
        previewUrl.current = url;
        setPreview(url);
        const upload = await api<{
          id: string;
          url: string;
          headers: Record<string, string>;
        }>(
          "/api/community-icons",
          {
            type: "prepare",
            communityId,
            byteSize: file.size,
            contentType: file.type,
          },
          controller.signal,
        );
        uploadId = upload.id;
        await uploadFile(file, upload, controller.signal, setProgress);
        const saved = await api<IconUpload>(
          "/api/community-icons",
          { type: "complete", id: upload.id },
          controller.signal,
        );
        if (!mounted.current) return;
        if (communityId) {
          await setState((previous) => ({
            ...previous,
            communities: previous.communities.map((c) =>
              c.id === communityId ? { ...c, iconUrl: saved.url } : c,
            ),
          }));
          clearPreview();
        } else {
          if (draft.current) discard(draft.current.id);
          draft.current = saved;
        }
        if (previousPreview) URL.revokeObjectURL(previousPreview);
        onChange?.(saved);
      } else {
        if (communityId) {
          await api(
            "/api/community-icons",
            { type: "remove", communityId },
            controller.signal,
          );
          if (!mounted.current) return;
          await setState((previous) => ({
            ...previous,
            communities: previous.communities.map((c) =>
              c.id === communityId ? { ...c, iconUrl: undefined } : c,
            ),
          }));
        } else if (draft.current) {
          discard(draft.current.id);
          draft.current = undefined;
        }
        clearPreview();
        onChange?.(undefined);
      }
    } catch (error) {
      if (uploadId) discard(uploadId);
      if (previewUrl.current !== previousPreview) clearPreview();
      if (mounted.current) {
        previewUrl.current = previousPreview;
        setPreview(previousPreview);
      }
      if (!controller.signal.aborted && mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : "Could not upload the icon. Please retry.",
        );
    } finally {
      if (!mounted.current && previousPreview)
        URL.revokeObjectURL(previousPreview);
      operation.current = null;
      if (mounted.current) {
        setBusyAction(null);
        onBusyChange?.(false);
      }
    }
  }
  return (
    <div className="flex flex-col items-center gap-3" aria-busy={busy}>
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-(--a-soft) text-(--a-orange)">
        <CommunityIcon
          community={{ ...community, iconUrl: preview ?? community.iconUrl }}
          size={38}
        />
      </div>
      <input
        type="file"
        ref={input}
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Choose community icon image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void change(file);
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy || disabled}
          className="flex items-center gap-2 rounded-md border border-(--a-border) px-4 py-2 text-xs font-medium hover:bg-(--a-hover) disabled:opacity-50"
          onClick={() => input.current?.click()}
        >
          {busyAction === "upload" ? (
            <ButtonLoader label="Uploading community icon" />
          ) : (
            <>
              <AppIcon name="plus" size={16} />
              {preview || community.iconUrl ? "Change image" : "Upload image"}
            </>
          )}
        </button>
        {(preview || community.iconUrl) && (
          <button
            type="button"
            disabled={busy || disabled}
            className="text-xs text-(--a-muted) hover:text-(--a-text) disabled:opacity-50"
            onClick={() => void change()}
          >
            {busyAction === "remove" ? (
              <ButtonLoader label="Removing community icon" />
            ) : (
              "Remove image"
            )}
          </button>
        )}
      </div>
      <p role="status" className="text-xs text-(--a-muted)">
        {busy
          ? progress >= 95
            ? "Saving icon…"
            : `Uploading icon… ${progress}%`
          : "PNG, JPEG, WebP or GIF · Up to 5 MB"}
      </p>
      {busy && (
        <progress
          className="w-full max-w-55 accent-(--a-orange)"
          value={progress}
          max={100}
          aria-label="Community icon upload progress"
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
