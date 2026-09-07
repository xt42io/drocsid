import { useEffect, useState } from "react";
import type { Attachment } from "../../types/app";
import type { AttachmentPreviews } from "../../lib/attachment-previews";
import { AppIcon } from "./primitives";

export function AttachmentImage({
  file,
  attachmentPreviews,
  onView,
  viewer = false,
}: {
  file: Attachment;
  attachmentPreviews: AttachmentPreviews;
  onView?: () => void;
  viewer?: boolean;
}) {
  const [preview, setPreview] = useState(() => attachmentPreviews.get(file.id));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!preview || loaded) return;
    return attachmentPreviews.retain(file.id);
  }, [attachmentPreviews, file.id, preview, loaded]);

  const content = (
    <>
      {preview && !loaded && (
        <img
          data-ui="a-attachment-preview"
          src={preview}
          alt={file.name}
          onError={() => setPreview(undefined)}
        />
      )}
      {!preview && !loaded && (
        <span
          data-ui={`a-image-placeholder ${failed ? "is-failed" : ""}`}
          className="flex flex-col items-center justify-center gap-2.5 w-[min(320px,55vw)] aspect-8/5 text-(--a-muted) text-[12px] [background:linear-gradient(100deg,transparent_25%,var(--a-border)_50%,transparent_75%)] bg-size-[200%_100%] animate-[attachment-loading_1.8s_ease-in-out_infinite] data-[ui~=is-failed]:animate-none data-[ui~=is-failed]:bg-(--a-surface) motion-reduce:animate-none"
          role="status"
        >
          <AppIcon name="file" size={28} />
          <span>{failed ? "Image unavailable" : "Loading image…"}</span>
        </span>
      )}
      <img
        key={attempt}
        data-ui={`a-attachment-remote ${loaded ? "is-loaded" : ""}`}
        src={
          attempt
            ? `${file.url}${file.url.includes("?") ? "&" : "?"}retry=${attempt}`
            : file.url
        }
        alt={loaded ? file.name : ""}
        aria-hidden={!loaded}
        loading={preview || viewer ? "eager" : "lazy"}
        decoding="async"
        onLoad={async (event) => {
          const image = event.currentTarget;
          if (!image.naturalWidth) return;
          // Keep the local pixels visible until the replacement is ready to paint.
          try {
            await image.decode();
          } catch {
            /* onError handles failed downloads. */
          }
          if (!image.isConnected || !image.naturalWidth) return;
          setLoaded(true);
          setFailed(false);
          attachmentPreviews.loaded(file.id);
        }}
        onError={() => {
          setLoaded(false);
          setFailed(true);
        }}
      />
    </>
  );
  return (
    <div
      data-ui={`a-attachment-image ${viewer ? "is-viewer" : ""}`}
      className="max-w-[min(420px,100%)] min-w-0 data-[ui~=is-viewer]:max-w-full data-[ui~=is-viewer]:mb-4 [&[data-ui~=is-viewer]_[data-ui~=a-image-attachment]]:my-0 [&[data-ui~=is-viewer]_[data-ui~=a-image-attachment]]:mx-auto [&[data-ui~=is-viewer]_[data-ui~=a-image-attachment]]:w-fit [&[data-ui~=is-viewer]_img]:max-h-[65vh]"
    >
      {onView ? (
        <button
          type="button"
          data-ui="a-image-attachment"
          className="relative block overflow-hidden rounded-[10px] border border-solid border-(--a-border) max-w-full bg-(--a-surface) [&_img]:block [&_img]:w-auto [&_img]:max-w-full [&_img]:max-h-80 [&_img]:object-contain [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:absolute [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:opacity-0 [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:pointer-events-none [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:size-full [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:inset-0"
          onClick={onView}
          aria-label={`View ${file.name}`}
          aria-busy={!loaded && !failed}
        >
          {content}
        </button>
      ) : (
        <div
          data-ui="a-image-attachment"
          className="relative block overflow-hidden rounded-[10px] border border-solid border-(--a-border) max-w-full bg-(--a-surface) [&_img]:block [&_img]:w-auto [&_img]:max-w-full [&_img]:max-h-80 [&_img]:object-contain [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:absolute [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:opacity-0 [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:pointer-events-none [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:size-full [&_[data-ui~=a-attachment-remote]:not([data-ui~=is-loaded])]:inset-0"
          aria-busy={!loaded && !failed}
        >
          {content}
        </div>
      )}
      {failed && (
        <div
          data-ui="a-image-load-error"
          className="flex flex-wrap gap-2 pt-1.5 text-[11px] text-(--a-muted) [&_button]:underline [&_button]:text-(--a-orange)"
          role="status"
        >
          <span>
            {preview
              ? "Showing local preview. Image couldn’t load."
              : "Image couldn’t load."}
          </span>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
            aria-label={`Retry loading ${file.name}`}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
