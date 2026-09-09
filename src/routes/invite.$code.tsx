import { createFileRoute } from "@tanstack/react-router";
import { InvitePage } from "../components/app/discover-page";
import { getInvitePreview } from "../lib/invite-preview";

const siteOrigin = "https://drocsid.app";

function inviteDescription(name: string, description: string, members: number) {
  const communityDescription = description.replace(/\s+/g, " ").trim();
  const memberLabel = `${members.toLocaleString("en-US")} ${members === 1 ? "member" : "members"}`;
  const message = communityDescription
    ? `${communityDescription} · ${memberLabel}. Join ${name} on Drocsid.`
    : `${memberLabel}. You’re invited to join ${name} on Drocsid.`;
  return message.length > 190 ? `${message.slice(0, 189).trimEnd()}…` : message;
}

export const Route = createFileRoute("/invite/$code")({
  loader: ({ params }) => getInvitePreview({ data: { code: params.code } }),
  head: ({ loaderData, params }) => {
    const canonicalUrl = `${siteOrigin}/invite/${encodeURIComponent(params.code)}`;
    const imageUrl = `${siteOrigin}/api/og/invite/${encodeURIComponent(params.code)}`;
    const community = loaderData?.community;
    const title = community
      ? `Join ${community.name} — Drocsid`
      : "You’re invited — Drocsid";
    const description = community
      ? inviteDescription(
          community.name,
          community.description,
          community.members,
        )
      : "Open your community invitation on Drocsid.";
    const imageAlt = community
      ? `Invitation to join ${community.name} on Drocsid`
      : "A Drocsid community invitation";

    return {
      links: [{ rel: "canonical", href: canonicalUrl }],
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, noarchive" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Drocsid" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:image:secure_url", content: imageUrl },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: imageAlt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
        { name: "twitter:image:alt", content: imageAlt },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { code } = Route.useParams();
  return <InvitePage code={code} initialInvite={Route.useLoaderData()} />;
}
