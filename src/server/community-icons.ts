import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./db";
import { communityIcons as icons, members } from "./db/schema";
import { avatarSchema } from "./avatars";
import { requireManager } from "./access";
import { HttpError } from "./http";
import { getStorage, verifyStoredUpload } from "./uploads";
import { invalidateActions } from "./invalidation";
import {
  mediaCacheHeaders,
  mediaNotModified,
  storedImage,
} from "./media-images";
import type { ImageVariant } from "../lib/media-images";
import type { z } from "zod";

export const communityIconSchema = avatarSchema;
export const communityIconUrl = (id: string) => `/api/community-icons/${id}`;

async function lockManager(db: Database, userId: string, communityId: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`community-icon:${communityId}`}))`,
  );
  const [member] = await db
    .select()
    .from(members)
    .where(
      and(eq(members.communityId, communityId), eq(members.userId, userId)),
    )
    .for("share");
  if (!member || !["Owner", "Admin"].includes(member.role))
    throw new HttpError(
      403,
      "Only community owners and admins can change its icon.",
    );
}
async function invalidate(db: Database, userId: string, communityId: string) {
  // Only the scope is used to choose recipients; no membership is changed here.
  await invalidateActions(db, userId, [
    { type: "community.join", id: communityId },
  ]);
}
export async function prepareCommunityIcon(
  db: Database,
  userId: string,
  input: z.infer<typeof avatarSchema> & { communityId?: string },
  storage = getStorage(),
) {
  const data = avatarSchema.parse(input);
  if (input.communityId) await requireManager(db, userId, input.communityId);
  const id = crypto.randomUUID();
  const path = `community-icons/${userId}/${id}/image`;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`icon-uploads:${userId}`}))`,
    );
    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(icons)
      .where(
        and(
          eq(icons.uploaderId, userId),
          inArray(icons.status, ["pending", "ready"]),
        ),
      );
    if (usage.count >= 5)
      throw new HttpError(
        429,
        "Finish or remove your pending icon uploads first.",
      );
    await tx
      .insert(icons)
      .values({
        id,
        uploaderId: userId,
        communityId: input.communityId,
        path,
        ...data,
      });
  });
  try {
    const upload = await storage.createFileUpload(path, {
      ...data,
      method: "single",
      visibility: "private",
    });
    if (!upload.upload.url)
      throw new HttpError(502, "Storage did not return an upload URL.");
    await db
      .update(icons)
      .set({ uploadId: upload.upload.id })
      .where(eq(icons.id, id));
    return { id, url: upload.upload.url, headers: upload.upload.headers };
  } catch (error) {
    await db.update(icons).set({ status: "deleted" }).where(eq(icons.id, id));
    throw error;
  }
}

// Called inside the community-creation transaction. An unbound verified upload
// becomes public only when its own uploader successfully creates the community.
export async function attachCommunityIcon(
  db: Database,
  userId: string,
  communityId: string,
  id: string,
) {
  await lockManager(db, userId, communityId);
  const [file] = await db
    .select()
    .from(icons)
    .where(eq(icons.id, id))
    .for("update");
  if (
    !file ||
    file.uploaderId !== userId ||
    file.status !== "ready" ||
    file.communityId !== null
  )
    throw new HttpError(
      400,
      "This icon upload is unavailable. Upload the image again.",
    );
  await db
    .update(icons)
    .set({ status: "active", communityId })
    .where(eq(icons.id, id));
}

export async function completeCommunityIcon(
  db: Database,
  userId: string,
  id: string,
  storage = getStorage(),
) {
  const [file] = await db
    .select()
    .from(icons)
    .where(and(eq(icons.id, id), eq(icons.uploaderId, userId)));
  if (!file || file.status === "deleted")
    throw new HttpError(404, "Icon upload not found.");
  if (file.communityId) await requireManager(db, userId, file.communityId);
  if (file.status === "ready" || file.status === "active")
    return { id, url: communityIconUrl(id) };
  const contentType = await verifyStoredUpload(file, storage);
  if (!/^image\/(png|jpeg|webp|gif)$/.test(contentType))
    throw new HttpError(400, "Choose a PNG, JPEG, WebP or GIF image.");
  await db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    if (file.communityId) await lockManager(database, userId, file.communityId);
    const [current] = await tx
      .select()
      .from(icons)
      .where(eq(icons.id, id))
      .for("update");
    if (!current || current.status === "deleted")
      throw new HttpError(404, "This icon upload was removed.");
    if (current.status !== "pending") return;
    if (current.communityId) {
      await tx
        .update(icons)
        .set({ status: "deleted" })
        .where(
          and(
            eq(icons.communityId, current.communityId),
            eq(icons.status, "active"),
          ),
        );
      await tx
        .update(icons)
        .set({ status: "active", contentType })
        .where(eq(icons.id, id));
      await invalidate(database, userId, current.communityId);
    } else
      await tx
        .update(icons)
        .set({ status: "ready", contentType })
        .where(eq(icons.id, id));
  });
  return { id, url: communityIconUrl(id) };
}

export async function discardCommunityIcon(
  db: Database,
  userId: string,
  id: string,
) {
  await db
    .update(icons)
    .set({ status: "deleted" })
    .where(
      and(
        eq(icons.id, id),
        eq(icons.uploaderId, userId),
        inArray(icons.status, ["pending", "ready"]),
      ),
    );
  return { ok: true };
}
export async function removeCommunityIcon(
  db: Database,
  userId: string,
  communityId: string,
) {
  await db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    await lockManager(database, userId, communityId);
    await tx
      .update(icons)
      .set({ status: "deleted" })
      .where(
        and(eq(icons.communityId, communityId), eq(icons.status, "active")),
      );
    await invalidate(database, userId, communityId);
  });
  return { ok: true };
}
export async function communityIconResponse(
  db: Database,
  id: string,
  storage = getStorage(),
  variant?: ImageVariant,
  request?: Request,
) {
  const [file] = await db
    .select()
    .from(icons)
    .where(
      and(
        eq(icons.id, id),
        eq(icons.status, "active"),
        sql`${icons.communityId} is not null`,
      ),
    );
  if (!file) throw new HttpError(404, "Community icon not found.");
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
      ...(byteSize === undefined ? {} : { "Content-Length": String(byteSize) }),
      "Content-Disposition": "inline",
      ...cacheHeaders,
      ...(variant && contentType !== "image/webp"
        ? { "Cache-Control": "private, no-store", ETag: "" }
        : {}),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
