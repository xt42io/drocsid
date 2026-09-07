import { CommunityIcon } from "./community-icon";
import { useDirectory } from "../../lib/use-directory";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { AppIcon, EmptyState, PageHeading } from "./primitives";

export function DiscoverPage() {
  const { state, joinCommunity, setModal } = useApp();
  const navigate = useNavigate();
  const [category, setCategory] = useState("All corners");
  const [query, setQuery] = useState("");
  const categories = [
    "All corners",
    "Design & making",
    "Technology",
    "Life & hobbies",
    "Books & culture",
    "Gaming",
  ];
  const directory = useDirectory(
    "communities",
    query,
    category === "All corners" ? undefined : category,
  );
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
          Load more communities
        </button>
      )}
      <PageHeading
        eyebrow="THE INTERNET CAN STILL FEEL SMALL"
        title="Find your kind of people."
        description="A place for every wonderfully specific interest."
      />
      <div
        data-ui="a-discover-hero"
        className="flex items-center justify-between gap-8.75 py-8.5 px-9.5 mb-7.5 bg-[#eceee4] border border-solid border-[#dde2d0] rounded-[10px] overflow-hidden in-data-[ui~=theme-dark]:bg-(--a-soft) in-data-[ui~=theme-dark]:border-(--a-border) [&>div:first-child]:flex-1 [&>div:first-child]:max-w-120 [&_h2]:text-[34px] [&_h2]:leading-[1.12] [&_h2]:font-medium [&_h2]:text-(--a-green) [&_h2]:mt-3.25 [&_h2]:tracking-[-1.35px] [&_p]:text-[13px] [&_p]:leading-[1.8] [&_p]:text-(--a-muted) [&_p]:mt-3.5 [&_p]:mb-5 **:data-[ui~=a-search-field]:border-[#d6dec7] **:data-[ui~=a-search-field]:bg-[#fafbf5] **:data-[ui~=a-search-field]:max-w-91.25 [[data-ui~=theme-dark]_&_[data-ui~=a-search-field]]:bg-(--a-surface) [[data-ui~=theme-dark]_&_[data-ui~=a-search-field]]:border-(--a-border) max-[1250px]:p-7 max-[1250px]:gap-3.75 max-[1250px]:[&_h2]:text-[30px] max-[1050px]:p-6.25 max-[1050px]:[&_h2]:text-[27px] max-[1050px]:[&_p]:text-[12px] max-[1050px]:**:data-[ui~=a-search-field]:min-w-55 max-[760px]:[&_h2]:text-[31px] max-[760px]:[&_p]:text-[13px] max-[760px]:p-7 max-[760px]:gap-5 max-[760px]:**:data-[ui~=a-search-field]:min-w-0 max-[480px]:py-6.5 max-[480px]:px-5.75 max-[480px]:[&_h2]:text-[33px] max-[480px]:[&_p]:text-[13px] max-[480px]:[&_[data-ui~=a-search-field]_input]:text-[12px] max-[480px]:[&>div:first-child]:max-w-none max-[480px]:[&>div:first-child]:w-full"
      >
        <div>
          <span
            data-ui="a-eyebrow"
            className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
          >
            OPEN DOORS. GOOD COMPANY.
          </span>
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
          className="relative shrink-0 w-63.75 h-57 [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:absolute [&>span]:w-20 [&>span]:h-20.5 [&>span]:rounded-[23px] [&>span]:shadow-[0_7px_16px_#3b541011] [&>span:nth-child(1)]:left-2.75 [&>span:nth-child(1)]:top-4.5 [&>span:nth-child(1)]:transform-[rotate(-15deg)] [&>span:nth-child(2)]:right-3.75 [&>span:nth-child(2)]:top-0 [&>span:nth-child(2)]:transform-[rotate(12deg)] [&>span:nth-child(3)]:left-10 [&>span:nth-child(3)]:bottom-6.75 [&>span:nth-child(3)]:w-25.25 [&>span:nth-child(3)]:h-26.75 [&>span:nth-child(3)]:transform-[rotate(8deg)] [&>span:nth-child(3)]:z-1 [&>span:nth-child(4)]:right-0.5 [&>span:nth-child(4)]:bottom-9.75 [&>span:nth-child(4)]:transform-[rotate(-8deg)] [&>i]:absolute [&>i]:-bottom-2.5 [&>i]:w-full [&>i]:text-center [&>i]:font-mono [&>i]:tracking-[1px] [&>i]:text-[7px] [&>i]:not-italic [&>i]:text-(--a-faint) max-[1250px]:w-56.25 max-[1250px]:transform-[scale(0.9)] max-[1250px]:-mr-3 max-[1050px]:w-41.25 max-[1050px]:transform-[scale(0.7)] max-[1050px]:-ml-3.75 max-[1050px]:-mr-5.5 max-[1050px]:origin-[left_center] max-[1050px]:[&>span:nth-child(2)]:-right-9.25 max-[1050px]:[&>span:nth-child(4)]:-right-12.5 max-[1050px]:[&>i]:w-57.5 max-[760px]:transform-[scale(0.8)] max-[760px]:mr-2.5 max-[480px]:hidden"
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
          <i>THERE’S ROOM FOR YOU HERE.</i>
        </div>
      </div>
      <div
        data-ui="a-category-filters"
        className="flex gap-2 flex-wrap mb-8.75 [&_button]:border! [&_button]:border-solid! [&_button]:border-(--a-border)! [&_button]:rounded-[20px] [&_button]:text-(--a-muted) [&_button]:bg-transparent [&_button]:py-2.25 [&_button]:px-3.5 [&_button]:text-[11px] [&_button[data-ui~=active]]:bg-(--a-text) [&_button[data-ui~=active]]:text-(--a-bg) [&_button[data-ui~=active]]:border-(--a-text)! [&_button:hover:not([data-ui~=active])]:bg-(--a-hover) max-[1050px]:[&_button]:text-[10px] max-[1050px]:[&_button]:py-2 max-[1050px]:[&_button]:px-3 max-[760px]:gap-1.75 max-[760px]:[&_button]:text-[11px] max-[480px]:mb-7 max-[480px]:[&_button]:text-[10px]"
        aria-label="Filter communities"
      >
        {categories.map((item) => (
          <button
            key={item}
            data-ui={category === item ? "active" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        data-ui="a-discover-heading"
        className="flex items-center justify-between gap-5 mb-4.75 [&_h2]:text-[21px] [&>span]:text-(--a-faint) [&>span]:text-[10px] max-[1050px]:[align-items:start] max-[1050px]:[&>span]:text-[9px] max-[1050px]:[&>span]:max-w-22.5 max-[1050px]:[&>span]:text-right max-[760px]:[&_h2]:text-[23px] max-[760px]:[&>span]:max-w-none max-[480px]:items-center max-[480px]:gap-3 max-[480px]:[&_h2]:text-[20px] max-[480px]:[&>span]:max-w-22 max-[480px]:[&>span]:text-[8px]"
      >
        <h2>
          {query
            ? "A few corners to explore."
            : category === "All corners"
              ? "Good places to start."
              : category}
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
              <span>{community.category.toUpperCase()}</span>
              <CommunityIcon community={community} size={74} />
              <i>
                {community.joined ? (
                  <>
                    <AppIcon name="check" size={13} />
                    YOUR CORNER
                  </>
                ) : (
                  "OPEN DOOR"
                )}
              </i>
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
                  onClick={async () => {
                    const joined = await joinCommunity(community.id);
                    if (!joined) return;
                    void navigate({
                      to: "/app/community/$communityId/$channelId",
                      params: {
                        communityId: community.id,
                        channelId:
                          joined.channels.find((c) => c.id === "general")?.id ??
                          joined.channels[0]?.id ??
                          "general",
                      },
                    });
                  }}
                >
                  {community.joined ? "Open" : "Join"}
                  <AppIcon name="right" size={15} />
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
export function InvitePage({ communityId }: { communityId: string }) {
  const { state, joinCommunity } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  const directory = useDirectory("communities", "", undefined, communityId);
  if (!community && directory.loading)
    return <p role="status">Loading community…</p>;
  if (!community)
    return (
      <div
        data-ui="a-invitation-page"
        className="min-h-full py-7.5 px-5 flex items-center justify-center flex-col gap-6.25 bg-(--a-sidebar) max-[480px]:py-6.25 max-[480px]:px-4.5"
      >
        <EmptyState
          icon="mail"
          title="This invitation wandered off."
          description="This community invitation is no longer available."
        >
          <Link
            to="/app/discover"
            data-ui="a-button primary"
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
          >
            Explore communities
          </Link>
        </EmptyState>
      </div>
    );
  return (
    <div
      data-ui="a-invitation-page"
      className="min-h-full py-7.5 px-5 flex items-center justify-center flex-col gap-6.25 bg-(--a-sidebar) max-[480px]:py-6.25 max-[480px]:px-4.5"
    >
      <Link
        to="/"
        data-ui="a-invitation-brand"
        className="text-[28px] font-[750] tracking-[-1.5px] [&>span]:text-(--a-orange)"
      >
        drocsid<span>.</span>
      </Link>
      <div
        data-ui="a-invitation-card"
        className="max-w-110 w-full bg-(--a-bg) border border-solid border-(--a-border) rounded-[13px] overflow-hidden"
      >
        <div
          data-ui={`a-invitation-cover tone-${community.color}`}
          className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] flex items-center justify-center flex-col gap-5.75 p-7.5 [&>svg]:transform-[rotate(-10deg)] [&>span]:font-mono [&>span]:text-[8px] [&>span]:tracking-[0.8px]"
        >
          <CommunityIcon community={community} size={79} />
          <span>A LITTLE CORNER. A LOT OF POSSIBILITY.</span>
        </div>
        <div
          data-ui="a-invitation-body"
          className="text-center p-7.25 **:data-[ui~=a-eyebrow]:text-[8px] **:data-[ui~=a-eyebrow]:tracking-[0.75px] [&_h1]:text-[39px] [&_h1]:mt-3.75 [&_h1]:mb-4.25 [&_h2]:text-[19px] [&_h2]:mb-2.75 [&>p:not([data-ui~=a-form-footnote])]:text-(--a-muted) [&>p:not([data-ui~=a-form-footnote])]:text-[13px] [&>p:not([data-ui~=a-form-footnote])]:leading-[1.8] **:data-[ui~=a-form-footnote]:text-[10px]! **:data-[ui~=a-form-footnote]:mt-4 max-[480px]:py-6.75 max-[480px]:px-5.5 max-[480px]:[&_h1]:text-[38px] max-[480px]:**:data-[ui~=a-eyebrow]:text-[7px] max-[480px]:[&_h2]:text-[20px] max-[480px]:[&>p:not([data-ui~=a-form-footnote])]:text-[13px]"
        >
          <span
            data-ui="a-eyebrow"
            className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
          >
            THERE’S A SPOT WITH YOUR NAME ON IT
          </span>
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
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
            onClick={async () => {
              const joined = await joinCommunity(community.id);
              if (!joined) return;
              void navigate({
                to: "/app/community/$communityId/$channelId",
                params: {
                  communityId: community.id,
                  channelId: joined.channels.some((c) => c.id === "general")
                    ? "general"
                    : (joined.channels[0]?.id ?? "general"),
                },
              });
            }}
          >
            {community.joined ? "Come on back in" : "Make yourself at home"}
            <AppIcon name="right" size={18} />
          </button>
          <p
            data-ui="a-form-footnote"
            className="text-(--a-muted) leading-[1.8] text-[11px]!"
          >
            Join this community to see its channels and meet the people here.
          </p>
        </div>
      </div>
      <Link
        to="/app/discover"
        data-ui="a-text-link"
        className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
      >
        Or look around a little first <AppIcon name="external" size={16} />
      </Link>
    </div>
  );
}
