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
          className="a-attachment-preview"
          src={preview}
          alt={file.name}
          onError={() => setPreview(undefined)}
        />
      )}
      {!preview && !loaded && (
        <span
          className={`a-image-placeholder ${failed ? "is-failed" : ""}`}
          role="status"
        >
          <AppIcon name="file" size={28} />
          <span>{failed ? "Image unavailable" : "Loading image…"}</span>
        </span>
      )}
      <img
        key={attempt}
        className={`a-attachment-remote ${loaded ? "is-loaded" : ""}`}
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
    <div className={`a-attachment-image ${viewer ? "is-viewer" : ""}`}>
      {onView ? (
        <button
          type="button"
          className="a-image-attachment"
          onClick={onView}
          aria-label={`View ${file.name}`}
          aria-busy={!loaded && !failed}
        >
          {content}
        </button>
      ) : (
        <div className="a-image-attachment" aria-busy={!loaded && !failed}>
          {content}
        </div>
      )}
      {failed && (
        <div className="a-image-load-error" role="status">
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
