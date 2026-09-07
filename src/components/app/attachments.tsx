import { uploadFile } from "../../lib/upload-file";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../lib/demo-data";
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
  const { notify } = useApp();
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
    clear: () => current.current.forEach((u) => remove(u.key)),
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
    <div className="a-upload-tray" aria-label="Message attachments">
      {uploads.map((item) => (
        <div className="a-upload-item" key={item.key}>
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
  const [viewing, setViewing] = useState<Attachment | null>(null);
  return (
    <>
      <div className="a-message-attachments">
        {files.map((file) =>
          file.contentType.startsWith("image/") ? (
            <button
              key={file.id}
              className="a-image-attachment"
              onClick={() => setViewing(file)}
              aria-label={`View ${file.name}`}
            >
              <img src={file.url} alt={file.name} loading="lazy" />
            </button>
          ) : (
            <a
              className="a-file-attachment"
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
          <img
            className="a-image-viewer"
            src={viewing.url}
            alt={viewing.name}
          />
          <a
            className="a-button secondary"
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
