import { imageUrl, type ByteshipClient } from "@byteship/js";
import type { ImageVariant } from "../lib/media-images";
import { HttpError } from "./http";

const variants = {
  "avatar-40": { width: 40, height: 40, fit: "cover" },
  "avatar-80": { width: 80, height: 80, fit: "cover" },
  "avatar-160": { width: 160, height: 160, fit: "cover" },
  "community-cover-960": { width: 960, height: 360, fit: "cover" },
  "community-cover-1920": { width: 1920, height: 720, fit: "cover" },
  "chat-420": { width: 420, height: 320, fit: "scale-down" },
  "chat-840": { width: 840, height: 640, fit: "scale-down" },
} as const;

export function imageVariant(
  request: Request,
  kind: "avatar" | "chat" | "community",
) {
  const values = new URL(request.url).searchParams.getAll("variant");
  if (!values.length) return undefined;
  const value = values[0];
  if (
    values.length !== 1 ||
    !Object.hasOwn(variants, value) ||
    (kind === "community"
      ? !value.startsWith("avatar-") &&
        !value.startsWith("community-cover-")
      : !value.startsWith(`${kind}-`))
  )
    throw new HttpError(400, "Unknown image size.");
  return value as ImageVariant;
}

type Storage = Pick<ByteshipClient, "createSignedUrl">;
const stores = new WeakMap<
  Storage,
  {
    signed: Map<string, { expires: number; task: Promise<string> }>;
    images: Map<string, { expires: number; bytes: Uint8Array }>;
    bytes: number;
  }
>();
function cacheFor(storage: Storage) {
  let cache = stores.get(storage);
  if (!cache) {
    cache = { signed: new Map(), images: new Map(), bytes: 0 };
    stores.set(storage, cache);
  }
  return cache;
}
async function sourceUrl(storage: Storage, path: string) {
  const cache = cacheFor(storage);
  const existing = cache.signed.get(path);
  if (existing && existing.expires > Date.now()) return existing.task;
  const task = storage
    .createSignedUrl(path, { expiresInSeconds: 60 })
    .then((result) => result.signedUrl.url);
  const entry = { expires: Date.now() + 45_000, task };
  cache.signed.set(path, entry);
  while (cache.signed.size > 500)
    cache.signed.delete(cache.signed.keys().next().value!);
  try {
    return await task;
  } catch (error) {
    if (cache.signed.get(path) === entry) cache.signed.delete(path);
    throw error;
  }
}
function cacheStream(storage: Storage, key: string, response: Response) {
  if (!response.body) return response;
  const reader = response.body.getReader();
  let chunks: Uint8Array[] = [];
  let size = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const part = await reader.read();
          if (part.done) {
            if (size <= 2 * 1024 * 1024) {
              const cache = cacheFor(storage);
              const bytes = new Uint8Array(size);
              let offset = 0;
              for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.byteLength;
              }
              const previous = cache.images.get(key);
              if (previous) cache.bytes -= previous.bytes.byteLength;
              cache.images.delete(key);
              cache.images.set(key, { expires: Date.now() + 300_000, bytes });
              cache.bytes += size;
              while (
                cache.bytes > 32 * 1024 * 1024 ||
                cache.images.size > 300
              ) {
                const oldest = cache.images.keys().next().value!;
                cache.bytes -= cache.images.get(oldest)!.bytes.byteLength;
                cache.images.delete(oldest);
              }
            }
            chunks = [];
            controller.close();
            return;
          }
          size += part.value.byteLength;
          if (size <= 2 * 1024 * 1024) chunks.push(part.value);
          else chunks = [];
          controller.enqueue(part.value);
        } catch (error) {
          chunks = [];
          controller.error(error);
        }
      },
      cancel(reason) {
        chunks = [];
        return reader.cancel(reason);
      },
    }),
    { headers: response.headers },
  );
}
export function mediaCacheHeaders(id: string, variant?: ImageVariant) {
  return {
    "Cache-Control": "private, no-cache",
    ETag: `W/"drocsid-image-2-${id}-${variant ?? "original"}"`,
    Vary: "Cookie",
  };
}
export function mediaNotModified(
  request: Request | undefined,
  headers: ReturnType<typeof mediaCacheHeaders>,
) {
  const tags = request?.headers
    .get("if-none-match")
    ?.split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""));
  return (
    tags?.includes(headers.ETag.replace(/^W\//, "")) || tags?.includes("*")
  );
}

// Call only after authorizing access to the original file. The signed URL and
// its token stay server-side; transformations never make private uploads public.
export async function storedImage(
  storage: Storage,
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
  const key = `${file.path}:${variant}`;
  const cache = cacheFor(storage);
  const cached = variant ? cache.images.get(key) : undefined;
  if (cached && cached.expires > Date.now()) {
    cache.images.delete(key);
    cache.images.set(key, cached);
    return {
      response: new Response(cached.bytes as BodyInit, {
        headers: { "content-type": "image/webp" },
      }),
      contentType: "image/webp",
      byteSize: undefined,
    };
  }
  if (cached) {
    cache.images.delete(key);
    cache.bytes -= cached.bytes.byteLength;
  }
  const signedUrl = await sourceUrl(storage, file.path);
  if (variant) {
    try {
      const transformed = await fetch(
        imageUrl(signedUrl, {
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
          response: cacheStream(storage, key, transformed),
          contentType: "image/webp",
          byteSize: undefined,
        };
      await transformed.body?.cancel();
    } catch {
      // Unsupported images or temporary transformation failures can still show
      // the original. Do not cache that fallback as a successful derivative.
    }
  }
  const response = await fetch(signedUrl, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new HttpError(502, "This file is temporarily unavailable.");
  return { response, contentType: file.contentType, byteSize: file.byteSize };
}
