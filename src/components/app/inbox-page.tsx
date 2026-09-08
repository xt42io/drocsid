import { CommunityIcon } from "./community-icon";
import { useState } from "react";
import { useApp } from "../../lib/app-state";
import {
  AppIcon,
  EmptyState,
  IconButton,
  PageHeading,
  PersonAvatar,
} from "./primitives";
import { ConversationLink } from "./conversation";

export function InboxPage() {
  const { state, setState, findPerson, notify } = useApp();
  const [tab, setTab] = useState("all");
  const activities = state.activities.filter(
    (a) => tab === "all" || (tab === "unread" ? !a.read : a.type === tab),
  );
  const unread = state.activities.filter((a) => !a.read).length;
  return (
    <div
      data-ui="a-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      <PageHeading
        title="You’re in the loop."
        description="A few things with your name on them."
      >
        <button
          data-ui="a-button secondary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
          disabled={unread === 0}
          onClick={() => {
            setState((previous) => ({
              ...previous,
              activities: previous.activities.map((a) => ({
                ...a,
                read: true,
              })),
            }));
            notify("All caught up. Take a breath.");
          }}
        >
          <AppIcon name="check" size={18} />
          Mark all as read
        </button>
      </PageHeading>
      <div
        data-ui="a-tabs a-inbox-tabs"
        className="flex gap-4.25 items-center min-w-0 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) mb-6.25 [&>button]:relative [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&>button]:min-h-11.25 [&>button]:bg-transparent [&>button]:pt-0 [&>button]:pb-3.25 [&>button]:px-0.75 [&>button]:text-(--a-muted) [&>button]:text-[12px] [&>button]:whitespace-nowrap [&>button[data-ui~=active]]:text-(--a-text) [&>button[data-ui~=active]]:font-semibold [&>button[data-ui~=active]::after]:[content:''] [&>button[data-ui~=active]::after]:absolute [&>button[data-ui~=active]::after]:-bottom-px [&>button[data-ui~=active]::after]:left-0 [&>button[data-ui~=active]::after]:right-0 [&>button[data-ui~=active]::after]:h-0.5 [&>button[data-ui~=active]::after]:bg-(--a-orange) [&>button>span]:bg-(--a-soft) [&>button>span]:text-(--a-muted) [&>button>span]:py-px [&>button>span]:px-1.25 [&>button>span]:rounded-sm [&>button>span]:text-[10px] max-[1250px]:gap-3 max-[1250px]:[&>button]:text-[11px] max-[760px]:gap-5.5 max-[760px]:[&>button]:text-[12px] max-[480px]:gap-4 max-[480px]:overflow-x-auto max-[480px]:scrollbar-none max-[480px]:[&>button]:text-[11px] max-[480px]:[&>button]:shrink-0 max-[480px]:[&>button>span]:text-[9px]"
        aria-label="Filter inbox"
      >
        {[
          { id: "all", label: "Everything" },
          { id: "unread", label: "Unread" },
          { id: "mention", label: "Mentions" },
          { id: "reply", label: "Replies" },
        ].map((item) => (
          <button
            key={item.id}
            data-ui={tab === item.id ? "active" : ""}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "unread" && unread > 0 && <span>{unread}</span>}
          </button>
        ))}
      </div>
      <div data-ui="a-inbox-list" className="">
        {activities.map((activity) => {
          const person = findPerson(activity.person);
          const community = state.communities.find(
            (c) => c.id === activity.community,
          );
          const target =
            activity.id === "a1" ? "g6" : activity.id === "a2" ? "t1" : "r1";
          return (
            <article
              key={activity.id}
              data-ui={`a-inbox-card ${activity.read ? "" : "unread"}`}
              className="flex gap-3.75 py-6.25 px-5 border border-solid border-(--a-border) bg-(--a-surface) rounded-[9px] mb-3.25 data-[ui~=unread]:border-[#d6dec4] data-[ui~=unread]:bg-[#f5f6ed] data-[ui~=unread]:shadow-[inset_3px_0_#eaa886] [[data-ui~=theme-dark]_&[data-ui~=unread]]:bg-(--a-soft) [[data-ui~=theme-dark]_&[data-ui~=unread]]:border-(--a-border) max-[760px]:py-5.25 max-[760px]:px-4 max-[760px]:gap-3 max-[760px]:*:data-[ui~=a-icon-button]:w-6 max-[480px]:py-4.5 max-[480px]:px-3 max-[480px]:gap-2.5 max-[480px]:[&>[data-ui~=a-avatar]_[data-ui~=avatar]]:text-[11px] max-[480px]:[&>[data-ui~=a-avatar]_[data-ui~=avatar]]:rounded-[9px] max-[480px]:[&>[data-ui~=a-avatar]_[data-ui~=avatar]]:size-7.5 max-[480px]:*:data-[ui~=a-icon-button]:w-5.5 max-[480px]:*:data-[ui~=a-icon-button]:h-6.25"
            >
              <PersonAvatar person={person} />
              <div
                data-ui="a-inbox-content"
                className="flex-1 min-w-0 [&>div]:flex [&>div]:items-center [&>div]:gap-1.5 [&>div]:flex-wrap [&>div]:text-[12px] [&>div>strong]:font-[650] [&>div>span]:text-(--a-muted) [&_time]:ml-auto [&_time]:text-[10px] [&_time]:text-(--a-faint) [&>p]:text-[14px] [&>p]:leading-[1.7] [&>p]:mt-3 [&>p]:mb-3.75 max-[760px]:[&>div]:text-[12px] max-[760px]:[&>p]:text-[13px] max-[760px]:[&_time]:text-[9px] max-[480px]:[&>div>span]:text-[11px] max-[480px]:[&_time]:ml-0 max-[480px]:[&_time]:text-[9px] max-[480px]:[&_p]:text-[13px]"
              >
                <div>
                  <strong>{person.name.split(" ")[0]}</strong>
                  <span>
                    {activity.type === "mention"
                      ? "mentioned you"
                      : "replied to a conversation"}
                  </span>
                  <time>{activity.time}</time>
                </div>
                <p>{activity.text}</p>
                <ConversationLink
                  conversation={`${activity.community}:${activity.channel}`}
                  messageId={target}
                  data-ui="a-inbox-location"
                  className="flex items-center gap-1.75 text-(--a-muted) text-[10px] flex-wrap [&>span:nth-child(2)]:text-(--a-faint) hover:text-(--a-green) max-[760px]:text-[9px] max-[760px]:gap-1.25 max-[480px]:leading-[1.8]"
                  onClick={() =>
                    setState((previous) => ({
                      ...previous,
                      activities: previous.activities.map((a) =>
                        a.id === activity.id ? { ...a, read: true } : a,
                      ),
                    }))
                  }
                >
                  <span
                    data-ui={`a-mini-community tone-${community?.color ?? "peach"}`}
                    className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] inline-flex items-center justify-center rounded-[7px] size-5.5"
                  >
                    <CommunityIcon
                      community={community ?? { icon: "sun" }}
                      size={15}
                    />
                  </span>
                  {community?.name}
                  <span>/</span>
                  <AppIcon name="hash" size={14} />
                  {activity.channel}
                  <AppIcon name="right" size={15} />
                </ConversationLink>
              </div>
              <IconButton
                name={activity.read ? "bell" : "check"}
                label={activity.read ? "Mark as unread" : "Mark as read"}
                onClick={() =>
                  setState((previous) => ({
                    ...previous,
                    activities: previous.activities.map((a) =>
                      a.id === activity.id ? { ...a, read: !a.read } : a,
                    ),
                  }))
                }
              />
            </article>
          );
        })}
      </div>
      {activities.length === 0 && (
        <EmptyState
          icon="inbox"
          title="A beautifully empty inbox."
          description="Nothing needs your attention right now. Go find a good conversation."
        />
      )}
      {activities.length > 0 && (
        <div
          data-ui="a-end-note"
          className="flex items-center justify-center gap-2.5 text-(--a-muted) text-[12px] py-10.75 px-3.75 max-[760px]:text-[11px] max-[480px]:text-[10px] max-[480px]:gap-2 max-[480px]:px-1"
        >
          <AppIcon name="leaf" size={20} />
          That’s everything for now. You haven’t missed a thing.
        </div>
      )}
    </div>
  );
}
export function SavedPage() {
  const { state, findPerson, updateMessage } = useApp();
  const [query, setQuery] = useState("");
  const saved = state.messages.filter(
    (m) => m.saved && m.text.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      data-ui="a-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      <PageHeading
        title="For a quieter moment."
        description="Good ideas, useful links, and words you want to come back to."
      />
      <label
        data-ui="a-search-field a-wide-search"
        className="flex items-center gap-2.25 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] min-h-10.75 py-0 px-3 text-(--a-muted) mb-6.5 max-w-150 [&_input]:w-full [&_input]:py-2.75 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:border-none [&_input]:border-[currentColor] [&_input]:rounded-none [&_input]:text-[12px] [&_input]:shadow-none! focus-within:border-[#b8c5a3] [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:[[data-ui~=workspace]_&_input]:text-[16px] max-[760px]:[[data-ui~=workspace]_&_input::placeholder]:text-[12px]"
      >
        <AppIcon name="search" size={18} />
        <input
          aria-label="Search saved messages"
          placeholder="Find something you saved"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div
        data-ui="a-list-caption"
        className="font-mono text-(--a-muted) text-[9px] tracking-[0.75px] mb-3.5"
      >
        SAVED MESSAGES — {saved.length}
      </div>
      <div
        data-ui="a-saved-grid"
        className="grid grid-cols-2 gap-5 max-[1050px]:grid-cols-[1fr]"
      >
        {saved.map((message) => (
          <article
            data-ui="a-saved-card"
            className="p-5.75 bg-(--a-surface) border border-solid border-(--a-border) rounded-[9px] [&>p]:whitespace-pre-wrap [&>p]:wrap-anywhere [&>p]:leading-[1.8] [&>p]:text-[14px] [&>p]:mt-5 [&>p]:mb-5.75 [&>p]:mx-0 [&>p]:max-h-82.5 [&>p]:overflow-auto **:data-[ui~=a-text-link]:text-[11px] max-[480px]:p-4.75 max-[480px]:[&>p]:text-[13px]"
            key={message.id}
          >
            <div
              data-ui="a-saved-meta"
              className="flex items-center gap-2.75 [&>div]:flex-1 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:block [&_small]:text-(--a-faint) [&_small]:text-[10px] [&_small]:mt-1"
            >
              <PersonAvatar person={findPerson(message.author)} />
              <div>
                <strong>{findPerson(message.author).name}</strong>
                <small>{message.time}</small>
              </div>
              <IconButton
                name="bookmark"
                label="Remove saved message"
                active
                onClick={() => updateMessage(message.id, { saved: false })}
              />
            </div>
            <p>{message.text}</p>
            <ConversationLink
              conversation={message.conversation}
              messageId={message.id}
              data-ui="a-text-link"
              className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
            >
              Back to the conversation <AppIcon name="right" size={16} />
            </ConversationLink>
          </article>
        ))}
      </div>
      {saved.length === 0 && (
        <EmptyState
          icon="bookmark"
          title={
            query
              ? "Not in this little collection."
              : "A place for the keepers."
          }
          description={
            query
              ? "Try another word or clear your search."
              : "Save a message from any conversation. It’ll be here when you need it."
          }
        />
      )}
    </div>
  );
}
