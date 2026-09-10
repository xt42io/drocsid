import { CommunityIcon } from "./community-icon";
import { useDirectory } from "../../lib/use-directory";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { AppIcon, EmptyState, PageHeading } from "./primitives";
import { ButtonLoader } from "../button-loader";
import { Logo } from "../ui";
import { usePostHog } from "@posthog/react";
import { api, ApiError } from "../../lib/api-client";
import type { AcceptedInvite, InvitePreview } from "../../types/invites";

export function DiscoverPage() {
  const { state, joinCommunity, setModal } = useApp();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const directory = useDirectory("communities", query);
  const communities = (directory.communities ?? []).map(
    (community) =>
      state.communities.find((c) => c.id === community.id) ?? community,
  );
  return (
    <div
      data-ui="a-page a-discover-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      {directory.loading && <p role="status">Loading communities…</p>}
      {directory.error && <p role="alert">{directory.error}</p>}
      {directory.hasMore && (
        <button
          className="rounded-md border border-(--a-border) px-4 py-2 text-sm"
          disabled={directory.loading}
          onClick={directory.more}
        >
          {directory.loading ? (
            <ButtonLoader label="Loading more communities" />
          ) : (
            "Load more communities"
          )}
        </button>
      )}
      <PageHeading
        title="Find your kind of people."
        description="A place for every wonderfully specific interest."
      />
      <div
        data-ui="a-discover-hero"
        className="flex items-center justify-between gap-8.75 py-8.5 px-9.5 mb-7.5 bg-[#eceee4] border border-solid border-[#dde2d0] rounded-[10px] overflow-hidden in-data-[ui~=theme-dark]:bg-(--a-soft) in-data-[ui~=theme-dark]:border-(--a-border) [&>div:first-child]:flex-1 [&>div:first-child]:max-w-120 [&_h2]:text-[34px] [&_h2]:leading-[1.12] [&_h2]:font-medium [&_h2]:text-(--a-green) [&_h2]:tracking-[-1.35px] [&_p]:text-[13px] [&_p]:leading-[1.8] [&_p]:text-(--a-muted) [&_p]:mt-3.5 [&_p]:mb-5 **:data-[ui~=a-search-field]:border-[#d6dec7] **:data-[ui~=a-search-field]:bg-[#fafbf5] **:data-[ui~=a-search-field]:max-w-91.25 [[data-ui~=theme-dark]_&_[data-ui~=a-search-field]]:bg-(--a-surface) [[data-ui~=theme-dark]_&_[data-ui~=a-search-field]]:border-(--a-border) max-[1250px]:p-7 max-[1250px]:gap-3.75 max-[1250px]:[&_h2]:text-[30px] max-[1050px]:p-6.25 max-[1050px]:[&_h2]:text-[27px] max-[1050px]:[&_p]:text-[12px] max-[1050px]:**:data-[ui~=a-search-field]:min-w-55 max-[760px]:[&_h2]:text-[31px] max-[760px]:[&_p]:text-[13px] max-[760px]:p-7 max-[760px]:gap-5 max-[760px]:**:data-[ui~=a-search-field]:min-w-0 max-[480px]:py-6.5 max-[480px]:px-5.75 max-[480px]:[&_h2]:text-[33px] max-[480px]:[&_p]:text-[13px] max-[480px]:[&_[data-ui~=a-search-field]_input]:text-[12px] max-[480px]:[&>div:first-child]:max-w-none max-[480px]:[&>div:first-child]:w-full"
      >
        <div>
          <h2>
            Somewhere in here,
            <br />
            there’s a corner for you.
          </h2>
          <p>
            You don’t have to have it all figured out.
            <br />
            Just bring a little curiosity.
          </p>
          <label
            data-ui="a-search-field"
            className="flex items-center gap-2.25 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] min-h-10.75 py-0 px-3 text-(--a-muted) [&_input]:w-full [&_input]:py-2.75 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:border-none [&_input]:border-[currentColor] [&_input]:rounded-none [&_input]:text-[12px] [&_input]:shadow-none! focus-within:border-[#b8c5a3] [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:[[data-ui~=workspace]_&_input]:text-[16px] max-[760px]:[[data-ui~=workspace]_&_input::placeholder]:text-[12px]"
          >
            <AppIcon name="search" size={19} />
            <input
              aria-label="Search communities"
              placeholder="Find your next favorite corner"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div
          data-ui="a-discover-symbols"
          className="relative shrink-0 w-63.75 h-57 [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:absolute [&>span]:w-20 [&>span]:h-20.5 [&>span]:rounded-[23px] [&>span]:shadow-[0_7px_16px_#3b541011] [&>span:nth-child(1)]:left-2.75 [&>span:nth-child(1)]:top-4.5 [&>span:nth-child(1)]:transform-[rotate(-15deg)] [&>span:nth-child(2)]:right-3.75 [&>span:nth-child(2)]:top-0 [&>span:nth-child(2)]:transform-[rotate(12deg)] [&>span:nth-child(3)]:left-10 [&>span:nth-child(3)]:bottom-6.75 [&>span:nth-child(3)]:w-25.25 [&>span:nth-child(3)]:h-26.75 [&>span:nth-child(3)]:transform-[rotate(8deg)] [&>span:nth-child(3)]:z-1 [&>span:nth-child(4)]:right-0.5 [&>span:nth-child(4)]:bottom-9.75 [&>span:nth-child(4)]:transform-[rotate(-8deg)] max-[1250px]:w-56.25 max-[1250px]:transform-[scale(0.9)] max-[1250px]:-mr-3 max-[1050px]:w-41.25 max-[1050px]:transform-[scale(0.7)] max-[1050px]:-ml-3.75 max-[1050px]:-mr-5.5 max-[1050px]:origin-[left_center] max-[1050px]:[&>span:nth-child(2)]:-right-9.25 max-[1050px]:[&>span:nth-child(4)]:-right-12.5 max-[760px]:transform-[scale(0.8)] max-[760px]:mr-2.5 max-[480px]:hidden"
          aria-hidden="true"
        >
          <span data-ui="tone-purple" className="bg-[#e3dced] text-[#867296]">
            <AppIcon name="book" size={43} />
          </span>
          <span data-ui="tone-green" className="bg-[#d4dfbd] text-[#6b7d47]">
            <AppIcon name="leaf" size={49} />
          </span>
          <span data-ui="tone-peach" className="bg-[#f2bc95] text-[#885130]">
            <AppIcon name="sun" size={61} />
          </span>
          <span data-ui="tone-yellow" className="bg-[#eee1bb] text-[#9b8249]">
            <AppIcon name="coffee" size={40} />
          </span>
        </div>
      </div>
      <div
        data-ui="a-discover-heading"
        className="flex items-center justify-between gap-5 mb-4.75 [&_h2]:text-[21px] [&>span]:text-(--a-faint) [&>span]:text-[10px] max-[1050px]:[align-items:start] max-[1050px]:[&>span]:text-[9px] max-[1050px]:[&>span]:max-w-22.5 max-[1050px]:[&>span]:text-right max-[760px]:[&_h2]:text-[23px] max-[760px]:[&>span]:max-w-none max-[480px]:items-center max-[480px]:gap-3 max-[480px]:[&_h2]:text-[20px] max-[480px]:[&>span]:max-w-22 max-[480px]:[&>span]:text-[8px]"
      >
        <h2>
          {query ? "A few corners to explore." : "Good places to start."}
        </h2>
        <span>
          {communities.length}{" "}
          {communities.length === 1 ? "community" : "communities"}
          directory
        </span>
      </div>
      <div
        data-ui="a-community-grid"
        className="grid grid-cols-3 gap-5 min-[1600px]:gap-6.5 max-[1250px]:gap-4 max-[1250px]:grid-cols-2 max-[760px]:gap-4 max-[480px]:grid-cols-[1fr] max-[480px]:gap-5.75"
      >
        {communities.map((community) => (
          <article
            data-ui="a-community-card"
            className="overflow-hidden flex flex-col border border-solid border-(--a-border) rounded-[10px] bg-(--a-surface)"
            key={community.id}
          >
            <div
              data-ui={`a-community-card-cover tone-${community.color}`}
              className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] h-39.25 flex items-center justify-center relative overflow-hidden [&>svg]:transform-[rotate(-13deg)] [&>svg]:opacity-67 [&>span]:absolute [&>span]:left-3.75 [&>span]:top-3.25 [&>span]:font-mono [&>span]:text-[7px] [&>span]:tracking-[0.6px] [&>span]:opacity-75 [&>i]:flex [&>i]:items-center [&>i]:gap-1 [&>i]:absolute [&>i]:right-2.75 [&>i]:bottom-2.75 [&>i]:text-[7px] [&>i]:not-italic [&>i]:font-mono [&>i]:tracking-[0.5px] [&>i]:bg-[#fff9] [&>i]:rounded-sm [&>i]:py-1.25 [&>i]:px-1.75 min-[1600px]:h-43.75 max-[480px]:h-39 max-[480px]:[&>span]:text-[8px] max-[480px]:[&>span]:left-5 max-[480px]:[&>span]:top-4.25 max-[480px]:[&>i]:text-[8px] max-[480px]:[&>i]:right-4 max-[480px]:[&>i]:bottom-4"
            >
              {community.category.toLowerCase() !== "your community" && (
                <span>{community.category.toUpperCase()}</span>
              )}
              <CommunityIcon community={community} size={74} cover />
              {!community.joined && <i>OPEN DOOR</i>}
            </div>
            <div
              data-ui="a-community-card-body"
              className="flex flex-col flex-1 pt-5.25 pb-4 px-4.25 [&_h3]:text-[16px] [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.8] [&_p]:mt-2.5 [&_p]:mb-5.75 [&_p]:mx-0 [&_p]:flex-1 max-[1050px]:py-4.5 max-[1050px]:px-3.5 max-[1050px]:[&_h3]:text-[15px] max-[1050px]:[&_p]:text-[11px] max-[760px]:[&_h3]:text-[16px] max-[760px]:[&_p]:text-[12px] max-[480px]:p-5.5 max-[480px]:[&_h3]:text-[19px] max-[480px]:[&_p]:text-[14px]"
            >
              <h3>{community.name}</h3>
              <p>{community.description}</p>
              <div
                data-ui="a-community-card-footer"
                className="flex items-center justify-between gap-2.5 [&>span]:flex [&>span]:items-center [&>span]:gap-1.25 [&>span]:text-[9px] [&>span]:text-(--a-faint) **:data-[ui~=a-button]:py-1.5 **:data-[ui~=a-button]:px-2.5 **:data-[ui~=a-button]:text-[10px]! max-[1050px]:gap-1.75 max-[1050px]:[&>span]:text-[8px] max-[760px]:[&>span]:text-[9px] max-[480px]:[&>span]:text-[10px] max-[480px]:**:data-[ui~=a-button]:text-[11px]! max-[480px]:**:data-[ui~=a-button]:py-2 max-[480px]:**:data-[ui~=a-button]:px-3.5"
              >
                <span>
                  <i
                    data-ui="a-status-dot online"
                    className="data-[ui~=online]:bg-[#2ee68b] inline-block rounded-full shrink-0 size-1.5"
                  />
                  {community.members.toLocaleString()} kind humans
                </span>
                <button
                  data-ui={`a-button ${community.joined ? "secondary" : "primary"} small`}
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  disabled={joiningCommunity !== null}
                  onClick={async () => {
                    setJoiningCommunity(community.id);
                    try {
                      const joined = await joinCommunity(community.id);
                      if (!joined) return;
                      posthog.capture("community_joined", {
                        community_id: community.id,
                        community_category: community.category,
                        member_count: community.members,
                        source: "discover",
                      });
                      void navigate({
                        to: "/app/community/$communityId/$channelId",
                        params: {
                          communityId: community.id,
                          channelId:
                            joined.channels.find((c) => c.id === "general")
                              ?.id ??
                            joined.channels[0]?.id ??
                            "general",
                        },
                      });
                    } finally {
                      setJoiningCommunity(null);
                    }
                  }}
                >
                  {joiningCommunity === community.id ? (
                    <ButtonLoader
                      label={
                        community.joined
                          ? "Opening community"
                          : "Joining community"
                      }
                    />
                  ) : (
                    <>
                      {community.joined ? "Open" : "Join"}
                      <AppIcon name="right" size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {communities.length === 0 && (
        <EmptyState
          icon="search"
          title="A corner we haven’t found yet."
          description="Try another search. Or make a little space of your own."
        >
          <button
            data-ui="a-button primary"
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
            onClick={() => setModal({ type: "create-community" })}
          >
            Create a community
          </button>
        </EmptyState>
      )}
      <div
        data-ui="a-create-own-banner"
        className="flex items-center justify-between gap-7.5 [border-top-width:1px] [border-top-style:solid] border-t-(--a-border) mt-10.75 pt-7.5 [&_h3]:text-[18px] [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] [&_p]:mt-1.5 max-[760px]:gap-5 max-[760px]:[&_h3]:text-[16px] max-[480px]:flex-col max-[480px]:[align-items:start] max-[480px]:mt-7.5 max-[480px]:[&_h3]:text-[18px] max-[480px]:[&_p]:text-[13px]"
      >
        <div>
          <h3>Your kind of place doesn’t exist yet?</h3>
          <p>That’s a pretty good reason to make it.</p>
        </div>
        <button
          data-ui="a-button secondary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
          onClick={() => setModal({ type: "create-community" })}
        >
          Start your own corner <AppIcon name="plus" size={17} />
        </button>
      </div>
    </div>
  );
}
export function InvitePage({
  code,
  initialInvite,
}: {
  code: string;
  initialInvite: InvitePreview | null;
}) {
  const invite = initialInvite;
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  if (!invite)
    return (
      <div
        data-ui="a-invitation-page"
        className="min-h-svh py-7.5 px-5 flex items-center justify-center flex-col gap-6.25 bg-[#f2f1ec] max-[480px]:py-6.25 max-[480px]:px-4.5"
      >
        <Logo />
        <EmptyState
          icon="mail"
          title="This invitation wandered off."
          description={error || "This community invitation is no longer available."}
        >
          <Link
            to="/sign-in"
            data-ui="a-button primary"
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
          >
            Go to Drocsid
          </Link>
        </EmptyState>
      </div>
    );
  const community = invite.community;
  return (
    <div
      data-ui="a-invitation-page"
      className="relative isolate min-h-svh overflow-hidden bg-[#f2f1ec] px-5 py-12 flex items-center justify-center flex-col gap-7 max-[480px]:py-7 max-[480px]:px-4.5"
    >
      <Logo />
      <div
        data-ui="a-invitation-card"
        className="max-w-121 w-full overflow-hidden rounded-[24px] border border-solid border-[#d9d8d0] bg-(--a-bg)"
      >
        <div
          data-ui={`a-invitation-cover tone-${community.color}`}
          className="relative data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] flex min-h-46 items-center justify-center p-8 [&>svg]:transform-[rotate(-10deg)]"
        >
          <span className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-[10px] font-semibold text-current backdrop-blur-sm">
            <AppIcon name="mail" size={15} /> Community invitation
          </span>
          <CommunityIcon community={community} size={92} cover />
        </div>
        <div
          data-ui="a-invitation-body"
          className="text-center px-8 pt-8 pb-7 [&_h1]:text-[43px] [&_h1]:leading-none [&_h1]:tracking-[-2px] [&_h1]:mb-5 [&_h2]:text-[21px] [&_h2]:mb-2.75 [&>p:not([data-ui~=a-form-footnote])]:text-(--a-muted) [&>p:not([data-ui~=a-form-footnote])]:text-[13px] [&>p:not([data-ui~=a-form-footnote])]:leading-[1.8] **:data-[ui~=a-form-footnote]:text-[10px]! **:data-[ui~=a-form-footnote]:mt-4 max-[480px]:py-6.75 max-[480px]:px-5.5 max-[480px]:[&_h1]:text-[38px] max-[480px]:[&_h2]:text-[20px] max-[480px]:[&>p:not([data-ui~=a-form-footnote])]:text-[13px]"
        >
          <h1>You’re invited.</h1>
          <h2>{community.name}</h2>
          <p>{community.description}</p>
          <span
            data-ui="a-invitation-members"
            className="flex justify-center items-center gap-1.5 text-(--a-muted) text-[10px] mt-4.75 mb-6 mx-0 max-[480px]:text-[9px]"
          >
            <i
              data-ui="a-status-dot online"
              className="data-[ui~=online]:bg-[#2ee68b] inline-block rounded-full shrink-0 size-1.5"
            />
            {community.members} kind humans. Room for one more.
          </span>
          <button
            data-ui="a-button primary full"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2.25 rounded-lg border border-transparent bg-[#f3653f] px-4 py-3 text-[13px] leading-[1.4] font-semibold whitespace-nowrap text-[#3e2118] transition-[background,transform] hover:-translate-y-0.5 hover:bg-[#ed724d] active:translate-y-0 disabled:cursor-wait disabled:opacity-70 motion-reduce:hover:translate-y-0"
            disabled={joining}
            onClick={async () => {
              setJoining(true);
              setError("");
              try {
                const accepted = await api<AcceptedInvite>(
                  `/api/invites/${encodeURIComponent(code)}`,
                  {},
                );
                posthog.capture("community_joined", {
                  community_id: accepted.communityId,
                  member_count: community.members,
                  source: "invite",
                });
                void navigate({
                  to: "/app/community/$communityId/$channelId",
                  params: {
                    communityId: accepted.communityId,
                    channelId: accepted.channelId,
                  },
                });
              } catch (cause) {
                if (cause instanceof ApiError && cause.status === 401) {
                  void navigate({
                    to: "/sign-in",
                    search: { next: `/invite/${code}` },
                  });
                  return;
                }
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not accept this invitation.",
                );
                setJoining(false);
              }
            }}
          >
            {joining ? (
              <ButtonLoader label="Joining community" />
            ) : (
              <>
                Make yourself at home <AppIcon name="right" size={18} />
              </>
            )}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-[11px]! text-[#ff776d]!">
              {error}
            </p>
          )}
          <p
            data-ui="a-form-footnote"
            className="text-(--a-muted) leading-[1.8] text-[11px]!"
          >
            Join this community to see its channels and meet the people here. By
            joining, you agree to the <Link to="/terms">Terms</Link> and
            {" "}<Link to="/acceptable-use">Acceptable Use Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
