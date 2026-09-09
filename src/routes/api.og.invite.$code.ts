import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { communityIconResponse } from "../server/community-icons";
import { invitePreview } from "../server/invites";
import { endpoint } from "../server/http";
import { renderInviteOpenGraphImage } from "../server/og-image";

async function loadCommunityIcon(
  db: ReturnType<typeof getDb>,
  iconUrl?: string,
) {
  const id = iconUrl?.match(/^\/api\/community-icons\/([^/]+)$/)?.[1];
  if (!id) return undefined;
  try {
    const response = await communityIconResponse(db, id, undefined, "avatar-160");
    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !contentType?.startsWith("image/")) return undefined;
    return {
      data: new Uint8Array(await response.arrayBuffer()),
      contentType,
    };
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/og/invite/$code")({
  server: {
    handlers: {
      GET: ({ params }) =>
        endpoint(async () => {
          const db = getDb();
          const invite = await invitePreview(db, params.code);
          const icon = await loadCommunityIcon(db, invite.community.iconUrl);
          const image = await renderInviteOpenGraphImage(invite, icon);
          return new Response(Uint8Array.from(image).buffer, {
            headers: {
              "Content-Type": "image/png",
              "Content-Length": String(image.byteLength),
              "Cache-Control":
                "public, max-age=300, stale-while-revalidate=86400",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }),
    },
  },
});
