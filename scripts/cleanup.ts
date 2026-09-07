import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "../src/server/db";
import {
  attachments,
  avatars,
  communityIcons,
  events,
  limits,
  verification,
} from "../src/server/db/schema";
import { getStorage } from "../src/server/uploads";

const db = getDb();
const storage = getStorage();
const abandoned = await db
  .select()
  .from(attachments)
  .where(
    or(
      eq(attachments.status, "deleted"),
      and(
        isNull(attachments.messageId),
        lt(attachments.createdAt, new Date(Date.now() - 3600000)),
      ),
    ),
  )
  .limit(200);
let removed = 0;
for (const file of abandoned) {
  const claimed = await db
    .update(attachments)
    .set({ status: "deleted" })
    .where(
      and(
        eq(attachments.id, file.id),
        or(
          eq(attachments.status, "deleted"),
          and(
            isNull(attachments.messageId),
            lt(attachments.createdAt, new Date(Date.now() - 3600000)),
          ),
        ),
      ),
    )
    .returning();
  if (!claimed.length) continue;
  try {
    await storage.deleteFile(file.path);
  } catch (error) {
    if ((error as { status?: number }).status !== 404) {
      console.error("Storage cleanup failed for attachment", file.id);
      continue;
    }
  }
  await db.delete(attachments).where(eq(attachments.id, file.id));
  removed++;
}
// A replaced photo is deleted; only pending uploads can age out. Active photos stay.
const staleAvatars = or(
  eq(avatars.status, "deleted"),
  and(
    eq(avatars.status, "pending"),
    lt(avatars.createdAt, new Date(Date.now() - 3600000)),
  ),
);
const oldPhotos = await db
  .select()
  .from(avatars)
  .where(staleAvatars)
  .limit(200);
let photosRemoved = 0;
for (const file of oldPhotos) {
  const claimed = await db
    .update(avatars)
    .set({ status: "deleted" })
    .where(and(eq(avatars.id, file.id), staleAvatars))
    .returning();
  if (!claimed.length) continue;
  try {
    await storage.deleteFile(file.path);
  } catch (error) {
    if ((error as { status?: number }).status !== 404) {
      console.error("Storage cleanup failed for avatar", file.id);
      continue;
    }
  }
  await db.delete(avatars).where(eq(avatars.id, file.id));
  photosRemoved++;
}
const staleIcons = or(
  eq(communityIcons.status, "deleted"),
  and(
    inArray(communityIcons.status, ["pending", "ready"]),
    lt(communityIcons.createdAt, new Date(Date.now() - 3600000)),
  ),
  and(eq(communityIcons.status, "active"), isNull(communityIcons.communityId)),
);
const oldIcons = await db
  .select()
  .from(communityIcons)
  .where(staleIcons)
  .limit(200);
let iconsRemoved = 0;
for (const file of oldIcons) {
  const claimed = await db
    .update(communityIcons)
    .set({ status: "deleted" })
    .where(and(eq(communityIcons.id, file.id), staleIcons))
    .returning();
  if (!claimed.length) continue;
  try {
    await storage.deleteFile(file.path);
  } catch (error) {
    if ((error as { status?: number }).status !== 404) {
      console.error("Storage cleanup failed for community icon", file.id);
      continue;
    }
  }
  await db.delete(communityIcons).where(eq(communityIcons.id, file.id));
  iconsRemoved++;
}
console.log(`Removed ${iconsRemoved} abandoned/replaced community icons.`);
console.log(`Removed ${photosRemoved} abandoned/replaced avatars.`);
await db
  .delete(events)
  .where(lt(events.createdAt, new Date(Date.now() - 86400000)));
await db
  .delete(limits)
  .where(lt(limits.windowStart, new Date(Date.now() - 86400000)));
await db.delete(verification).where(lt(verification.expiresAt, new Date()));
console.log(
  `Removed ${removed} abandoned/deleted attachments; expired verification, events and limits cleaned.`,
);
process.exit(0);
