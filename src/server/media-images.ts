import { imageUrl, type ByteshipClient } from "@byteship/js";
import type { ImageVariant } from "../lib/media-images";
import { HttpError } from "./http";

const variants = {
  "avatar-40": { width: 40, height: 40, fit: "cover" },
  "avatar-80": { width: 80, height: 80, fit: "cover" },
  "avatar-160": { width: 160, height: 160, fit: "cover" },
  "chat-420": { width: 420, height: 320, fit: "scale-down" },
  "chat-840": { width: 840, height: 640, fit: "scale-down" },
} as const;

export function imageVariant(request: Request, kind: "avatar" | "chat") {
  const values = new URL(request.url).searchParams.getAll("variant");
  if (!values.length) return undefined;
  const value = values[0];
  if (
    values.length !== 1 ||
    !Object.hasOwn(variants, value) ||
    !value.startsWith(`${kind}-`)
  )
    throw new HttpError(400, "Unknown image size.");
  return value as ImageVariant;
}

// Call only after authorizing access to the original file. The signed URL and
// its token stay server-side; transformations never make private uploads public.
export async function storedImage(
  storage: Pick<ByteshipClient, "createSignedUrl">,
  file: { path: string; contentType: string; byteSize: number },
  variant?: ImageVariant,
) {
  if (
    variant &&
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      file.contentType,
    )
  )
    throw new HttpError(400, "This file cannot be resized.");
  const { signedUrl } = await storage.createSignedUrl(file.path, {
    expiresInSeconds: 60,
  });
  if (variant) {
    try {
      const transformed = await fetch(
        imageUrl(signedUrl.url, {
          ...variants[variant],
          format: "webp",
          quality: 80,
          animated: true,
        }),
        { signal: AbortSignal.timeout(15000) },
      );
      if (
        transformed.ok &&
        transformed.headers.get("content-type")?.split(";")[0] === "image/webp"
      )
        return {
          response: transformed,
          contentType: "image/webp",
          byteSize: undefined,
        };
      await transformed.body?.cancel();
    } catch {
      // Unsupported images or temporary transformation failures can still show
      // the original. Do not cache that fallback as a successful derivative.
    }
  }
  const response = await fetch(signedUrl.url, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new HttpError(502, "This file is temporarily unavailable.");
  return { response, contentType: file.contentType, byteSize: file.byteSize };
}
