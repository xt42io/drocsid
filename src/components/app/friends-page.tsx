import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import {
  AppIcon,
  EmptyState,
  IconButton,
  PageHeading,
  PersonAvatar,
} from "./primitives";

export function FriendsPage() {
  const { state, setState, setModal, notify } = useApp();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const tabs = [
    {
      id: "all",
      label: "All friends",
      count: state.friends.filter((id) => !state.blocked.includes(id)).length,
    },
    {
      id: "online",
      label: "Around now",
      count: state.people.filter(
        (p) =>
          state.friends.includes(p.id) &&
          p.status === "online" &&
          !state.blocked.includes(p.id),
      ).length,
    },
    {
      id: "pending",
      label: "Pending",
      count: state.pending.length + state.outgoing.length,
    },
    { id: "blocked", label: "Blocked", count: state.blocked.length },
  ];
  const filtered = state.people.filter(
    (p) =>
      (tab === "blocked"
        ? state.blocked.includes(p.id)
        : tab === "pending"
          ? state.pending.includes(p.id) || state.outgoing.includes(p.id)
          : state.friends.includes(p.id) &&
            !state.blocked.includes(p.id) &&
            (tab !== "online" || p.status === "online")) &&
      `${p.name} ${p.handle}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="a-page">
      <PageHeading
        eyebrow="FAMILIAR FACES"
        title="Good company."
        description="Your people, just a little hello away."
      >
        <button
          className="a-button primary"
          onClick={() => setModal({ type: "add-friend" })}
        >
          <AppIcon name="userAdd" size={18} />
          Add a friend
        </button>
      </PageHeading>
      <div className="a-friends-banner">
        <div>
          <span className="a-eyebrow">THE BEST PART OF BEING HERE</span>
          <h2>People who just get it.</h2>
          <p>
            The late-night ideas. The everyday updates. The comfortable
            silences.
          </p>
        </div>
        <div className="a-friend-stack" aria-hidden="true">
          {state.people.slice(0, 4).map((person) => (
            <PersonAvatar key={person.id} person={person} large />
          ))}
          <span>✳</span>
        </div>
      </div>
      <div className="a-list-controls">
        <div className="a-tabs" aria-label="Filter friends">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.count > 0 && <span>{item.count}</span>}
            </button>
          ))}
        </div>
        <label className="a-search-field small">
          <AppIcon name="search" size={17} />
          <input
            placeholder="Find a friend"
            aria-label="Find a friend"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="a-list-caption">
        {tab === "online"
          ? "AROUND FOR A CONVERSATION"
          : tab === "pending"
            ? "A HELLO IN THE MAKING"
            : tab === "blocked"
              ? "YOUR BOUNDARIES, YOUR CALL"
              : "YOUR PEOPLE"}{" "}
        — {filtered.length}
      </div>
      <div className="a-friends-list">
        {filtered.map((person) => (
          <div className="a-friend-row" key={person.id}>
            <button
              className="a-person-summary"
              onClick={() => setModal({ type: "profile", personId: person.id })}
            >
              <PersonAvatar person={person} presence />
              <span>
                <strong>
                  {person.name}
                  <small>@{person.handle}</small>
                </strong>
                <span>
                  {tab === "pending"
                    ? state.pending.includes(person.id)
                      ? "Incoming friend request"
                      : "Outgoing request · local preview"
                    : person.activity}
                </span>
              </span>
            </button>
            <div className="a-friend-actions">
              {tab === "pending" ? (
                state.pending.includes(person.id) ? (
                  <>
                    <IconButton
                      name="check"
                      label={`Accept ${person.name}'s request`}
                      onClick={() => {
                        setState((previous) => ({
                          ...previous,
                          friends: [
                            ...new Set([...previous.friends, person.id]),
                          ],
                          outgoing: previous.outgoing.filter(
                            (id) => id !== person.id,
                          ),
                          pending: previous.pending.filter(
                            (id) => id !== person.id,
                          ),
                        }));
                        notify(
                          `${person.name.split(" ")[0]} is now in your friends.`,
                        );
                      }}
                    />
                    <IconButton
                      name="close"
                      label={`Decline ${person.name}'s request`}
                      onClick={() => {
                        setState((previous) => ({
                          ...previous,
                          pending: previous.pending.filter(
                            (id) => id !== person.id,
                          ),
                        }));
                        notify("Request removed.");
                      }}
                    />
                  </>
                ) : (
                  <button
                    className="a-button secondary small"
                    onClick={() => {
                      setState((previous) => ({
                        ...previous,
                        outgoing: previous.outgoing.filter(
                          (id) => id !== person.id,
                        ),
                      }));
                      notify("Preview request canceled.");
                    }}
                  >
                    Cancel request
                  </button>
                )
              ) : tab === "blocked" ? (
                <button
                  className="a-button secondary small"
                  onClick={() => {
                    setState((previous) => ({
                      ...previous,
                      blocked: previous.blocked.filter(
                        (id) => id !== person.id,
                      ),
                    }));
                    notify("Person unblocked.");
                  }}
                >
                  Unblock
                </button>
              ) : (
                <>
                  <Link
                    to="/app/dm/$personId"
                    params={{ personId: person.id }}
                    className="a-icon-button"
                    title={`Message ${person.name}`}
                    aria-label={`Message ${person.name}`}
                  >
                    <AppIcon name="message" size={19} />
                  </Link>
                  <IconButton
                    name="more"
                    label={`View ${person.name}'s profile and options`}
                    onClick={() =>
                      setModal({ type: "profile", personId: person.id })
                    }
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          icon={tab === "pending" ? "checkCircle" : "people"}
          title={
            query
              ? "No one by that name."
              : tab === "pending"
                ? "All caught up."
                : tab === "blocked"
                  ? "Nothing to see here."
                  : "A quiet moment."
          }
          description={
            query
              ? "Try a first name or username."
              : tab === "pending"
                ? "No friend requests waiting. A new hello is never far away."
                : tab === "blocked"
                  ? "People you block will appear here."
                  : "Your friends will be back around. Leave them a little message."
          }
        />
      )}
    </div>
  );
}
