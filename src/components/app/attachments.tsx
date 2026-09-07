import { AttachmentImage } from "./attachment-image";
import { uploadFile } from "../../lib/upload-file";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../types/app";
import { api } from "../../lib/api-client";
import { useApp } from "../../lib/app-state";
import { AppIcon, Dialog } from "./primitives";

type Upload = {
  serverId?: string;
  key: string;
  file: File;
  preview?: string;
  progress: number;
  result?: Attachment;
  error?: string;
};
export const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export function useAttachments(conversation: string) {
  const { notify, attachmentPreviews } = useApp((app) => ({
    notify: app.notify,
    attachmentPreviews: app.attachmentPreviews,
  }));
  const [uploads, setUploads] = useState<Upload[]>([]);
  const current = useRef<Upload[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const alive = useRef(true);
  function update(next: Upload[]) {
    current.current = next;
    if (alive.current) setUploads(next);
  }
  function patch(key: string, values: Partial<Upload>) {
    update(
      current.current.map((u) => (u.key === key ? { ...u, ...values } : u)),
    );
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllers.current.forEach((c) => c.abort());
      current.current.forEach((u) => {
        if (u.preview) URL.revokeObjectURL(u.preview);
      });
    };
  }, []);
  async function start(item: Upload) {
    if (item.serverId)
      void api("/api/uploads", { type: "discard", id: item.serverId }).catch(
        () => {},
      );
    const controller = new AbortController();
    controllers.current.set(item.key, controller);
    patch(item.key, { progress: 0, error: undefined });
    try {
      const upload = await api<{
        id: string;
        url: string;
        headers: Record<string, string>;
      }>(
        "/api/uploads",
        {
          type: "prepare",
          conversation,
          filename: item.file.name,
          contentType: item.file.type || "application/octet-stream",
          byteSize: item.file.size,
        },
        controller.signal,
      );
      patch(item.key, { serverId: upload.id });
      await uploadFile(item.file, upload, controller.signal, (progress) =>
        patch(item.key, { progress }),
      );
      const result = await api<Attachment>(
        "/api/uploads",
        { type: "complete", id: upload.id },
        controller.signal,
      );
      patch(item.key, { progress: 100, result });
    } catch (e) {
      if (!controller.signal.aborted)
        patch(item.key, {
          error: e instanceof Error ? e.message : "Could not upload this file.",
        });
    } finally {
      controllers.current.delete(item.key);
    }
  }
  function add(files: File[]) {
    const room = 10 - current.current.length;
    if (files.length > room)
      notify("You can attach up to 10 files per message.");
    const accepted: Upload[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.size || file.size > 25 * 1024 * 1024) {
        notify(`${file.name}: choose a file between 1 byte and 25 MB.`);
        continue;
      }
      accepted.push({
        key: crypto.randomUUID(),
        file,
        progress: 0,
        preview: /^image\/(png|jpeg|gif|webp)$/.test(file.type)
          ? URL.createObjectURL(file)
          : undefined,
      });
    }
    update([...current.current, ...accepted]);
    accepted.forEach((item) => {
      void start(item);
    });
  }
  function remove(key: string) {
    controllers.current.get(key)?.abort();
    const item = current.current.find((u) => u.key === key);
    if (item?.serverId)
      void api("/api/uploads", { type: "discard", id: item.serverId }).catch(
        () => {},
      );
    if (item?.preview) URL.revokeObjectURL(item.preview);
    update(current.current.filter((u) => u.key !== key));
  }
  return {
    uploads,
    add,
    remove,
    retry: start,
    take: () => {
      if (current.current.some((u) => !u.result)) return [];
      const files = current.current.flatMap((u) =>
        u.result ? [u.result] : [],
      );
      // Ownership moves to the outbox. Do not discard these ready uploads while
      // their messages are in flight; a failed message may retry with them.
      current.current.forEach((u) => {
        if (!u.preview) return;
        if (u.result?.contentType.startsWith("image/"))
          attachmentPreviews.add(u.result.id, u.preview);
        else URL.revokeObjectURL(u.preview);
      });
      update([]);
      return files;
    },
    ready: uploads.every((u) => !!u.result),
    files: uploads.flatMap((u) => (u.result ? [u.result] : [])),
  };
}
export function UploadTray({
  uploads,
  remove,
  retry,
}: Pick<ReturnType<typeof useAttachments>, "uploads" | "remove" | "retry">) {
  if (!uploads.length) return null;
  return (
    <div
      data-ui="a-upload-tray"
      className="flex flex-wrap gap-2.5 pt-3 pb-0 px-3"
      aria-label="Message attachments"
    >
      {uploads.map((item) => (
        <div
          data-ui="a-upload-item"
          className="flex items-start gap-2.5 p-2.5 border border-solid border-(--a-border) rounded-[10px] max-w-80 bg-(--a-surface) [&>img]:object-cover [&>img]:rounded-md [&>img]:size-12 [&>div]:min-w-0 [&>div]:flex-1 [&_strong]:block [&_strong]:max-w-55 [&_strong]:text-[12px] [&_strong]:truncate [&_small]:block [&_small]:text-[11px] [&_small]:opacity-70 [&_small]:mt-0.75 [&_button]:p-0.75 [&_button]:text-[12px] [&_progress]:w-full [&_progress]:h-1 [&_progress]:accent-(--a-orange)"
          key={item.key}
        >
          {item.preview ? (
            <img src={item.preview} alt="" />
          ) : (
            <AppIcon name="file" size={28} />
          )}
          <div>
            <strong title={item.file.name}>{item.file.name}</strong>
            <small>
              {fileSize(item.file.size)} ·{" "}
              {item.error
                ? "Upload failed"
                : item.result
                  ? "Ready to send"
                  : item.progress >= 95
                    ? "Checking file…"
                    : `${item.progress}%`}
            </small>
            {!item.result && !item.error && (
              <progress
                aria-label={`Uploading ${item.file.name}`}
                max={100}
                value={item.progress}
              />
            )}
            {item.error && (
              <>
                <small role="alert">{item.error}</small>
                <button
                  type="button"
                  onClick={() => {
                    void retry(item);
                  }}
                >
                  Retry
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label={`Remove ${item.file.name}`}
            onClick={() => remove(item.key)}
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function MessageAttachments({ files }: { files: Attachment[] }) {
  const { attachmentPreviews } = useApp((app) => ({
    attachmentPreviews: app.attachmentPreviews,
  }));
  const [viewing, setViewing] = useState<Attachment | null>(null);
  return (
    <>
      <div
        data-ui="a-message-attachments"
        className="flex flex-wrap gap-2 mt-2"
      >
        {files.map((file) =>
          file.contentType.startsWith("image/") ? (
            <AttachmentImage
              key={`${file.id}:${file.url}`}
              file={file}
              attachmentPreviews={attachmentPreviews}
              onView={() => setViewing(file)}
            />
          ) : (
            <a
              data-ui="a-file-attachment"
              className="[&_strong]:block [&_strong]:max-w-55 [&_strong]:text-[12px] [&_strong]:truncate [&_small]:block [&_small]:text-[11px] [&_small]:opacity-70 [&_small]:mt-0.75 flex items-center gap-3 p-3.5 border border-solid border-(--a-border) rounded-[10px] max-w-full bg-(--a-surface)"
              key={file.id}
              href={file.url}
              download={file.name}
            >
              <AppIcon name="file" size={24} />
              <span>
                <strong>{file.name}</strong>
                <small>{fileSize(file.byteSize)}</small>
              </span>
              <AppIcon name="download" size={18} />
            </a>
          ),
        )}
      </div>
      {viewing && (
        <Dialog title={viewing.name} onClose={() => setViewing(null)}>
          <AttachmentImage
            key={`${viewing.id}:${viewing.url}`}
            file={viewing}
            attachmentPreviews={attachmentPreviews}
            viewer
          />
          <a
            data-ui="a-button secondary"
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
            href={viewing.url}
            download={viewing.name}
          >
            Download image
          </a>
        </Dialog>
      )}
    </>
  );
}
