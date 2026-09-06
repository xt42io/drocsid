import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import type { Message, Community, Person } from "../../lib/demo-data";
import { personName } from "../../lib/demo-data";
import {
  AppIcon,
  Dialog,
  EmptyState,
  IconButton,
  PersonAvatar,
} from "./primitives";

const emojis = [
  "🧡",
  "🎉",
  "👋",
  "✨",
  "😂",
  "🌱",
  "☕",
  "🤝",
  "👀",
  "💡",
  "🙌",
  "👍",
];
export function ConversationLink({
  conversation,
  messageId,
  children,
  className,
  onClick,
}: {
  conversation: string;
  messageId?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const [first, second] = conversation.split(":");
  return first === "dm" ? (
    <Link
      to="/app/dm/$personId"
      params={{ personId: second }}
      search={{ message: messageId }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  ) : (
    <Link
      to="/app/community/$communityId/$channelId"
      params={{ communityId: first, channelId: second }}
      search={{ message: messageId }}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
export function Conversation({
  communityId,
  channelId,
  personId,
  messageId,
}: {
  communityId?: string;
  channelId?: string;
  personId?: string;
  messageId?: string;
}) {
  const { state, setState, setModal, findPerson, notify } = useApp();
  const community = state.communities.find((c) => c.id === communityId);
  const channel = community?.channels.find((c) => c.id === channelId);
  const person = personId
    ? state.people.find((p) => p.id === personId)
    : undefined;
  const conversation = personId
    ? `dm:${personId}`
    : `${communityId}:${channelId}`;
  const allMessages = state.messages.filter(
    (m) => m.conversation === conversation,
  );
  const mainMessages = allMessages.filter((m) => !m.threadOf);
  const [panel, setPanel] = useState<"members" | "pins" | "thread" | null>(
    null,
  );
  const [thread, setThread] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastConversation = useRef("");
  const lastTarget = useRef("");
  const selected = allMessages.find((m) => m.id === messageId);
  const blocked = !!personId && state.blocked.includes(personId);
  const muted = state.muted.includes(conversation);
  useEffect(() => {
    if (lastConversation.current !== conversation) {
      setPanel(personId || window.innerWidth <= 1050 ? null : "members");
      setThread(null);
      lastConversation.current = conversation;
    }
    const targetChanged =
      lastTarget.current !== `${conversation}:${messageId ?? ""}`;
    if (!messageId || selected)
      lastTarget.current = `${conversation}:${messageId ?? ""}`;
    if (targetChanged && selected?.threadOf) {
      setThread(selected.threadOf);
      setPanel("thread");
    }
    const frame = requestAnimationFrame(() => {
      if (targetChanged && messageId)
        document
          .getElementById(
            `${selected?.threadOf ? "thread-message" : "message"}-${messageId}`,
          )
          ?.scrollIntoView({ block: "center" });
      else if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    conversation,
    mainMessages.length,
    personId,
    messageId,
    selected?.id,
    selected?.threadOf,
  ]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1050px)");
    const resize = () => {
      if (media.matches) setPanel(null);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  if (
    (!personId && (!community || !channel || !community.joined)) ||
    (personId && !person)
  )
    return (
      <EmptyState
        icon="hash"
        title="This room is a little quiet."
        description="That conversation isn’t available in your communities."
      >
        <Link to="/app/discover" className="a-button primary">
          Find a community <AppIcon name="right" size={17} />
        </Link>
      </EmptyState>
    );
  const title = person?.name ?? channel!.name;
  function openThread(id: string) {
    setThread(id);
    setPanel("thread");
  }
  return (
    <div className="a-conversation-page">
      <header className="a-conversation-header">
        <div className="a-conversation-title">
          {person ? (
            <button
              className="a-avatar-button"
              onClick={() => setModal({ type: "profile", personId: person.id })}
              aria-label={`View ${person.name}'s profile`}
            >
              <PersonAvatar person={person} presence />
            </button>
          ) : (
            <span className="a-header-hash">
              <AppIcon name="hash" size={25} />
            </span>
          )}
          <div>
            <h1>{title}</h1>
            {person ? (
              <span className="a-dm-presence">
                <i className={`a-status-dot ${person.status}`} />
                {person.status === "online"
                  ? "Around for a conversation"
                  : person.activity}
              </span>
            ) : (
              <button
                className="a-topic-button"
                title="Edit channel topic"
                onClick={() => setEditingTopic(true)}
              >
                {channel!.description}
              </button>
            )}
          </div>
        </div>
        <div className="a-conversation-actions">
          <IconButton
            name={muted ? "muted" : "bell"}
            label={muted ? "Unmute conversation" : "Mute conversation"}
            active={muted}
            onClick={() => {
              setState((previous) => ({
                ...previous,
                muted: muted
                  ? previous.muted.filter((key) => key !== conversation)
                  : [...previous.muted, conversation],
              }));
              notify(
                muted
                  ? "Conversation unmuted."
                  : "A little quiet. Conversation muted.",
              );
            }}
          />
          <IconButton
            name="pin"
            label="Pinned messages"
            active={panel === "pins"}
            onClick={() => setPanel(panel === "pins" ? null : "pins")}
          />
          <IconButton
            name={person ? "info" : "people"}
            label={person ? "View profile" : "Toggle member list"}
            active={panel === "members"}
            onClick={() =>
              person
                ? setModal({ type: "profile", personId: person.id })
                : setPanel(panel === "members" ? null : "members")
            }
          />
          <Link
            className="a-icon-button"
            to="/app/search"
            search={{
              q: person ? person.name.split(" ")[0] : `#${channel!.name}`,
            }}
            title="Search conversation"
            aria-label="Search conversation"
          >
            <AppIcon name="search" size={19} />
          </Link>
        </div>
      </header>
      <div className="a-conversation-body">
        <div className="a-message-column">
          <div className="a-message-scroll" ref={scrollRef}>
            {person ? (
              <div className="a-dm-intro">
                <PersonAvatar person={person} large />
                <h2>{person.name}</h2>
                <p>
                  The beginning of your conversation with{" "}
                  <strong>@{person.handle}</strong>.
                </p>
                <button
                  className="a-button secondary small"
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                >
                  View profile
                </button>
              </div>
            ) : (
              <div className="a-channel-intro">
                <span>
                  <AppIcon
                    name={channelId === "welcome" ? "sun" : "hash"}
                    size={29}
                  />
                </span>
                <div>
                  <h2>
                    {channelId === "welcome"
                      ? "You’re in good company."
                      : `Welcome to #${channel!.name}.`}
                  </h2>
                  <p>{channel!.description}</p>
                </div>
              </div>
            )}
            {mainMessages.length > 0 && (
              <div className="a-date-divider">
                <span>THE CONVERSATION SO FAR</span>
              </div>
            )}
            {mainMessages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                highlighted={message.id === messageId}
                onThread={openThread}
              />
            ))}
            {mainMessages.length === 0 && (
              <div className="a-first-message">
                <AppIcon name="message" size={23} />
                <p>
                  Good conversations start somewhere.
                  <br />
                  <strong>Be the first to say hello.</strong>
                </p>
              </div>
            )}
          </div>
          {blocked ? (
            <div className="a-blocked-composer">
              <AppIcon name="shield" size={21} />
              <span>
                You’ve blocked {person?.name.split(" ")[0]}. You can unblock
                them to chat.
              </span>
              <button
                className="a-button secondary small"
                onClick={() =>
                  setState((previous) => ({
                    ...previous,
                    blocked: previous.blocked.filter((id) => id !== personId),
                  }))
                }
              >
                Unblock
              </button>
            </div>
          ) : (
            <Composer
              key={conversation}
              conversation={conversation}
              placeholder={
                person
                  ? `Message @${person.handle}`
                  : `Message #${channel!.name}`
              }
            />
          )}
        </div>
        {panel === "members" && community && (
          <MemberPanel community={community} onClose={() => setPanel(null)} />
        )}
        {panel === "pins" && (
          <aside className="a-detail-panel">
            <div className="a-panel-heading">
              <AppIcon name="pin" size={18} />
              <h2>Pinned messages</h2>
              <IconButton
                name="close"
                label="Close pinned messages"
                onClick={() => setPanel(null)}
              />
            </div>
            <p className="a-panel-description">
              The things worth keeping close.
            </p>
            <div className="a-panel-scroll">
              {allMessages
                .filter((m) => m.pinned)
                .map((message) => (
                  <button
                    className="a-pinned-card"
                    key={message.id}
                    onClick={() => {
                      if (message.threadOf) openThread(message.threadOf);
                      else {
                        document
                          .getElementById(`message-${message.id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }
                    }}
                  >
                    <span>
                      <PersonAvatar person={findPerson(message.author)} />
                      <strong>{personName(findPerson(message.author))}</strong>
                      <small>{message.time}</small>
                    </span>
                    <p>{message.text}</p>
                    <span className="a-text-link">
                      Jump to message <AppIcon name="right" size={14} />
                    </span>
                  </button>
                ))}
              {allMessages.every((m) => !m.pinned) && (
                <EmptyState
                  icon="pin"
                  title="Nothing pinned. Yet."
                  description="Keep useful messages within reach. Pin one from its message menu."
                />
              )}
            </div>
          </aside>
        )}
        {panel === "thread" && thread && (
          <ThreadPanel
            conversation={conversation}
            parentId={thread}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
      {editingTopic && channel && community && (
        <EditTopic
          name={channel.name}
          description={channel.description}
          communityId={community.id}
          channelId={channel.id}
          onClose={() => setEditingTopic(false)}
        />
      )}
    </div>
  );
}
function MessageText({ text }: { text: string }) {
  const blocks = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="a-message-text">
      {blocks.map((block, index) =>
        block.startsWith("```") ? (
          <pre key={index}>
            <code>{block.slice(3, -3).replace(/^\n/, "")}</code>
          </pre>
        ) : (
          <span key={index}>
            {block
              .split(/(https?:\/\/[^\s]+|@[\w-]+|\*\*[^*]+\*\*|`[^`]+`)/g)
              .map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {part}
                  </a>
                ) : part.startsWith("@") ? (
                  <mark key={i}>{part}</mark>
                ) : part.startsWith("**") ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : part.startsWith("`") ? (
                  <code key={i}>{part.slice(1, -1)}</code>
                ) : (
                  part
                ),
              )}
          </span>
        ),
      )}
    </div>
  );
}
export function MessageCard({
  message,
  onThread,
  compact = false,
  highlighted = false,
}: {
  message: Message;
  onThread: (id: string) => void;
  compact?: boolean;
  highlighted?: boolean;
}) {
  const {
    state,
    findPerson,
    setModal,
    react,
    updateMessage,
    deleteMessage,
    notify,
  } = useApp();
  const author = findPerson(message.author);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
  const replies = state.messages.filter((m) => m.threadOf === message.id);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      notify("Message copied.");
    } catch {
      notify(
        "Copy isn’t available in this browser. You can select the message text.",
      );
    }
  }
  function closeMenu(event: React.MouseEvent) {
    (event.target as HTMLElement).closest("details")?.removeAttribute("open");
  }
  return (
    <article
      id={`${compact ? "thread-message" : "message"}-${message.id}`}
      className={`a-message ${compact ? "compact-message" : ""} ${highlighted ? "highlighted" : ""} ${message.text.includes("@you") ? "mentioned" : ""}`}
    >
      <button
        className="a-avatar-button"
        onClick={() => setModal({ type: "profile", personId: author.id })}
        aria-label={`View ${author.name}'s profile`}
      >
        <PersonAvatar person={author} />
      </button>
      <div className="a-message-content">
        <div className="a-message-meta">
          <button
            onClick={() => setModal({ type: "profile", personId: author.id })}
          >
            {personName(author)}
          </button>
          {author.id === "you" && <span className="a-you-tag">you</span>}
          {author.role === "Moderator" && (
            <span className="a-moderator-tag">the friendly one</span>
          )}
          <time>{message.time}</time>
          {message.edited && <span className="a-edited">edited</span>}
          {message.pinned && (
            <span className="a-message-pin" title="Pinned message">
              <AppIcon name="pin" size={12} />
            </span>
          )}
        </div>
        {editing ? (
          <form
            className="a-message-edit"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) {
                updateMessage(message.id, { text: text.trim(), edited: true });
                setEditing(false);
              }
            }}
          >
            <textarea
              aria-label="Edit message"
              autoFocus
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
              required
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setEditing(false);
                  setText(message.text);
                }
              }}
            />
            <div>
              <button
                type="button"
                className="a-button secondary small"
                onClick={() => {
                  setEditing(false);
                  setText(message.text);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="a-button primary small"
                disabled={!text.trim()}
              >
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <MessageText text={message.text} />
        )}
        {message.reactions.length > 0 && (
          <div className="a-reactions">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                className={reaction.mine ? "selected" : ""}
                aria-label={`${reaction.mine ? "Remove" : "Add"} ${reaction.emoji} reaction, ${reaction.count} reactions`}
                aria-pressed={!!reaction.mine}
                onClick={() => react(message.id, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                {reaction.count}
              </button>
            ))}
          </div>
        )}
        {replies.length > 0 && !compact && (
          <button
            className="a-thread-link"
            onClick={() => onThread(message.id)}
          >
            <span className="a-thread-avatars">
              {[...new Set(replies.map((m) => m.author))]
                .slice(0, 3)
                .map((id) => (
                  <PersonAvatar person={findPerson(id)} key={id} />
                ))}
            </span>
            <strong>
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </strong>
            <span>Last reply {replies.at(-1)?.time}</span>
            <AppIcon name="right" size={14} />
          </button>
        )}
      </div>
      {!editing && (
        <div className="a-message-toolbar">
          <details className="a-emoji-menu">
            <summary aria-label="Add a reaction" title="Add a reaction">
              <AppIcon name="smile" size={17} />
            </summary>
            <div className="a-emoji-grid">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  title={`React ${emoji}`}
                  aria-label={`React ${emoji}`}
                  onClick={(event) => {
                    react(message.id, emoji);
                    closeMenu(event);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </details>
          {!compact && (
            <IconButton
              name="reply"
              label="Reply in thread"
              onClick={() => onThread(message.id)}
            />
          )}
          <IconButton
            name="bookmark"
            label={message.saved ? "Remove from saved" : "Save for later"}
            active={message.saved}
            onClick={() => {
              updateMessage(message.id, { saved: !message.saved });
              notify(
                message.saved
                  ? "Removed from saved messages."
                  : "Saved for a quieter moment.",
              );
            }}
          />
          <details className="a-message-menu">
            <summary
              aria-label="More message options"
              title="More message options"
            >
              <AppIcon name="more" size={17} />
            </summary>
            <div className="a-dropdown" onClick={closeMenu}>
              <div className="a-mobile-message-options">
                {!compact && (
                  <button onClick={() => onThread(message.id)}>
                    <AppIcon name="reply" size={16} />
                    Reply in thread
                  </button>
                )}
                <button onClick={() => react(message.id, "🧡")}>
                  <AppIcon name="heart" size={16} />
                  React with a heart
                </button>
                <button
                  onClick={() => {
                    updateMessage(message.id, { saved: !message.saved });
                    notify(
                      message.saved
                        ? "Removed from saved."
                        : "Saved for later.",
                    );
                  }}
                >
                  <AppIcon name="bookmark" size={16} />
                  {message.saved ? "Remove from saved" : "Save for later"}
                </button>
              </div>
              <button
                onClick={() => {
                  updateMessage(message.id, { pinned: !message.pinned });
                  notify(
                    message.pinned
                      ? "Message unpinned."
                      : "Pinned to this conversation.",
                  );
                }}
              >
                <AppIcon name="pin" size={16} />
                {message.pinned ? "Unpin message" : "Pin message"}
              </button>
              <button onClick={copy}>
                <AppIcon name="copy" size={16} />
                Copy text
              </button>
              {message.author === "you" && (
                <>
                  <button
                    onClick={() => {
                      setText(message.text);
                      setEditing(true);
                    }}
                  >
                    <AppIcon name="edit" size={16} />
                    Edit message
                  </button>
                  <button
                    className="danger-text"
                    onClick={() =>
                      setModal({
                        type: "confirm",
                        title: "Delete this message?",
                        description:
                          "This message and its replies will be removed from this local preview.",
                        label: "Delete message",
                        action: () => deleteMessage(message.id),
                      })
                    }
                  >
                    <AppIcon name="trash" size={16} />
                    Delete message
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </article>
  );
}
function Composer({
  conversation,
  placeholder,
  threadOf,
}: {
  conversation: string;
  placeholder: string;
  threadOf?: string;
}) {
  const { state, setState, sendMessage } = useApp();
  const draftKey = threadOf ? `thread:${threadOf}` : conversation;
  const draft = state.drafts[draftKey] ?? "";
  const textarea = useRef<HTMLTextAreaElement>(null);
  const setDraft = (text: string) =>
    setState((previous) => ({
      ...previous,
      drafts: { ...previous.drafts, [draftKey]: text.slice(0, 4000) },
    }));
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 160)}px`;
    }
  }, [draft]);
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (draft.trim()) {
      sendMessage(conversation, draft, threadOf);
      textarea.current?.focus();
    }
  }
  function insert(text: string) {
    const node = textarea.current;
    const start = node?.selectionStart ?? draft.length;
    const end = node?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + text + draft.slice(end));
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  return (
    <form
      className={`a-composer-wrap ${threadOf ? "a-thread-composer" : ""}`}
      onSubmit={submit}
    >
      <div className="a-composer">
        <textarea
          ref={textarea}
          rows={1}
          aria-label={placeholder}
          placeholder={placeholder}
          maxLength={4000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="a-composer-tools">
          <div>
            <details className="a-compose-menu">
              <summary title="Text formatting" aria-label="Text formatting">
                <AppIcon name="plus" size={20} />
              </summary>
              <div className="a-dropdown">
                <button
                  type="button"
                  onClick={(event) => {
                    insert("**bold text**");
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                  }}
                >
                  <AppIcon name="font" size={17} />
                  Bold text
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    insert("```\nYour code here\n```");
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                  }}
                >
                  <AppIcon name="code" size={17} />
                  Code block
                </button>
              </div>
            </details>
            <details className="a-emoji-menu composer-emojis">
              <summary title="Add an emoji" aria-label="Add an emoji">
                <AppIcon name="smile" size={20} />
              </summary>
              <div className="a-emoji-grid">
                {emojis.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    title={emoji}
                    onClick={(event) => {
                      insert(emoji);
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </details>
            {!threadOf && (
              <span className="a-composer-hint">
                A little thought goes a long way.
              </span>
            )}
          </div>
          <button
            className="a-send-button"
            type="submit"
            disabled={!draft.trim()}
            aria-label={threadOf ? "Send reply" : "Send message"}
            title={threadOf ? "Send reply" : "Send message"}
          >
            <AppIcon name="send" size={18} />
          </button>
        </div>
      </div>
      <div className="a-composer-footnote">
        <span>
          <kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> for a
          new line
        </span>
        {draft.length > 3500 ? (
          <span>{draft.length}/4000</span>
        ) : (
          <span>Be kind. Be you.</span>
        )}
      </div>
    </form>
  );
}
function MemberPanel({
  community,
  onClose,
}: {
  community: Community;
  onClose: () => void;
}) {
  const { state, setModal, findPerson } = useApp();
  const members = [findPerson("you"), ...state.people].filter(
    (person) => !community.memberIds || community.memberIds.includes(person.id),
  );
  return (
    <aside className="a-detail-panel a-member-panel">
      <div className="a-panel-heading">
        <h2>
          The people here <span>{members.length}</span>
        </h2>
        <IconButton name="close" label="Close member list" onClick={onClose} />
      </div>
      <div className="a-member-list">
        {["online", "away", "offline"].map((status) => (
          <div className="a-member-group" key={status}>
            <span className="a-sidebar-label">
              {status === "online"
                ? "AROUND NOW"
                : status === "away"
                  ? "TAKING A BREAK"
                  : "CATCH THEM LATER"}{" "}
              — {members.filter((p) => p.status === status).length}
            </span>
            {members
              .filter((p) => p.status === status)
              .map((person) => (
                <button
                  className="a-member"
                  key={person.id}
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                >
                  <PersonAvatar person={person} presence />
                  <span>
                    <strong>
                      {person.id === "you"
                        ? `${personName(person)} (you)`
                        : personName(person)}
                    </strong>
                    <small>{person.activity}</small>
                  </span>
                  {person.role === "Owner" && (
                    <span className="a-owner-star" title="Owner">
                      ✳
                    </span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
      <div className="a-member-invite">
        <span>GOOD COMPANY GROWS.</span>
        <h3>
          There’s always
          <br />
          room for one more.
        </h3>
        <button
          className="a-button secondary full"
          onClick={() =>
            setModal({ type: "invite", communityId: community.id })
          }
        >
          <AppIcon name="userAdd" size={17} />
          Invite a friend
        </button>
        <AppIcon name="sun" size={44} />
      </div>
      <div className="a-panel-bottom">
        A little corner. A lot of possibility.{" "}
        <AppIcon name="heart" size={14} />
      </div>
    </aside>
  );
}
function ThreadPanel({
  conversation,
  parentId,
  onClose,
}: {
  conversation: string;
  parentId: string;
  onClose: () => void;
}) {
  const { state } = useApp();
  const parent = state.messages.find((m) => m.id === parentId);
  const replies = state.messages.filter((m) => m.threadOf === parentId);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [replies.length, parentId]);
  return (
    <aside className="a-detail-panel a-thread-panel">
      <div className="a-panel-heading">
        <AppIcon name="reply" size={18} />
        <h2>A little side conversation</h2>
        <IconButton name="close" label="Close thread" onClick={onClose} />
      </div>
      <div className="a-thread-scroll" ref={scroll}>
        {parent ? (
          <>
            <MessageCard message={parent} onThread={() => {}} compact />
            <div className="a-date-divider">
              <span>
                {replies.length} {replies.length === 1 ? "REPLY" : "REPLIES"}
              </span>
            </div>
            {replies.map((reply) => (
              <MessageCard
                key={reply.id}
                message={reply}
                onThread={() => {}}
                compact
              />
            ))}
            {replies.length === 0 && (
              <div className="a-thread-empty">
                A little more room for this thought.
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="message"
            title="This thread has moved on."
            description="The original message was deleted."
          />
        )}
      </div>
      {parent && (
        <Composer
          key={parentId}
          conversation={conversation}
          threadOf={parentId}
          placeholder="Keep the thought going…"
        />
      )}
    </aside>
  );
}
function EditTopic({
  name,
  description,
  communityId,
  channelId,
  onClose,
}: {
  name: string;
  description: string;
  communityId: string;
  channelId: string;
  onClose: () => void;
}) {
  const { setState, notify } = useApp();
  const [topic, setTopic] = useState(description);
  return (
    <Dialog
      title={`A little about #${name}.`}
      description="Give the conversation a little direction."
      onClose={onClose}
    >
      <form
        className="a-form"
        onSubmit={(event) => {
          event.preventDefault();
          setState((previous) => ({
            ...previous,
            communities: previous.communities.map((c) =>
              c.id === communityId
                ? {
                    ...c,
                    channels: c.channels.map((ch) =>
                      ch.id === channelId
                        ? { ...ch, description: topic.trim() }
                        : ch,
                    ),
                  }
                : c,
            ),
          }));
          notify("Channel topic updated.");
          onClose();
        }}
      >
        <label>
          Channel topic
          <textarea
            value={topic}
            maxLength={140}
            rows={3}
            onChange={(event) => setTopic(event.target.value)}
            autoFocus
          />
        </label>
        <button type="submit" className="a-button primary full">
          Save topic <AppIcon name="check" size={17} />
        </button>
      </form>
    </Dialog>
  );
}
