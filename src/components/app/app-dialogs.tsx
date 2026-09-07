import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { getChannelCategories, starterChannels } from "../../lib/demo-data";
import type { Community, Person } from "../../lib/demo-data";
import { AppIcon, Dialog, EmptyState, PersonAvatar } from "./primitives";

export function AppDialogs() {
  const app = useApp();
  if (!app.modal) return null;
  const modal = app.modal;
  if (modal.type === "create-community") return <CreateCommunity />;
  if (modal.type === "create-category")
    return <CreateCategory communityId={modal.communityId} />;
  if (modal.type === "create-channel")
    return (
      <CreateChannel
        communityId={modal.communityId}
        initialGroup={modal.group}
      />
    );
  if (modal.type === "new-message" || modal.type === "add-friend")
    return <PeoplePicker mode={modal.type} />;
  if (modal.type === "invite")
    return <Invite communityId={modal.communityId} />;
  if (modal.type === "profile") return <Profile personId={modal.personId} />;
  if (modal.type === "confirm")
    return (
      <Dialog
        title={modal.title}
        description={modal.description}
        onClose={() => app.setModal(null)}
      >
        <div className="a-dialog-actions">
          <button
            className="a-button secondary"
            onClick={() => app.setModal(null)}
          >
            Keep it
          </button>
          <button
            className="a-button danger"
            onClick={() => {
              modal.action();
              app.setModal(null);
            }}
          >
            {modal.label}
          </button>
        </div>
      </Dialog>
    );
  return (
    <Dialog
      title="Make yourself at home."
      description="A little guide to your corner of the internet."
      onClose={() => app.setModal(null)}
    >
      <div className="a-help-list">
        <div>
          <AppIcon name="message" />
          <span>
            <strong>Start a conversation</strong>
            <p>
              Pick a channel or a friend. Type a message and press Enter. Shift
              + Enter adds a new line.
            </p>
          </span>
        </div>
        <div>
          <AppIcon name="search" />
          <span>
            <strong>Find the good stuff</strong>
            <p>Press ⌘ K or Ctrl K to search messages, people, and channels.</p>
          </span>
        </div>
        <div>
          <AppIcon name="reply" />
          <span>
            <strong>Give a thought some room</strong>
            <p>
              Use Reply on a message to open its thread. React, pin, or save the
              messages you love.
            </p>
          </span>
        </div>
        <div>
          <AppIcon name="info" />
          <span>
            <strong>A home for your community</strong>
            <p>
              Messages are shared with your conversation. Private channels and
              files are only available to people with access.
            </p>
          </span>
        </div>
      </div>
      <Link
        to="/app/settings"
        search={{ section: "data" }}
        onClick={() => app.setModal(null)}
        className="a-text-link"
      >
        Manage your account <AppIcon name="right" size={16} />
      </Link>
    </Dialog>
  );
}
function CreateCommunity() {
  const { setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<Community["icon"]>("sun");
  const [error, setError] = useState("");
  const choices: Community["icon"][] = [
    "sun",
    "leaf",
    "coffee",
    "book",
    "game",
    "brush",
    "music",
    "code",
  ];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Give your corner a name with at least 2 characters.");
      return;
    }
    const id = crypto.randomUUID();
    const saved = await setState((previous) => ({
      ...previous,
      communities: [
        ...previous.communities,
        {
          id,
          name: name.trim(),
          description:
            description.trim() ||
            "A new corner of the internet. Make yourself at home.",
          icon,
          color: "peach",
          category: "Your community",
          members: 1,
          memberIds: ["you"],
          joined: true,
          channels: starterChannels().slice(0, 3),
        },
      ],
    }));
    if (!saved) return;
    setModal(null);
    notify("Your corner is ready. Make it your own.");
    void navigate({
      to: "/app/community/$communityId/$channelId",
      params: { communityId: id, channelId: "general" },
    });
  }
  return (
    <Dialog
      title="A place for your people."
      description="Your book club, side project, or very specific obsession. Give it a home."
      onClose={() => setModal(null)}
    >
      <form className="a-form" onSubmit={submit}>
        <div className="a-create-icon-preview">
          <span className="a-community-icon tone-peach">
            <AppIcon name={icon} size={34} />
          </span>
        </div>
        <div className="a-icon-options" aria-label="Community icon">
          {choices.map((choice) => (
            <button
              type="button"
              aria-label={`${choice} icon`}
              aria-pressed={icon === choice}
              className={icon === choice ? "selected" : ""}
              key={choice}
              onClick={() => setIcon(choice)}
            >
              <AppIcon name={choice} size={20} />
            </button>
          ))}
        </div>
        <label>
          Your community’s name
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="The next good thing"
            maxLength={40}
            required
          />
        </label>
        <label>
          A little about this place <span className="a-optional">optional</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What brings your people together?"
            maxLength={250}
            rows={3}
          />
        </label>
        {error && (
          <p className="a-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="a-form-footnote">
          Start small. You can always add more channels later.
        </div>
        <button type="submit" className="a-button primary full">
          Create your corner <AppIcon name="right" size={17} />
        </button>
      </form>
    </Dialog>
  );
}
function CreateCategory({ communityId }: { communityId: string }) {
  const { state, setState, setModal, notify } = useApp();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const community = state.communities.find((c) => c.id === communityId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setError("Give your category a name.");
      return;
    }
    if (!community) return;
    if (
      getChannelCategories(community).some(
        (category) => category.toLowerCase() === normalized.toLowerCase(),
      )
    ) {
      setError("There’s already a category with that name.");
      return;
    }
    const saved = await setState((previous) => ({
      ...previous,
      communities: previous.communities.map((c) =>
        c.id === communityId
          ? {
              ...c,
              channelCategories: [...getChannelCategories(c), normalized],
            }
          : c,
      ),
    }));
    if (!saved) return;
    setModal(null);
    notify(`${normalized} is ready. Add a channel to get started.`);
  }
  return (
    <Dialog
      title="Create a category"
      description={`Keep related channels together in ${community?.name ?? "your community"}.`}
      onClose={() => setModal(null)}
    >
      <form className="a-form" onSubmit={submit}>
        <label>
          Category name
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Projects, hobbies, or something else"
            maxLength={40}
            required
            aria-invalid={!!error}
            aria-describedby={error ? "category-error" : undefined}
          />
        </label>
        {error && (
          <p id="category-error" className="a-form-error" role="alert">
            {error}
          </p>
        )}
        <p className="a-form-footnote">
          You can add channels after creating your category.
        </p>
        <button type="submit" className="a-button primary full">
          Create category <AppIcon name="plus" size={18} />
        </button>
      </form>
    </Dialog>
  );
}
function CreateChannel({
  communityId,
  initialGroup,
}: {
  communityId: string;
  initialGroup?: string;
}) {
  const { state, setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  const categories = community ? getChannelCategories(community) : [];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState(
    initialGroup ??
      (categories.includes("THE COMMON ROOM")
        ? "THE COMMON ROOM"
        : (categories[0] ?? "")),
  );
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    if (!normalized) {
      setError("Use letters or numbers for your channel name.");
      return;
    }
    if (community?.channels.some((c) => c.name === normalized)) {
      setError("There’s already a channel with that name.");
      return;
    }
    const id = `${normalized}-${crypto.randomUUID().slice(0, 6)}`;
    const saved = await setState((previous) => ({
      ...previous,
      communities: previous.communities.map((c) =>
        c.id === communityId
          ? {
              ...c,
              channels: [
                ...c.channels,
                {
                  id,
                  name: normalized,
                  description:
                    description.trim() ||
                    "A little room for a new conversation.",
                  group,
                },
              ],
            }
          : c,
      ),
    }));
    if (!saved) return;
    setModal(null);
    notify(`#${normalized} is ready for its first hello.`);
    void navigate({
      to: "/app/community/$communityId/$channelId",
      params: { communityId, channelId: id },
    });
  }
  return (
    <Dialog
      title="Make room for a conversation."
      description={`A new text channel in ${community?.name ?? "your community"}.`}
      onClose={() => setModal(null)}
    >
      <form className="a-form" onSubmit={submit}>
        <div className="a-channel-type">
          <AppIcon name="hash" size={25} />
          <span>
            <strong>Text channel</strong>
            <small>A place to chat, share, and stay in the loop.</small>
          </span>
          <AppIcon name="checkCircle" size={20} />
        </div>
        <label>
          Channel name
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="a-very-good-topic"
            maxLength={40}
            required
          />
        </label>
        <label>
          What’s it about?
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Give people a little context"
            maxLength={140}
          />
        </label>
        <label>
          Category
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {error && (
          <p className="a-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="a-button primary full" type="submit">
          Create channel <AppIcon name="plus" size={18} />
        </button>
      </form>
    </Dialog>
  );
}
function PeoplePicker({ mode }: { mode: "new-message" | "add-friend" }) {
  const { state, setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = state.people.filter(
    (p) =>
      !state.blocked.includes(p.id) &&
      `${p.name} ${p.handle}`
        .toLowerCase()
        .includes(query.replace(/^@/, "").toLowerCase()),
  );
  return (
    <Dialog
      title={
        mode === "new-message"
          ? "Say a little hello."
          : "Good company starts here."
      }
      description={
        mode === "new-message"
          ? "Start a direct conversation with someone you know."
          : "Find a person by name or username."
      }
      onClose={() => setModal(null)}
    >
      <label className="a-search-field">
        <AppIcon name="search" size={19} />
        <input
          autoFocus
          aria-label="Find a person"
          placeholder="A name or @username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="a-picker-list">
        {results.map((person) => (
          <div className="a-picker-person" key={person.id}>
            <PersonAvatar person={person} presence />
            <span>
              <strong>{person.name}</strong>
              <small>@{person.handle}</small>
            </span>
            {mode === "new-message" ? (
              <button
                className="a-button secondary small"
                onClick={() => {
                  setModal(null);
                  void navigate({
                    to: "/app/dm/$personId",
                    params: { personId: person.id },
                  });
                }}
              >
                Message
              </button>
            ) : (
              <button
                className="a-button secondary small"
                disabled={
                  state.friends.includes(person.id) ||
                  state.outgoing.includes(person.id)
                }
                onClick={() => {
                  if (state.pending.includes(person.id)) {
                    setState((previous) => ({
                      ...previous,
                      friends: [...new Set([...previous.friends, person.id])],
                      pending: previous.pending.filter(
                        (id) => id !== person.id,
                      ),
                      outgoing: previous.outgoing.filter(
                        (id) => id !== person.id,
                      ),
                    }));
                    notify(
                      `${person.name.split(" ")[0]} is now in your friends.`,
                    );
                    return;
                  }
                  setState((previous) => ({
                    ...previous,
                    outgoing: [...previous.outgoing, person.id],
                  }));
                  notify(
                    "Friend request sent.",
                  );
                }}
              >
                {state.friends.includes(person.id)
                  ? "Friends"
                  : state.outgoing.includes(person.id)
                    ? "Requested"
                    : state.pending.includes(person.id)
                      ? "Accept request"
                      : "Add friend"}
              </button>
            )}
          </div>
        ))}
        {results.length === 0 && (
          <EmptyState
            icon="search"
            title="No familiar faces yet."
            description="Try a different name or username."
          />
        )}
      </div>
    </Dialog>
  );
}
function Invite({ communityId }: { communityId: string }) {
  const { state, setModal, notify } = useApp();
  const [copied, setCopied] = useState(false);
  const community = state.communities.find((c) => c.id === communityId);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const url = `${origin}/app/invite/${communityId}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Preview invitation link copied.");
    } catch {
      notify("Copy isn’t available here. Select the link to copy it manually.");
    }
  }
  return (
    <Dialog
      title="Good things are better together."
      description={`Make a little room in ${community?.name ?? "your community"}.`}
      onClose={() => setModal(null)}
    >
      <div className="a-invite-preview">
        <span
          className={`a-community-icon tone-${community?.color ?? "peach"}`}
        >
          <AppIcon name={community?.icon ?? "sun"} size={30} />
        </span>
        <h3>{community?.name}</h3>
        <p>There’s a spot with your name on it.</p>
      </div>
      <label className="a-field-label" htmlFor="invite-link">
        Your invite link
      </label>
      <div className="a-copy-field">
        <input
          id="invite-link"
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
        />
        <button className="a-button primary" onClick={copy}>
          <AppIcon name={copied ? "check" : "copy"} size={17} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="a-form-footnote">
        Anyone with this link can join this public community.
      </p>
      <Link
        to="/app/invite/$communityId"
        params={{ communityId }}
        className="a-text-link"
        onClick={() => setModal(null)}
      >
        Preview the invitation <AppIcon name="external" size={15} />
      </Link>
    </Dialog>
  );
}
function Profile({ personId }: { personId: string }) {
  const { state, setState, setModal, findPerson, notify } = useApp();
  const person = findPerson(personId);
  const own = personId === "you";
  const blocked = state.blocked.includes(personId);
  return (
    <Dialog
      title={own ? "Your little introduction." : "A familiar face."}
      onClose={() => setModal(null)}
    >
      <div className={`a-profile-cover tone-${person.color}`}>
        <AppIcon name="sun" size={56} />
        <span>COME AS YOU ARE.</span>
      </div>
      <div className="a-profile-details">
        <PersonAvatar person={person} large presence />
        <h3>{person.name}</h3>
        <span>
          @{person.handle} <span className="a-role-tag">{person.role}</span>
        </span>
        <p>{person.bio || "Sometimes a hello says enough."}</p>
        <div className="a-profile-meta">
          <span className="a-eyebrow">AROUND HERE</span>
          <span>
            <i className={`a-status-dot ${person.status}`} />
            {person.status === "online"
              ? "Online"
              : person.status === "away"
                ? "Taking a break"
                : "Offline"}{" "}
            · {person.activity}
          </span>
        </div>
        {own ? (
          <>
            <label className="a-field-label" htmlFor="presence">
              How are you showing up?
            </label>
            <select
              id="presence"
              value={state.profile.status}
              onChange={(event) =>
                setState((previous) => ({
                  ...previous,
                  profile: {
                    ...previous.profile,
                    status: event.target.value as Person["status"],
                  },
                }))
              }
            >
              <option value="online">Online — happy to be here</option>
              <option value="away">Away — taking a little break</option>
              <option value="offline">Invisible — keeping it quiet</option>
            </select>
            <Link
              to="/app/settings"
              search={{ section: "profile" }}
              onClick={() => setModal(null)}
              className="a-button primary full"
            >
              Edit your profile <AppIcon name="edit" size={17} />
            </Link>
          </>
        ) : (
          <div className="a-profile-buttons">
            {!blocked && (
              <Link
                to="/app/dm/$personId"
                params={{ personId }}
                onClick={() => setModal(null)}
                className="a-button primary"
              >
                <AppIcon name="message" size={17} /> Send a message
              </Link>
            )}
            <button
              className="a-button secondary"
              onClick={() => {
                setState((previous) => ({
                  ...previous,
                  blocked: blocked
                    ? previous.blocked.filter((id) => id !== personId)
                    : [...previous.blocked, personId],
                }));
                notify(
                  blocked
                    ? `${person.name.split(" ")[0]} unblocked.`
                    : `${person.name.split(" ")[0]} blocked.`,
                );
                setModal(null);
              }}
            >
              {blocked ? "Unblock" : "Block"}
            </button>
          </div>
        )}
        {!own && state.friends.includes(personId) && (
          <button
            className="a-text-link a-remove-friend"
            onClick={() =>
              setModal({
                type: "confirm",
                title: `Remove ${person.name.split(" ")[0]} from your friends?`,
                description:
                  "Your existing conversation will stay. You can add them again whenever you like.",
                label: "Remove friend",
                action: () => {
                  setState((previous) => ({
                    ...previous,
                    friends: previous.friends.filter((id) => id !== personId),
                  }));
                  notify("Removed from your friends.");
                },
              })
            }
          >
            <AppIcon name="userRemove" size={15} /> Remove from friends
          </button>
        )}
      </div>
    </Dialog>
  );
}
