import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { conversationLabel } from "../../lib/demo-data";
import { AppIcon, EmptyState, PageHeading, PersonAvatar } from "./primitives";
import { ConversationLink } from "./conversation";

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const { state, findPerson, setModal } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState("messages");
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  const q = query.trim().toLowerCase();
  const joined = state.communities.filter((c) => c.joined);
  const messages = q
    ? state.messages.filter((message) => {
        const [c, channel] = message.conversation.split(":");
        if (c !== "dm" && !joined.some((community) => community.id === c))
          return false;
        if (c === "dm" && state.blocked.includes(channel)) return false;
        return q.startsWith("#")
          ? message.conversation.split(":")[1].includes(q.slice(1))
          : `${message.text} ${findPerson(message.author).name}`
              .toLowerCase()
              .includes(q);
      })
    : [];
  const people = q
    ? state.people.filter((p) =>
        `${p.name} ${p.handle}`.toLowerCase().includes(q.replace(/^@/, "")),
      )
    : [];
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
    <div className="a-page a-search-page">
      <PageHeading
        eyebrow="THERE IT IS"
        title="Find that little something."
        description="A good thought, a familiar face, a conversation worth coming back to."
      />
      <form
        className="a-global-search"
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
        <button className="a-button primary" type="submit">
          Search <AppIcon name="right" size={18} />
        </button>
      </form>
      {!q ? (
        <div className="a-search-start">
          <span className="a-eyebrow">A FEW PLACES TO START</span>
          <div className="a-search-suggestions">
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
          <div className="a-tabs a-search-tabs" aria-label="Search result type">
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-pressed={tab === item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="a-list-caption">
            {tabs.find((t) => t.id === tab)?.count} RESULTS FOR “{query}”
          </div>
          {tab === "messages" && (
            <div className="a-search-results">
              {messages.map((message) => (
                <ConversationLink
                  key={message.id}
                  conversation={message.conversation}
                  messageId={message.id}
                  className="a-search-result"
                >
                  <span className="a-search-result-location">
                    {conversationLabel(message.conversation, state)}
                    <AppIcon name="external" size={15} />
                  </span>
                  <span className="a-search-result-body">
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
            <div className="a-search-results">
              {people.map((person) => (
                <button
                  className="a-search-person"
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
            <div className="a-search-results">
              {channels.map(({ community, channel }) => (
                <Link
                  to="/app/community/$communityId/$channelId"
                  params={{ communityId: community.id, channelId: channel.id }}
                  key={`${community.id}:${channel.id}`}
                  className="a-search-channel"
                >
                  <span className={`a-community-icon tone-${community.color}`}>
                    <AppIcon name={community.icon} size={24} />
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
