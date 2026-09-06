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
    <div className="a-page">
      <PageHeading
        eyebrow="WHILE YOU WERE AWAY"
        title="You’re in the loop."
        description="A few things with your name on them."
      >
        <button
          className="a-button secondary"
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
      <div className="a-tabs a-inbox-tabs" aria-label="Filter inbox">
        {[
          { id: "all", label: "Everything" },
          { id: "unread", label: "Unread" },
          { id: "mention", label: "Mentions" },
          { id: "reply", label: "Replies" },
        ].map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "unread" && unread > 0 && <span>{unread}</span>}
          </button>
        ))}
      </div>
      <div className="a-inbox-list">
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
              className={`a-inbox-card ${activity.read ? "" : "unread"}`}
            >
              <PersonAvatar person={person} />
              <div className="a-inbox-content">
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
                  className="a-inbox-location"
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
                    className={`a-mini-community tone-${community?.color ?? "peach"}`}
                  >
                    <AppIcon name={community?.icon ?? "sun"} size={15} />
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
        <div className="a-end-note">
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
    <div className="a-page">
      <PageHeading
        eyebrow="THE THINGS WORTH KEEPING"
        title="For a quieter moment."
        description="Good ideas, useful links, and words you want to come back to."
      />
      <label className="a-search-field a-wide-search">
        <AppIcon name="search" size={18} />
        <input
          aria-label="Search saved messages"
          placeholder="Find something you saved"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="a-list-caption">SAVED MESSAGES — {saved.length}</div>
      <div className="a-saved-grid">
        {saved.map((message) => (
          <article className="a-saved-card" key={message.id}>
            <div className="a-saved-meta">
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
              className="a-text-link"
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
