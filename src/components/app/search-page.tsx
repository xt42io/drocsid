import { CommunityIcon } from "./community-icon";
import { useDirectory } from "../../lib/use-directory";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { conversationLabel } from "../../lib/conversations";
import { AppIcon, EmptyState, PageHeading, PersonAvatar } from "./primitives";
import { ConversationLink } from "./conversation";
import { api } from "../../lib/api-client";
import type { Message } from "../../types/app";

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const { state, findPerson, setModal } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState("messages");
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  const q = query.trim().toLowerCase();
  const joined = state.communities.filter((c) => c.joined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    if (!q || tab !== "messages") {
      setMessages([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void api<{ messages: Message[] }>(
        `/api/messages?q=${encodeURIComponent(q)}`,
        undefined,
        controller.signal,
      )
        .then((result) => {
          setMessages(result.messages);
          setSearchError("");
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setSearchError(error.message || "Could not search messages.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, tab]);
  const directory = useDirectory(
    "people",
    q,
    undefined,
    undefined,
    tab === "people",
  );
  const people = directory.people ?? [];
  const channels = q
    ? joined
        .flatMap((c) =>
          c.channels.map((channel) => ({ community: c, channel })),
        )
        .filter((item) =>
          `${item.channel.name} ${item.channel.description}`
            .toLowerCase()
            .includes(q.replace(/^#/, "")),
        )
    : [];
  const tabs = [
    { id: "messages", label: "Messages", count: messages.length },
    { id: "people", label: "People", count: people.length },
    { id: "channels", label: "Channels", count: channels.length },
  ];
  return (
    <div
      data-ui="a-page a-search-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      <PageHeading
        eyebrow="THERE IT IS"
        title="Find that little something."
        description="A good thought, a familiar face, a conversation worth coming back to."
      />
      <form
        data-ui="a-global-search"
        className="flex items-center gap-3.5 border border-solid border-[#ccd6bb] rounded-[9px] py-2.25 pr-2.5 pl-4.5 bg-(--a-surface) text-(--a-green) mb-7 [&>input]:flex-1 [&>input]:h-8.75 [&>input]:p-0 [&>input]:border-0 [&>input]:border-none [&>input]:border-[currentColor] [&>input]:bg-transparent [&>input]:text-[15px] [&>input]:shadow-none! in-data-[ui~=theme-dark]:border-(--a-border)! max-[760px]:py-2 max-[760px]:pr-2.25 max-[760px]:pl-3.25 max-[760px]:gap-2.5 max-[760px]:[&_input]:text-[16px] max-[760px]:[&_input::placeholder]:text-[13px] max-[760px]:**:data-[ui~=a-button]:text-[11px]! max-[760px]:**:data-[ui~=a-button]:px-3 max-[480px]:[&>svg]:w-5 max-[480px]:[&>svg]:shrink-0 max-[480px]:[&>[data-ui~=a-button]>svg]:hidden max-[480px]:*:data-[ui~=a-button]:min-h-8.75 max-[480px]:*:data-[ui~=a-button]:px-2.75 max-[480px]:*:data-[ui~=a-button]:text-[10px]!"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({
            to: "/app/search",
            search: { q: query.trim() },
            replace: true,
          });
        }}
      >
        <AppIcon name="search" size={25} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your little corner…"
          aria-label="Search messages, people, and channels"
        />
        <button
          data-ui="a-button primary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
          type="submit"
        >
          Search <AppIcon name="right" size={18} />
        </button>
      </form>
      {!q ? (
        <div data-ui="a-search-start" className="pt-2.25">
          <span
            data-ui="a-eyebrow"
            className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
          >
            A FEW PLACES TO START
          </span>
          <div
            data-ui="a-search-suggestions"
            className="flex flex-wrap gap-2.75 mt-3.75 [&_button]:flex [&_button]:items-center [&_button]:gap-2.5 [&_button]:py-2.5 [&_button]:px-3.25 [&_button]:rounded-md [&_button]:bg-(--a-surface) [&_button]:text-(--a-muted) [&_button]:text-[12px] [&_button]:border! [&_button]:border-solid! [&_button]:border-(--a-border)! [&_button:hover]:bg-(--a-hover) [&_button>svg:last-child]:ml-3.75 max-[760px]:gap-2 max-[760px]:[&_button]:text-[11px] max-[480px]:[&_button]:py-2.25 max-[480px]:[&_button]:px-2.75 max-[480px]:[&_button]:text-[11px] max-[480px]:[&_button>svg:last-child]:ml-0"
          >
            {["coffee", "project", "#general", "Jamie"].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  void navigate({
                    to: "/app/search",
                    search: { q: term },
                    replace: true,
                  });
                }}
              >
                <AppIcon
                  name={term.startsWith("#") ? "hash" : "search"}
                  size={16}
                />
                {term}
                <AppIcon name="external" size={14} />
              </button>
            ))}
          </div>
          <EmptyState
            icon="search"
            title="Good things are in here."
            description="Search across your messages, people, and channels. Try a word you remember, a name, or #channel."
          />
        </div>
      ) : (
        <>
          <div
            data-ui="a-tabs a-search-tabs"
            className="flex gap-4.25 items-center min-w-0 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) mb-6 [&>button]:relative [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&>button]:min-h-11.25 [&>button]:bg-transparent [&>button]:pt-0 [&>button]:pb-3.25 [&>button]:px-0.75 [&>button]:text-(--a-muted) [&>button]:text-[12px] [&>button]:whitespace-nowrap [&>button[data-ui~=active]]:text-(--a-text) [&>button[data-ui~=active]]:font-semibold [&>button[data-ui~=active]::after]:[content:''] [&>button[data-ui~=active]::after]:absolute [&>button[data-ui~=active]::after]:-bottom-px [&>button[data-ui~=active]::after]:left-0 [&>button[data-ui~=active]::after]:right-0 [&>button[data-ui~=active]::after]:h-0.5 [&>button[data-ui~=active]::after]:bg-(--a-orange) [&>button>span]:bg-(--a-soft) [&>button>span]:text-(--a-muted) [&>button>span]:py-px [&>button>span]:px-1.25 [&>button>span]:rounded-sm [&>button>span]:text-[10px] max-[1250px]:gap-3 max-[1250px]:[&>button]:text-[11px] max-[760px]:gap-5.5 max-[760px]:[&>button]:text-[12px] max-[480px]:gap-4 max-[480px]:overflow-x-auto max-[480px]:scrollbar-none max-[480px]:[&>button]:text-[11px] max-[480px]:[&>button]:shrink-0 max-[480px]:[&>button>span]:text-[9px]"
            aria-label="Search result type"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-pressed={tab === item.id}
                data-ui={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
          </div>
          {(searchError || directory.error) && (
            <p role="alert">{searchError || directory.error}</p>
          )}
          {(searching || directory.loading) && <p role="status">Searching…</p>}
          <div
            data-ui="a-list-caption"
            className="font-mono text-(--a-muted) text-[9px] tracking-[0.75px] mb-3.5"
          >
            {tabs.find((t) => t.id === tab)?.count} RESULTS FOR “{query}”
          </div>
          {tab === "messages" && (
            <div data-ui="a-search-results" className="">
              {messages.map((message) => (
                <ConversationLink
                  key={message.id}
                  conversation={message.conversation}
                  messageId={message.id}
                  data-ui="a-search-result"
                  className="block border border-solid border-(--a-border) bg-(--a-surface) p-5 rounded-lg mb-3.25 hover:border-[#bbcaa7] hover:bg-(--a-soft) [[data-ui~=theme-dark]_&:hover]:border-[#626262]! max-[480px]:p-4"
                >
                  <span
                    data-ui="a-search-result-location"
                    className="flex items-center gap-2.5 pb-4.25 mb-4 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) text-(--a-faint) text-[10px] [&>svg]:ml-auto max-[480px]:text-[9px] max-[480px]:leading-[1.6]"
                  >
                    {conversationLabel(message.conversation, state)}
                    <AppIcon name="external" size={15} />
                  </span>
                  <span
                    data-ui="a-search-result-body"
                    className="flex [align-items:start] gap-3.25 [&>span:last-child]:flex-1 [&>span:last-child]:min-w-0 [&_strong]:flex [&_strong]:items-center [&_strong]:gap-3.75 [&_strong]:text-[12px] [&_strong]:font-semibold [&_strong]:mb-1.75 [&_time]:text-(--a-faint) [&_time]:text-[10px] [&_time]:font-normal [&>span:last-child>span]:text-[14px] [&>span:last-child>span]:leading-[1.8] [&>span:last-child>span]:whitespace-pre-wrap [&>span:last-child>span]:wrap-anywhere [&>span:last-child>span]:block max-[1050px]:[&>span:last-child>span]:text-[13px] max-[480px]:gap-2.5 max-[480px]:[&_strong]:text-[11px] max-[480px]:[&_strong]:gap-1.75 max-[480px]:[&_time]:text-[8px] max-[480px]:[&>span:last-child>span]:text-[12px]"
                  >
                    <PersonAvatar person={findPerson(message.author)} />
                    <span>
                      <strong>
                        {findPerson(message.author).name}
                        <time>{message.time}</time>
                      </strong>
                      <span>{message.text}</span>
                    </span>
                  </span>
                </ConversationLink>
              ))}
            </div>
          )}
          {tab === "people" && (
            <div data-ui="a-search-results" className="">
              {directory.hasMore && (
                <button
                  className="rounded-md border border-(--a-border) px-4 py-2 text-sm"
                  disabled={directory.loading}
                  onClick={directory.more}
                >
                  Load more people
                </button>
              )}
              {people.map((person) => (
                <button
                  data-ui="a-search-person"
                  className="flex items-center w-full gap-3.75 py-5 px-2.5 bg-transparent text-left [border-bottom-width:1px]! [border-bottom-style:solid]! border-b-(--a-border)! [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:min-w-0 [&_strong]:text-[14px] [&_strong]:font-semibold [&_small]:block [&_small]:text-(--a-muted) [&_small]:text-[11px] [&_small]:mt-1.25"
                  key={person.id}
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                >
                  <PersonAvatar person={person} presence />
                  <span>
                    <strong>{person.name}</strong>
                    <small>@{person.handle}</small>
                  </span>
                  <AppIcon name="right" size={17} />
                </button>
              ))}
            </div>
          )}
          {tab === "channels" && (
            <div data-ui="a-search-results" className="">
              {channels.map(({ community, channel }) => (
                <Link
                  to="/app/community/$communityId/$channelId"
                  params={{ communityId: community.id, channelId: channel.id }}
                  key={`${community.id}:${channel.id}`}
                  data-ui="a-search-channel"
                  className="flex items-center w-full gap-3.75 py-5 px-2.5 bg-transparent text-left [border-bottom-width:1px]! [border-bottom-style:solid]! border-b-(--a-border)! [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:min-w-0 [&_strong]:text-[14px] [&_strong]:font-semibold [&_strong_small]:font-normal [&_strong_small]:text-(--a-faint) [&_strong_small]:text-[10px] [&_strong_small]:ml-3.75 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:mt-1.75 max-[480px]:[&_strong]:block max-[480px]:[&_strong]:text-[13px] max-[480px]:[&_strong_small]:block max-[480px]:[&_strong_small]:mt-1.25 max-[480px]:[&_strong_small]:mb-0 max-[480px]:[&_strong_small]:mx-0 max-[480px]:[&_strong_small]:text-[9px] max-[480px]:[&_p]:text-[11px]"
                >
                  <span
                    data-ui={`a-community-icon tone-${community.color}`}
                    className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] hover:transform-[translateY(-2px)] hover:rounded-xl max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
                  >
                    <CommunityIcon community={community} size={24} />
                  </span>
                  <span>
                    <strong>
                      #{channel.name}
                      <small>{community.name}</small>
                    </strong>
                    <p>{channel.description}</p>
                  </span>
                  <AppIcon name="right" size={17} />
                </Link>
              ))}
            </div>
          )}
          {tabs.find((t) => t.id === tab)?.count === 0 && (
            <EmptyState
              icon="search"
              title="Not quite what we’re looking for."
              description="Try another word, a shorter phrase, or a different result type."
            />
          )}
        </>
      )}
    </div>
  );
}
