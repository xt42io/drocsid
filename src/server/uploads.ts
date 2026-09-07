import type { ImageVariant } from "../lib/media-images";
import {
  storedImage,
  mediaCacheHeaders,
  mediaNotModified,
} from "./media-images";
import { ByteshipClient } from "@byteship/js";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Database } from "./db";
import { attachments, messages, conversations } from "./db/schema";
import {
  requireConversation,
  requireDmSend,
  conversationAccess,
} from "./access";
import { HttpError } from "./http";
import type { z } from "zod";
import { uploadSchema } from "../lib/contracts";

let storageClient: { key: string; client: ByteshipClient } | undefined;
export function getStorage() {
  if (!process.env.BYTESHIP_API_KEY)
    throw new HttpError(
      503,
      "File uploads are not configured on this server yet.",
    );
  const key = process.env.BYTESHIP_API_KEY;
  if (storageClient?.key !== key)
    storageClient = { key, client: new ByteshipClient({ apiKey: key }) };
  return storageClient.client;
}
export async function discardUpload(db: Database, userId: string, id: string) {
  await db
    .update(attachments)
    .set({ status: "deleted" })
    .where(
      and(
        eq(attachments.id, id),
        eq(attachments.uploaderId, userId),
        isNull(attachments.messageId),
      ),
    );
  return { ok: true };
}
export async function prepareUpload(
  db: Database,
  userId: string,
  input: z.infer<typeof uploadSchema>,
  storage = getStorage(),
) {
  const limit = Math.min(
    Number(process.env.BYTESHIP_MAX_UPLOAD_BYTES) || 25 * 1024 * 1024,
    25 * 1024 * 1024,
  );
  if (input.byteSize > limit)
    throw new HttpError(
      413,
      `Files must be smaller than ${Math.floor(limit / 1024 / 1024)} MB.`,
    );
  const c = await requireConversation(db, userId, input.conversation, true);
  await requireDmSend(db, c, userId);
  const id = crypto.randomUUID();
  const filename = input.filename
    .replace(/[\x00-\x1f\x7f/\\]/g, "_")
    .slice(0, 240);
  const path = `attachments/${userId}/${id}/file`;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`uploads:${userId}`}))`,
    );
    const [usage] = await tx
      .select({
        bytes: sql<number>`coalesce(sum(${attachments.byteSize}), 0)::bigint`,
        pending: sql<number>`count(*) filter (where ${attachments.messageId} is null)::int`,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.uploaderId, userId),
          ne(attachments.status, "deleted"),
        ),
      );
    if (
      Number(usage.bytes) + input.byteSize >
      (Number(process.env.BYTESHIP_USER_QUOTA_BYTES) || 1024 * 1024 * 1024)
    )
      throw new HttpError(413, "Your file storage allowance has been reached.");
    if (usage.pending >= 30)
      throw new HttpError(
        429,
        "Finish or remove your pending uploads before adding more files.",
      );
    await tx.insert(attachments).values({
      id,
      conversationId: c.id,
      uploaderId: userId,
      path,
      originalName: filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
    });
  });
  // Server creates exactly one upload session. Browser only receives the signed PUT URL;
  // it cannot create extra files or replace an existing path using an upload token.
  const created = await storage.createFileUpload(path, {
    byteSize: input.byteSize,
    contentType: input.contentType,
    method: "single",
    visibility: "private",
  });
  if (!created.upload.url)
    throw new HttpError(502, "Storage did not return an upload URL.");
  await db
    .update(attachments)
    .set({ fileId: created.file.id, uploadId: created.upload.id })
    .where(eq(attachments.id, id));
  return { id, url: created.upload.url, headers: created.upload.headers };
}
// Validate the decoded bytes, not provider size metadata (compressed delivery may report zero).
export async function verifyStoredUpload(
  file: { path: string; uploadId: string | null; byteSize: number },
  storage = getStorage(),
) {
  if (!file.uploadId)
    throw new HttpError(409, "The upload session is not ready.");
  // Follow Byteship's create → PUT bytes → complete → metadata flow. A retry
  // may encounter an already-completed session; still verify the stored file.
  try {
    await storage.completePathUpload(file.path, { uploadId: file.uploadId });
  } catch (error) {
    if ((error as { status?: number }).status !== 409) throw error;
  }
  const verified = await storage.getFile(file.path);
  if (verified.file.status !== "ready")
    throw new HttpError(409, "Your upload is not ready yet. Please retry.");
  if (verified.file.visibility !== "private")
    throw new HttpError(400, "The uploaded file must be private.");
  // Only recognized raster file signatures may render inline. Everything else downloads.
  const { signedUrl } = await storage.createSignedUrl(file.path, {
    expiresInSeconds: 60,
  });
  let response = await fetch(signedUrl.url, {
    headers: { Range: "bytes=0-31", "Accept-Encoding": "identity" },
    signal: AbortSignal.timeout(60000),
  });
  // A provider-authenticated identity range reports the full object length while
  // delivering only the signature. Encoded ranges cannot attest decoded size.
  if (
    response.status === 206 &&
    response.headers.get("content-encoding") &&
    response.headers.get("content-encoding") !== "identity"
  ) {
    await response.body?.cancel();
    response = await fetch(signedUrl.url, {
      headers: { "Accept-Encoding": "identity" },
      signal: AbortSignal.timeout(60000),
    });
  }
  let expectedBytes = file.byteSize;
  if (response.status === 206) {
    const range = /^bytes 0-(\d+)\/(\d+)$/.exec(
      response.headers.get("content-range") ?? "",
    );
    if (
      !range ||
      Number(range[2]) !== file.byteSize ||
      Number(range[1]) !== Math.min(31, file.byteSize - 1)
    ) {
      await response.body?.cancel();
      throw new HttpError(
        400,
        "The uploaded file is incomplete or larger than expected.",
      );
    }
    expectedBytes = Number(range[1]) + 1;
  }
  if (!response.ok || !response.body)
    throw new HttpError(502, "Could not verify file content.");
  const reader = response.body.getReader();
  const bytes: number[] = [];
  let actualBytes = 0;
  try {
    // Compressed Byteship delivery can report byteSize: 0. Count the actual
    // decoded stream, retaining only the signature prefix in memory.
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      actualBytes += part.value.byteLength;
      if (actualBytes > expectedBytes)
        throw new HttpError(400, "The uploaded file is larger than expected.");
      if (bytes.length < 32)
        bytes.push(...part.value.slice(0, 32 - bytes.length));
    }
  } finally {
    await reader.cancel();
  }
  if (actualBytes !== expectedBytes)
    throw new HttpError(400, "The uploaded file is incomplete. Please retry.");
  const data = Uint8Array.from(bytes);
  const ascii = new TextDecoder().decode(data);
  const detected =
    data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
      ? "image/jpeg"
      : data.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
        ? "image/png"
        : ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")
          ? "image/gif"
          : ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP"
            ? "image/webp"
            : "application/octet-stream";
  return detected;
}
export async function completeUpload(
  db: Database,
  userId: string,
  id: string,
  storage = getStorage(),
) {
  const [file] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, id),
        eq(attachments.uploaderId, userId),
        isNull(attachments.messageId),
      ),
    );
  if (!file || file.status === "deleted")
    throw new HttpError(404, "Upload not found.");
  const [allowed] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, file.conversationId),
        conversationAccess(userId),
      ),
    );
  if (!allowed)
    throw new HttpError(403, "This conversation is no longer available.");
  if (file.status !== "ready") {
    const detected = await verifyStoredUpload(file, storage);
    await db
      .update(attachments)
      .set({ status: "ready", contentType: detected })
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.status, "pending"),
          isNull(attachments.messageId),
        ),
      );
  }
  const [ready] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id));
  if (!ready || ready.status !== "ready")
    throw new HttpError(404, "This upload was removed.");
  return {
    id,
    name: ready.originalName,
    byteSize: ready.byteSize,
    contentType: ready.contentType,
    url: `/api/attachments/${id}`,
  };
}
export async function attachmentResponse(
  db: Database,
  userId: string,
  id: string,
  storage = getStorage(),
  variant?: ImageVariant,
  request?: Request,
) {
  const [authorized] = await db
    .select({
      file: attachments,
      allowed: conversationAccess(userId),
      deletedAt: messages.deletedAt,
    })
    .from(attachments)
    .innerJoin(conversations, eq(conversations.id, attachments.conversationId))
    .leftJoin(messages, eq(messages.id, attachments.messageId))
    .where(and(eq(attachments.id, id), eq(attachments.status, "ready")));
  const file = authorized?.file;
  if (
    !file ||
    (!file.messageId && file.uploaderId !== userId) ||
    authorized.deletedAt
  )
    throw new HttpError(404, "File not found.");
  if (!authorized.allowed)
    throw new HttpError(403, "You do not have access to this file.");
  const cacheHeaders = mediaCacheHeaders(id, variant);
  if (mediaNotModified(request, cacheHeaders))
    return new Response(null, { status: 304, headers: cacheHeaders });
  const { response, contentType, byteSize } = await storedImage(
    storage,
    file,
    variant,
  );
  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${file.contentType.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName).replace(/'/g, "%27")}`,
      ...cacheHeaders,
      ...(variant && contentType !== "image/webp"
        ? { "Cache-Control": "private, no-store", ETag: "" }
        : {}),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ...(byteSize === undefined ? {} : { "Content-Length": String(byteSize) }),
    },
  });
}
