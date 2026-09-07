import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "./db";
import { avatars, events, user } from "./db/schema";
import { HttpError } from "./http";
import { getStorage, verifyStoredUpload } from "./uploads";

export const avatarSchema = z.object({
  byteSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
});

async function invalidate(db: Database) {
  const users = await db.select({ id: user.id }).from(user);
  if (users.length)
    await db
      .insert(events)
      .values(users.map(({ id }) => ({ id: crypto.randomUUID(), userId: id })));
}

export async function prepareAvatar(
  db: Database,
  userId: string,
  input: z.infer<typeof avatarSchema>,
  storage = getStorage(),
) {
  const data = avatarSchema.parse(input);
  const id = crypto.randomUUID();
  const path = `avatars/${userId}/${id}/image`;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`avatars:${userId}`}))`,
    );
    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(avatars)
      .where(
        and(eq(avatars.uploaderId, userId), eq(avatars.status, "pending")),
      );
    if (usage.count >= 5)
      throw new HttpError(
        429,
        "Finish or remove your pending photo uploads first.",
      );
    await tx.insert(avatars).values({ id, uploaderId: userId, path, ...data });
  });
  try {
    const created = await storage.createFileUpload(path, {
      ...data,
      method: "single",
      visibility: "private",
    });
    if (!created.upload.url)
      throw new HttpError(502, "Storage did not return an upload URL.");
    await db
      .update(avatars)
      .set({ uploadId: created.upload.id })
      .where(eq(avatars.id, id));
    return { id, url: created.upload.url, headers: created.upload.headers };
  } catch (error) {
    await db
      .update(avatars)
      .set({ status: "deleted" })
      .where(eq(avatars.id, id));
    throw error;
  }
}

export async function discardAvatar(db: Database, userId: string, id: string) {
  await db
    .update(avatars)
    .set({ status: "deleted" })
    .where(
      and(
        eq(avatars.id, id),
        eq(avatars.uploaderId, userId),
        eq(avatars.status, "pending"),
      ),
    );
  return { ok: true };
}

export async function completeAvatar(
  db: Database,
  userId: string,
  id: string,
  storage = getStorage(),
) {
  const [file] = await db
    .select()
    .from(avatars)
    .where(
      and(
        eq(avatars.id, id),
        eq(avatars.uploaderId, userId),
        ne(avatars.status, "deleted"),
      ),
    );
  if (!file) throw new HttpError(404, "Photo upload not found.");
  if (file.status === "active") return { url: `/api/avatars/${id}` };
  const contentType = await verifyStoredUpload(file, storage);
  if (!contentType.startsWith("image/"))
    throw new HttpError(400, "Choose a PNG, JPEG, WebP or GIF image.");
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`avatars:${userId}`}))`,
    );
    const [current] = await tx
      .select()
      .from(avatars)
      .where(eq(avatars.id, id))
      .for("update");
    if (!current || current.status === "deleted")
      throw new HttpError(404, "This photo upload was removed.");
    if (current.status === "active") return;
    await tx
      .update(avatars)
      .set({ status: "deleted" })
      .where(and(eq(avatars.uploaderId, userId), eq(avatars.status, "active")));
    await tx
      .update(avatars)
      .set({ status: "active", contentType })
      .where(eq(avatars.id, id));
    await tx
      .update(user)
      .set({ image: `/api/avatars/${id}`, updatedAt: new Date() })
      .where(eq(user.id, userId));
    await invalidate(tx as unknown as Database);
  });
  return { url: `/api/avatars/${id}` };
}

export async function removeAvatar(db: Database, userId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`avatars:${userId}`}))`,
    );
    await tx
      .update(avatars)
      .set({ status: "deleted" })
      .where(and(eq(avatars.uploaderId, userId), eq(avatars.status, "active")));
    await tx
      .update(user)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(user.id, userId));
    await invalidate(tx as unknown as Database);
  });
  return { ok: true };
}

// Public profile photos are visible to signed-in users. Pending and replaced photos are never served.
export async function avatarResponse(
  db: Database,
  id: string,
  storage = getStorage(),
) {
  const [file] = await db
    .select()
    .from(avatars)
    .where(and(eq(avatars.id, id), eq(avatars.status, "active")));
  if (!file) throw new HttpError(404, "Photo not found.");
  const { signedUrl } = await storage.createSignedUrl(file.path, {
    expiresInSeconds: 60,
  });
  const response = await fetch(signedUrl.url, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new HttpError(502, "This photo is temporarily unavailable.");
  return new Response(response.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.byteSize),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
