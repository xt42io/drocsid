import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { getChannelCategories } from "../../lib/demo-data";
import {
  AppIcon,
  EmptyState,
  IconButton,
  PageHeading,
  PersonAvatar,
} from "./primitives";
export function CommunitySettings({ communityId }: { communityId: string }) {
  const { state, setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  const [tab, setTab] = useState("overview");
  const [name, setName] = useState(community?.name ?? "");
  const [description, setDescription] = useState(community?.description ?? "");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setName(community?.name ?? "");
    setDescription(community?.description ?? "");
  }, [community?.name, community?.description]);
  if (!community || !community.joined)
    return (
      <EmptyState
        icon="settings"
        title="This corner isn’t available."
        description="Head back to your communities to find your place."
      >
        <Link to="/app" className="a-button primary">
          Back to your corner
        </Link>
      </EmptyState>
    );
  return (
    <div className="a-page a-community-settings">
      <PageHeading
        eyebrow="TAKE CARE OF YOUR CORNER"
        title="A place that feels like yours."
        description={`A few things behind the scenes of ${community.name}.`}
      >
        <Link
          to="/app/community/$communityId/$channelId"
          params={{
            communityId,
            channelId: community.channels[0]?.id ?? "general",
          }}
          className="a-button secondary"
        >
          <AppIcon name="left" size={17} />
          Back to the conversation
        </Link>
      </PageHeading>
      <div className="a-tabs a-inbox-tabs">
        {["overview", "channels", "members"].map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="a-community-overview">
          <form
            className="a-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim().length < 2) {
                setError(
                  "Your community needs a name with at least 2 characters.",
                );
                return;
              }
              setState((previous) => ({
                ...previous,
                communities: previous.communities.map((c) =>
                  c.id === communityId
                    ? {
                        ...c,
                        name: name.trim(),
                        description: description.trim(),
                      }
                    : c,
                ),
              }));
              notify("Your corner is looking good. Changes saved.");
              setError("");
            }}
          >
            <div className="a-community-brand">
              <span className={`a-community-icon tone-${community.color}`}>
                <AppIcon name={community.icon} size={38} />
              </span>
              <div>
                <h2>{community.name}</h2>
                <p>Made of people, not algorithms.</p>
              </div>
            </div>
            <label>
              Community name
              <input
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              A little about this place
              <textarea
                value={description}
                maxLength={250}
                rows={4}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              Your corner’s color
              <select
                value={community.color}
                onChange={(event) =>
                  setState((previous) => ({
                    ...previous,
                    communities: previous.communities.map((c) =>
                      c.id === communityId
                        ? { ...c, color: event.target.value }
                        : c,
                    ),
                  }))
                }
              >
                {["peach", "green", "yellow", "purple", "blue"].map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="a-form-error">
                {error}
              </p>
            )}
            <button className="a-button primary" type="submit">
              Save changes <AppIcon name="check" size={17} />
            </button>
          </form>
          <aside className="a-community-settings-note">
            <AppIcon name="leaf" size={32} />
            <h3>
              Good communities
              <br />
              start small.
            </h3>
            <p>
              A clear name, a little context, and people who care. That’s a
              pretty good beginning.
            </p>
            <button
              className="a-button secondary full"
              onClick={() => setModal({ type: "invite", communityId })}
            >
              Invite your people <AppIcon name="userAdd" size={17} />
            </button>
            <div className="a-settings-divider" />
            <button
              className="a-text-link danger-text"
              onClick={() =>
                setModal({
                  type: "confirm",
                  title: `Leave ${community.name}?`,
                  description:
                    "This community will leave your sidebar. Its local messages stay in the preview, and you can rejoin from Discover.",
                  label: "Leave community",
                  action: () => {
                    setState((previous) => ({
                      ...previous,
                      communities: previous.communities.map((c) =>
                        c.id === communityId ? { ...c, joined: false } : c,
                      ),
                    }));
                    void navigate({ to: "/app/discover" });
                    notify("You’ve left this corner. The door is always open.");
                  },
                })
              }
            >
              Leave this community <AppIcon name="logout" size={16} />
            </button>
          </aside>
        </div>
      )}
      {tab === "channels" && (
        <>
          <div className="a-settings-section-bar">
            <div>
              <h2>A room for every conversation.</h2>
              <p>
                {community.channels.length} text channels ·{" "}
                {getChannelCategories(community).length} categories
              </p>
            </div>
            <div className="a-channel-settings-actions">
              <button
                className="a-button secondary"
                onClick={() =>
                  setModal({ type: "create-category", communityId })
                }
              >
                <AppIcon name="folder" size={17} />
                Create category
              </button>
              <button
                className="a-button primary"
                onClick={() =>
                  setModal({ type: "create-channel", communityId })
                }
              >
                <AppIcon name="plus" size={17} />
                Create channel
              </button>
            </div>
          </div>
          {getChannelCategories(community).map((group) => (
            <section
              className="a-managed-category"
              key={group}
              aria-label={group}
            >
              <header className="a-managed-category-header">
                <AppIcon name="folder" size={18} />
                <h3>{group}</h3>
                <IconButton
                  name="plus"
                  label={`Create channel in ${group}`}
                  onClick={() =>
                    setModal({ type: "create-channel", communityId, group })
                  }
                />
              </header>
              {!community.channels.some(
                (channel) => channel.group === group,
              ) && (
                <div className="a-managed-category-empty">
                  <p>No channels yet.</p>
                  <button
                    className="a-text-link"
                    onClick={() =>
                      setModal({ type: "create-channel", communityId, group })
                    }
                  >
                    Add a channel <AppIcon name="plus" size={15} />
                  </button>
                </div>
              )}
              <div className="a-managed-channels">
                {community.channels
                  .filter((channel) => channel.group === group)
                  .map((channel) => (
                    <div key={channel.id}>
                      <span className="a-channel-square">
                        <AppIcon name="hash" size={22} />
                      </span>
                      <span>
                        <strong>{channel.name}</strong>
                        <p>{channel.description}</p>
                      </span>
                      <Link
                        to="/app/community/$communityId/$channelId"
                        params={{ communityId, channelId: channel.id }}
                        className="a-icon-button"
                        aria-label={`Open ${channel.name}`}
                        title="Open channel"
                      >
                        <AppIcon name="external" size={18} />
                      </Link>
                      <IconButton
                        name="trash"
                        label={`Delete ${channel.name}`}
                        disabled={community.channels.length === 1}
                        onClick={() =>
                          setModal({
                            type: "confirm",
                            title: `Delete #${channel.name}?`,
                            description:
                              "This channel and its local messages will be removed from the preview. This can’t be undone.",
                            label: "Delete channel",
                            action: () => {
                              setState((previous) => ({
                                ...previous,
                                communities: previous.communities.map((c) =>
                                  c.id === communityId
                                    ? {
                                        ...c,
                                        channelCategories:
                                          getChannelCategories(c),
                                        channels: c.channels.filter(
                                          (ch) => ch.id !== channel.id,
                                        ),
                                      }
                                    : c,
                                ),
                                messages: previous.messages.filter(
                                  (m) =>
                                    m.conversation !==
                                    `${communityId}:${channel.id}`,
                                ),
                              }));
                              notify("Channel deleted.");
                            },
                          })
                        }
                      />
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </>
      )}
      {tab === "members" && (
        <>
          <div className="a-settings-section-bar">
            <div>
              <h2>The people who make this place.</h2>
              <p>Your sample community members.</p>
            </div>
            <button
              className="a-button primary"
              onClick={() => setModal({ type: "invite", communityId })}
            >
              Invite a friend <AppIcon name="userAdd" size={17} />
            </button>
          </div>
          <label className="a-search-field a-wide-search">
            <AppIcon name="search" size={18} />
            <input
              placeholder="Find a member"
              aria-label="Find a member"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {[state.profile, ...state.people]
            .filter(
              (person) =>
                !community.memberIds || community.memberIds.includes(person.id),
            )
            .filter((p) =>
              `${p.name} ${p.handle}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((person) => (
              <div className="a-community-member-row" key={person.id}>
                <PersonAvatar person={person} presence />
                <span>
                  <strong>{person.name}</strong>
                  <small>@{person.handle}</small>
                </span>
                <span className="a-role-tag">{person.role}</span>
                <IconButton
                  name="more"
                  label={`View ${person.name}'s profile`}
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                />
              </div>
            ))}
        </>
      )}
    </div>
  );
}
