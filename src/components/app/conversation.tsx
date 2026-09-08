import { showChannelWelcome } from "../../lib/channels";
import { ChannelWelcome } from "./channel-welcome";
import {
  ChannelIcon,
  ChannelIconEditor,
  CommunityIconEditor,
} from "./channel-icons";
import { VirtualMessages } from "./virtual-messages";
import { dmMessagingBlocked, dmReadOnly } from "../../lib/direct-messages";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { useApp, useDraft } from "../../lib/app-state";
import type { Message, Community, Person } from "../../types/app";
import { personName } from "../../lib/people";
import {
  canManageCommunity,
  canPinConversation,
} from "../../lib/community-permissions";
import {
  conversationChannels,
  isMentioned,
  mentionTargets,
  resolveChannel,
  resolveMention,
} from "../../lib/mentions";
import { MessageRequestActions } from "./message-requests";
import { EmojiPanel } from "./emoji-panel";
import { ChannelMention, Mention } from "./mention";
import { MentionTextarea } from "./mention-textarea";
import { MessageAttachments, UploadTray, useAttachments } from "./attachments";
import {
  AppIcon,
  Dialog,
  EmptyState,
  IconButton,
  PersonAvatar,
} from "./primitives";
import { ButtonLoader } from "../button-loader";

export function ConversationLink({
  conversation,
  messageId,
  children,
  className,
  "data-ui": dataUi,
  onClick,
}: {
  conversation: string;
  messageId?: string;
  children: ReactNode;
  className?: string;
  "data-ui"?: string;
  onClick?: () => void;
}) {
  const [first, second] = conversation.split(":");
  return first === "dm" ? (
    <Link
      to="/app/dm/$personId"
      params={{ personId: second }}
      search={{ message: messageId }}
      className={className}
      data-ui={dataUi}
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
      data-ui={dataUi}
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
  const {
    state,
    setState,
    setModal,
    findPerson,
    notify,
    loadMessages,
    command,
  } = useApp();
  const community = state.communities.find((c) => c.id === communityId);
  const channel = community?.channels.find((c) => c.id === channelId);
  const person = personId
    ? state.people.find((p) => p.id === personId)
    : undefined;
  const conversation = personId
    ? `dm:${personId}`
    : `${communityId}:${channelId}`;
  const allMessages = useMemo(
    () => state.messages.filter((m) => m.conversation === conversation),
    [state.messages, conversation],
  );
  const mainMessages = useMemo(
    () => allMessages.filter((m) => !m.threadOf),
    [allMessages],
  );
  const [panel, setPanel] = useState<"members" | "pins" | "thread" | null>(
    null,
  );
  const [thread, setThread] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const [editingCommunityIcon, setEditingCommunityIcon] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastConversation = useRef("");
  const lastTarget = useRef("");
  const selected = allMessages.find((m) => m.id === messageId);
  const blocked = !!personId && dmMessagingBlocked(state, personId);
  const blockedByMe = !!personId && state.blocked.includes(personId);
  const dm = state.dmConversations.find((d) => d.personId === personId);
  const incomingRequest = dm?.incoming && dm.status === "pending";
  const unavailableDm = dm?.status === "declined";
  const muted = state.muted.includes(conversation);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const lastRead = useRef("");
  useEffect(() => {
    let active = true;
    void loadMessages(conversation).then((more) => {
      if (active) setHasMore(more);
    });
    if (messageId) void loadMessages(conversation, undefined, messageId);
    return () => {
      active = false;
    };
  }, [conversation, messageId, loadMessages]);
  const newest = allMessages
    .filter((m) => !m.sending && !m.sendError)
    .at(-1);
  useEffect(() => {
    const mark = () => {
      const key = `${conversation}:${newest?.id ?? ""}:${newest?.createdAt ?? ""}`;
      if (
        (!personId || dm?.status === "accepted") &&
        newest?.createdAt &&
        lastRead.current !== key &&
        document.visibilityState === "visible"
      ) {
        lastRead.current = key;
        void command({
          type: "conversation.read",
          conversation,
          through: newest.createdAt,
          messageId: newest.id,
        });
      }
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [conversation, newest?.id, newest?.createdAt, command, personId, dm?.status]);
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
  const openThread = useCallback(
    (id: string) => {
      setThread(id);
      setPanel("thread");
    },
    [conversation, loadMessages],
  );
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
        <Link
          to="/app/discover"
          data-ui="a-button primary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
        >
          Find a community <AppIcon name="right" size={17} />
        </Link>
      </EmptyState>
    );
  const title = person?.name ?? channel!.name;
  const canManage = canManageCommunity(community);
  const welcome =
    !!community &&
    !!channel &&
    showChannelWelcome(community, channel, allMessages);

  return (
    <div data-ui="a-conversation-page" className="flex flex-col h-full">
      <header
        data-ui="a-conversation-header"
        className="h-20 flex items-center justify-between gap-5 py-0 px-6.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) bg-(--a-bg) shrink-0 min-[1600px]:px-8 max-[1250px]:px-5.25 max-[760px]:h-16.5 max-[760px]:py-0 max-[760px]:px-4.5 max-[760px]:gap-2.5 max-[480px]:px-3.75"
      >
        <div
          data-ui="a-conversation-title"
          className="flex items-center gap-3.25 min-w-0 [&>div]:min-w-0 [&_h1]:text-[16px] [&_h1]:font-[650] [&_h1]:tracking-[-0.3px] max-[760px]:gap-2.25 max-[760px]:[&_h1]:text-[15px] max-[480px]:[&_h1]:text-[14px]"
        >
          {person ? (
            <button
              data-ui="a-avatar-button"
              className="inline-flex p-0 h-fit bg-transparent shrink-0 rounded-[11px] [&:hover_[data-ui~=avatar]]:filter-[brightness(0.96)]"
              onClick={() => setModal({ type: "profile", personId: person.id })}
              aria-label={`View ${person.name}'s profile`}
            >
              <PersonAvatar person={person} presence />
            </button>
          ) : (
            <span data-ui="a-header-hash" className="flex text-(--a-muted)">
              {canManage ? (
                <button
                  type="button"
                  aria-label="Edit channel icon"
                  className="inline-flex rounded-md p-1 hover:bg-(--a-hover)"
                  onClick={() => setEditingIcon(true)}
                >
                  <ChannelIcon channel={channel!} size={25} />
                </button>
              ) : (
                <ChannelIcon channel={channel!} size={25} />
              )}
            </span>
          )}
          <div>
            <h1>{title}</h1>
            {person ? (
              <span
                data-ui="a-dm-presence"
                className="flex items-center gap-1.25 text-[11px] text-(--a-muted) mt-1.25"
              >
                <i
                  data-ui={`a-status-dot ${person.status}`}
                  className="data-[ui~=online]:bg-[#2ee68b] data-[ui~=away]:bg-[#ffc447] data-[ui~=offline]:bg-[#cbd5e1] inline-block rounded-full shrink-0 size-1.5"
                />
                {person.status === "online"
                  ? "Around for a conversation"
                  : person.activity}
              </span>
            ) : (
              canManage ? (
                <button
                  data-ui="a-topic-button"
                  className="block max-w-full p-0 mt-1.25 bg-transparent text-(--a-muted) text-left truncate text-[11px]! hover:text-(--a-green) max-[760px]:text-[10px]! max-[760px]:max-w-57.5 max-[480px]:max-w-45 max-[480px]:text-[9px]!"
                  title="Edit channel topic"
                  onClick={() => setEditingTopic(true)}
                >
                  {channel!.description}
                </button>
              ) : (
                <p className="max-w-full mt-1.25 text-(--a-muted) truncate text-[11px] max-[760px]:text-[10px] max-[760px]:max-w-57.5 max-[480px]:max-w-45 max-[480px]:text-[9px]">
                  {channel!.description}
                </p>
              )
            )}
          </div>
        </div>
        <div
          data-ui="a-conversation-actions"
          className="flex items-center gap-2.5 [&>a:last-child]:ml-1.25 [&>a:last-child]:pl-3.25 [&>a:last-child]:w-9.25 [&>a:last-child]:[border-left-width:1px] [&>a:last-child]:[border-left-style:solid] [&>a:last-child]:border-l-(--a-border) [&>a:last-child]:rounded-none max-[1250px]:gap-1.25 max-[760px]:gap-1 max-[760px]:**:data-[ui~=a-icon-button]:h-7.25 max-[760px]:**:data-[ui~=a-icon-button]:w-7 max-[760px]:[&>a:last-child]:hidden max-[480px]:gap-0 max-[480px]:**:data-[ui~=a-icon-button]:w-6.75"
        >
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
            data-ui="a-icon-button"
            className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green)"
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
      <div
        data-ui="a-conversation-body"
        className="flex flex-1 min-h-0 relative"
      >
        <div
          data-ui="a-message-column"
          className="flex flex-col flex-1 min-w-0 bg-(--a-surface)"
        >
          <div
            data-ui="a-message-scroll"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-3.5 scroll-auto"
            ref={scrollRef}
          >
            {hasMore && (
              <button
                data-ui="a-button secondary small"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                disabled={loadingHistory}
                onClick={async () => {
                  setLoadingHistory(true);
                  setHasMore(
                    await loadMessages(conversation, allMessages[0]?.id),
                  );
                  setLoadingHistory(false);
                }}
              >
                {loadingHistory ? (
                  <ButtonLoader label="Loading earlier messages" />
                ) : (
                  "Load earlier messages"
                )}
              </button>
            )}
            {person ? (
              <div
                data-ui="a-dm-intro"
                className="pt-9 pb-3.5 px-8 **:data-[ui~=a-avatar]:mb-3.75 [&_h2]:text-[29px] [&_h2]:tracking-[-1px] [&_h2]:mb-2.5 [&_p]:text-(--a-muted) [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:mb-3.75 [&_strong]:font-medium [&_strong]:text-(--a-green) max-[760px]:pt-7 max-[760px]:pb-3.75 max-[760px]:px-5.75 max-[760px]:[&_h2]:text-[29px]"
              >
                <PersonAvatar person={person} large />
                <h2>{person.name}</h2>
                <p>
                  The beginning of your conversation with{" "}
                  <strong>@{person.handle}</strong>.
                </p>
                <button
                  data-ui="a-button secondary small"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                >
                  View profile
                </button>
              </div>
            ) : null}
            {welcome && (
              <ChannelWelcome
                community={community!}
                onInvite={() =>
                  setModal({ type: "invite", communityId: community!.id })
                }
                onIcon={() => setEditingCommunityIcon(true)}
                onCompose={() => composerRef.current?.focus()}
              />
            )}
            {mainMessages.length > 0 && (
              <div
                data-ui="a-date-divider"
                className="flex items-center gap-3.5 my-4.75 mx-7.5 text-(--a-faint) font-mono text-[8px] tracking-[0.6px] before:[content:''] before:flex-1 before:h-px before:bg-(--a-border) after:[content:''] after:flex-1 after:h-px after:bg-(--a-border) max-[760px]:mx-5.25 max-[480px]:mx-4.25 max-[480px]:text-[7px]"
              >
                <span>THE CONVERSATION SO FAR</span>
              </div>
            )}
            <VirtualMessages
              key={conversation}
              messages={mainMessages}
              scrollRef={scrollRef}
              highlighted={selected?.threadOf ?? messageId}
              onThread={openThread}
            />
            {mainMessages.length === 0 && !welcome && (
              <div
                data-ui="a-first-message"
                className="flex items-center justify-center flex-col gap-3.75 min-h-65 text-center text-(--a-muted) text-[14px] leading-[1.8] [&_strong]:font-medium"
              >
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
            <div
              data-ui="a-blocked-composer"
              className="flex items-center gap-3 bg-(--a-soft) [border-top-width:1px] [border-top-style:solid] border-t-(--a-border) p-5.25 text-[12px] text-(--a-muted) [&>span]:flex-1 max-[760px]:py-4.5 max-[760px]:px-3.75 max-[760px]:text-[12px] max-[760px]:gap-2.5 max-[760px]:[&>svg]:hidden"
            >
              <AppIcon name="shield" size={21} />
              <span>
                {blockedByMe
                  ? `You’ve blocked ${person?.name.split(" ")[0]}. Your messages are still here. Unblock them to chat.`
                  : "You can read your messages, but messaging in this conversation is unavailable."}
              </span>
              {blockedByMe && (
                <button
                  data-ui="a-button secondary small"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  onClick={() =>
                    setState((previous) => ({
                      ...previous,
                      blocked: previous.blocked.filter((id) => id !== personId),
                    }))
                  }
                >
                  Unblock
                </button>
              )}
            </div>
          ) : incomingRequest ? (
            <section
              aria-label="Message request"
              className="shrink-0 space-y-3 border-t border-(--a-border) bg-(--a-soft) p-5"
            >
              <h2 className="text-base! font-semibold">
                {person?.name} wants to message you
              </h2>
              <p className="text-sm text-(--a-muted)">
                Accept to reply. Reading this request won’t send read or typing
                activity. Accepting won’t add them as a friend.
              </p>
              <MessageRequestActions personId={personId!} />
            </section>
          ) : unavailableDm ? (
            <p className="shrink-0 border-t border-(--a-border) p-5 text-sm text-(--a-muted)">
              This conversation is unavailable.
            </p>
          ) : (
            <div className="shrink-0">
              {personId && dm?.status === "pending" && (
                <p role="status" className="px-6 pt-3 text-xs text-(--a-muted)">
                  {dm.hasMessages
                    ? `Message request sent. You can chat normally once ${person?.name} accepts.`
                    : `Your first message will go to ${person?.name}’s message requests.`}
                </p>
              )}
              <Composer
                inputRef={composerRef}
                key={conversation}
                conversation={conversation}
                placeholder={
                  person
                    ? `Message @${person.handle}`
                    : `Message #${channel!.name}`
                }
                typingEnabled={!personId || dm?.status === "accepted"}
              />
            </div>
          )}
        </div>
        {panel === "members" && community && (
          <MemberPanel community={community} onClose={() => setPanel(null)} />
        )}
        {panel === "pins" && (
          <aside
            data-ui="a-detail-panel"
            className="flex flex-col shrink-0 w-63.5 [border-left-width:1px] [border-left-style:solid] border-l-(--a-border) bg-(--a-bg) **:data-[ui~=a-empty]:min-h-62.5 **:data-[ui~=a-empty]:py-6.75 **:data-[ui~=a-empty]:px-2.5 **:data-[ui~=a-empty]:gap-3.25 [&_[data-ui~=a-empty]_h2]:text-[19px] [&_[data-ui~=a-empty]_p]:text-[12px] **:data-[ui~=a-empty-icon]:rounded-2xl **:data-[ui~=a-empty-icon]:size-13.25 min-[1600px]:w-68.75 max-[1250px]:w-55.5 max-[1050px]:absolute max-[1050px]:top-0 max-[1050px]:bottom-0 max-[1050px]:right-0 max-[1050px]:z-12 max-[1050px]:w-69 max-[1050px]:shadow-[-14px_0_30px_#2437100c] max-[760px]:absolute max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:right-0 max-[760px]:w-75 max-[760px]:max-w-full max-[760px]:shadow-[-20px_0_70px_#24371025] max-[480px]:**:data-[ui~=a-message-toolbar]:right-auto"
          >
            <div
              data-ui="a-panel-heading"
              className="flex items-center gap-2 min-h-13.75 py-3 px-4.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) text-(--a-muted) [&_h2]:flex-1 [&_h2]:text-[12px] [&_h2]:font-[550] [&_h2]:tracking-normal [&_h2]:text-(--a-text) [&_h2_span]:text-(--a-faint) [&_h2_span]:ml-1 [&_h2_span]:text-[10px] **:data-[ui~=a-icon-button]:w-5.75 **:data-[ui~=a-icon-button]:h-6"
            >
              <AppIcon name="pin" size={18} />
              <h2>Pinned messages</h2>
              <IconButton
                name="close"
                label="Close pinned messages"
                onClick={() => setPanel(null)}
              />
            </div>
            <p
              data-ui="a-panel-description"
              className="pt-4 pb-1 px-4.5 text-[12px] text-(--a-muted)"
            >
              The things worth keeping close.
            </p>
            <div
              data-ui="a-panel-scroll"
              className="flex-1 min-h-0 overflow-y-auto p-3.5"
            >
              {allMessages
                .filter((m) => m.pinned)
                .map((message) => (
                  <button
                    data-ui="a-pinned-card"
                    className="block w-full bg-(--a-surface) text-left p-3.25 rounded-[7px] mb-3 border! border-solid! border-(--a-border)! [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-1.75 [&>span:first-child]:text-[11px] **:data-[ui~=avatar]:rounded-lg **:data-[ui~=avatar]:text-[10px] **:data-[ui~=avatar]:size-6.25 [&_small]:text-[8px] [&_small]:ml-auto [&_small]:text-(--a-faint) [&_p]:whitespace-pre-wrap [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:py-3.25 [&_p]:text-(--a-muted) [&_p]:wrap-anywhere [&_p]:max-h-65 [&_p]:overflow-hidden **:data-[ui~=a-text-link]:text-[10px]"
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
                    <span
                      data-ui="a-text-link"
                      className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
                    >
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
      {canManage && editingIcon && channel && community && (
        <ChannelIconEditor
          key={`${community.id}:${channel.id}`}
          communityId={community.id}
          channel={channel}
          onClose={() => setEditingIcon(false)}
        />
      )}
      {canManage && editingCommunityIcon && community && (
        <CommunityIconEditor
          community={community}
          onClose={() => setEditingCommunityIcon(false)}
        />
      )}
      {canManage && editingTopic && channel && community && (
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
function MessageText({
  text,
  conversation,
}: {
  text: string;
  conversation: string;
}) {
  const context = useApp((app) => ({
    profile: app.state.profile,
    people: app.state.people,
    communities: app.state.communities,
    preferences: app.state.preferences,
  }));
  const state = context as Parameters<typeof mentionTargets>[0];
  const targets = mentionTargets(state, conversation);
  const channels = conversationChannels(state, conversation);
  const communityId = conversation.startsWith("dm:")
    ? null
    : conversation.split(":")[0];
  function inline(content: string): ReactNode {
    return content
      .split(
        /(https?:\/\/[^\s]+|`[^`]+`|\*\*[^*]+\*\*|(?<![\p{L}\p{N}_@])@[\p{L}\p{N}_-]+|(?<![\p{L}\p{N}_#])#[\p{L}\p{N}_-]+)/gu,
      )
      .map((part, index) => {
        if (/^https?:\/\//.test(part))
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noreferrer noopener"
            >
              {part}
            </a>
          );
        if (part.startsWith("`"))
          return <code key={index}>{part.slice(1, -1)}</code>;
        if (part.startsWith("**"))
          return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
        if (part.startsWith("@")) {
          const target = resolveMention(part.slice(1), targets);
          if (target) return <Mention key={index} target={target} />;
        }
        if (part.startsWith("#") && communityId) {
          const channel = resolveChannel(part.slice(1), channels);
          if (channel)
            return (
              <ChannelMention
                key={index}
                channel={channel}
                communityId={communityId}
              />
            );
        }
        return part;
      });
  }
  return (
    <div
      data-ui="a-message-text"
      className="whitespace-pre-wrap text-(length:--a-font) leading-[1.65] text-(--a-text) wrap-anywhere [&_mark]:bg-[#e4eace] [&_mark]:text-[#73834f] [&_mark]:rounded-[3px] [&_mark]:py-px [&_mark]:px-0.75 [&_a]:text-[#809964] [&_a]:underline [&_a]:underline-offset-[3px] [&_pre]:bg-(--a-soft) [&_pre]:border [&_pre]:border-solid [&_pre]:border-(--a-border) [&_pre]:p-3.5 [&_pre]:rounded-[7px] [&_pre]:my-2 [&_pre]:overflow-auto [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-(--a-soft) [&_code]:py-0.5 [&_code]:px-1 [&_code]:rounded-[3px] [&_pre_code]:p-0 [[data-ui~=theme-dark]_&_mark]:bg-[#f45e3826] [[data-ui~=theme-dark]_&_mark]:text-[#ffb29c] [[data-ui~=theme-dark]_&_a]:text-[#ff9a7e] max-[760px]:text-[14px] max-[760px]:in-data-[ui~=text-large]:text-[16px] max-[480px]:text-[13px]"
    >
      {text.split(/(```[\s\S]*?```)/g).map((block, index) =>
        block.startsWith("```") ? (
          <pre key={index}>
            <code>{block.slice(3, -3).replace(/^\n/, "")}</code>
          </pre>
        ) : (
          <span key={index}>{inline(block)}</span>
        ),
      )}
    </div>
  );
}
export const MessageCard = memo(function MessageCard({
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
    readOnly,
    author,
    mentioned,
    replies,
    findPerson,
    setModal,
    react,
    updateMessage,
    deleteMessage,
    retryMessage,
    notify,
    canPin,
  } = useApp((app) => ({
    readOnly: dmReadOnly(app.state, message.conversation),
    author: app.findPerson(message.author),
    mentioned:
      message.text.includes("@") &&
      isMentioned(
        message.text,
        mentionTargets(app.state, message.conversation),
      ),
    replies: app.replies.get(message.id) ?? noReplies,
    findPerson: app.findPerson,
    setModal: app.setModal,
    react: app.react,
    updateMessage: app.updateMessage,
    deleteMessage: app.deleteMessage,
    retryMessage: app.retryMessage,
    notify: app.notify,
    canPin: canPinConversation(app.state, message.conversation),
  }));
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
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
      aria-label={
        message.sending
          ? "Message pending"
          : message.sendError
            ? "Message failed"
            : undefined
      }
      data-ui={`a-message ${message.sending ? "a-message-pending" : ""} ${compact ? "compact-message" : ""} ${highlighted ? "highlighted" : ""} ${mentioned ? "mentioned" : ""}`}
      className="flex gap-3 relative py-2.75 px-7.5 scroll-m-7.5 hover:bg-[#879e5a06] focus-within:bg-[#879e5a06] data-[ui~=mentioned]:bg-[#eee4b222] data-[ui~=mentioned]:[border-left-width:2px] data-[ui~=mentioned]:[border-left-style:solid] data-[ui~=mentioned]:border-l-[#d6b578] data-[ui~=mentioned]:pl-7 data-[ui~=highlighted]:bg-[#f2cd9940] data-[ui~=highlighted]:[outline:1px_solid_#d6b57855] [&:hover_[data-ui~=a-message-toolbar]]:opacity-100 [&:hover_[data-ui~=a-message-toolbar]]:pointer-events-auto [&:focus-within_[data-ui~=a-message-toolbar]]:opacity-100 [&:focus-within_[data-ui~=a-message-toolbar]]:pointer-events-auto in-data-[ui~=density-compact]:py-1.25 [[data-ui~=theme-dark]_&:hover]:bg-[#ffffff04] [[data-ui~=theme-dark]_&:focus-within]:bg-[#ffffff04] [[data-ui~=theme-dark]_&[data-ui~=mentioned]]:bg-[#f45e380c] [[data-ui~=theme-dark]_&[data-ui~=mentioned]]:border-l-(--a-orange) [[data-ui~=theme-dark]_&[data-ui~=highlighted]]:bg-[#f45e381c] [[data-ui~=theme-dark]_&[data-ui~=highlighted]]:outline-[#f45e3840] min-[1600px]:px-9.5 min-[1600px]:data-[ui~=mentioned]:pl-9 max-[1250px]:px-6 max-[1250px]:data-[ui~=mentioned]:pl-5.5 max-[760px]:py-3.25 max-[760px]:px-5.25 max-[760px]:gap-2.75 max-[760px]:data-[ui~=mentioned]:pl-4.75 max-[480px]:py-3.25 max-[480px]:px-4.25 max-[480px]:gap-2.5 max-[480px]:flex-wrap max-[480px]:data-[ui~=mentioned]:pl-3.75 max-[480px]:**:data-[ui~=avatar]:rounded-[10px] max-[480px]:**:data-[ui~=avatar]:text-[12px] max-[480px]:**:data-[ui~=avatar]:size-8 max-[480px]:[&:focus-within_[data-ui~=a-message-toolbar]]:flex max-[480px]:[&:focus-within_[data-ui~=a-message-toolbar]]:m-0 max-[480px]:[&:hover_[data-ui~=a-message-toolbar]]:flex max-[480px]:[&:hover_[data-ui~=a-message-toolbar]]:m-0 [&[data-ui~=a-message-pending]>[data-ui~=a-avatar-button]]:opacity-45 [&[data-ui~=a-message-pending]>[data-ui~=a-message-content]]:opacity-45"
    >
      <button
        data-ui="a-avatar-button"
        className="inline-flex p-0 h-fit bg-transparent shrink-0 rounded-[11px] [&:hover_[data-ui~=avatar]]:filter-[brightness(0.96)]"
        onClick={() => setModal({ type: "profile", personId: author.id })}
        aria-label={`View ${author.name}'s profile`}
      >
        <PersonAvatar person={author} />
      </button>
      <div
        data-ui="a-message-content"
        className="flex-1 min-w-0 max-[480px]:basis-[calc(100%-45px)]"
      >
        <div
          data-ui="a-message-meta"
          className="flex items-center flex-wrap gap-2 min-h-5 mb-0.75 [&>button]:p-0 [&>button]:text-(--a-text) [&>button]:text-[13px] [&>button]:font-[650] [&>button]:bg-transparent [&>button:hover]:underline [&_time]:text-[9px] [&_time]:text-(--a-faint) max-[760px]:[&>button]:text-[13px] max-[760px]:[&_time]:text-[9px] max-[480px]:gap-1.5 max-[480px]:pr-12.5"
        >
          <button
            onClick={() => setModal({ type: "profile", personId: author.id })}
          >
            {personName(author)}
          </button>
          {author.id === "you" && (
            <span data-ui="a-you-tag" className="text-[9px] text-(--a-faint)">
              you
            </span>
          )}
          {author.role === "Moderator" && (
            <span
              data-ui="a-moderator-tag"
              className="text-[8px] bg-[#edf0e4] text-[#86966d] py-px px-1.25 rounded-[3px] in-data-[ui~=theme-dark]:bg-(--a-soft) in-data-[ui~=theme-dark]:text-(--a-muted) max-[480px]:text-[7px]"
            >
              the friendly one
            </span>
          )}
          <time dateTime={message.createdAt}>
            {message.createdAt
              ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : message.time}
          </time>
          {message.edited && (
            <span data-ui="a-edited" className="text-[9px] text-(--a-faint)">
              edited
            </span>
          )}
          {message.pinned && (
            <span
              data-ui="a-message-pin"
              className="flex text-[#b7a274]"
              title="Pinned message"
            >
              <AppIcon name="pin" size={12} />
            </span>
          )}
        </div>
        {editing && !readOnly ? (
          <form
            data-ui="a-message-edit"
            className="mt-1.75 [&_textarea]:w-full [&_textarea]:min-h-21.25 [&_textarea]:p-2.5 [&_textarea]:text-[13px] [&>div]:flex [&>div]:gap-1.75 [&>div]:justify-end [&>div]:mt-1.75"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) {
                updateMessage(message.id, { text: text.trim(), edited: true });
                setEditing(false);
              }
            }}
          >
            <MentionTextarea
              conversation={message.conversation}
              aria-label="Edit message"
              autoFocus
              value={text}
              maxLength={4000}
              onValueChange={setText}
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
                data-ui="a-button secondary small"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                onClick={() => {
                  setEditing(false);
                  setText(message.text);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-ui="a-button primary small"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]!"
                disabled={!text.trim()}
              >
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <MessageText
            text={message.text}
            conversation={message.conversation}
          />
        )}
        {message.sendError && (
          <div
            data-ui="a-message-failed"
            className="flex flex-wrap items-center gap-2.5 text-(--a-muted) text-[12px] mt-1.5 [&_button]:text-(--a-orange) [&_button]:underline [&_button]:font-semibold"
            role="alert"
          >
            <span>{message.sendError}</span>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => void retryMessage(message.id)}
            >
              Retry
            </button>
          </div>
        )}
        {!!message.attachments?.length && (
          <MessageAttachments files={message.attachments} />
        )}
        {message.reactions.length > 0 && (
          <div
            data-ui="a-reactions"
            className="flex items-center flex-wrap gap-1.5 mt-2 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&>button]:py-0.75 [&>button]:px-2 [&>button]:h-6.75 [&>button]:bg-(--a-soft) [&>button]:rounded-md [&>button]:text-[10px] [&>button]:text-(--a-muted) [&>button]:border! [&>button]:border-solid! [&>button]:border-(--a-border)! [&>button>span]:text-[13px] [&>button[data-ui~=selected]]:bg-(--a-selected) [&>button[data-ui~=selected]]:text-(--a-green) [&>button[data-ui~=selected]]:border-[#bccba4]! [&>button:hover]:border-[#adbd96]! in-data-[ui~=density-compact]:mt-1.25 [[data-ui~=theme-dark]_&>button:hover]:border-[#626262]! [[data-ui~=theme-dark]_&>button[data-ui~=selected]]:border-[#626262]!"
          >
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                data-ui={reaction.mine ? "selected" : ""}
                aria-label={`${reaction.mine ? "Remove" : "Add"} ${reaction.emoji} reaction, ${reaction.count} reactions`}
                aria-pressed={!!reaction.mine}
                disabled={readOnly}
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
            data-ui="a-thread-link"
            className="flex items-center gap-2 mt-2.75 p-0 bg-transparent text-(--a-green) text-[10px] [&>span:not([data-ui~=a-thread-avatars])]:text-(--a-faint) [&>span:not([data-ui~=a-thread-avatars])]:text-[9px] hover:underline max-[480px]:gap-1.5 max-[480px]:[&>span:not([data-ui~=a-thread-avatars])]:text-[8px]"
            onClick={() => onThread(message.id)}
          >
            <span
              data-ui="a-thread-avatars"
              className="flex pr-0.75 **:data-[ui~=a-avatar]:-mr-1 **:data-[ui~=avatar]:rounded-md **:data-[ui~=avatar]:text-[8px] **:data-[ui~=avatar]:border **:data-[ui~=avatar]:border-solid **:data-[ui~=avatar]:border-(--a-surface) **:data-[ui~=avatar]:size-4.75"
            >
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
      {!readOnly && !editing && !message.sending && !message.sendError && (
        <div
          data-ui="a-message-toolbar"
          className="flex items-center absolute right-5.5 -top-3.75 p-0.75 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] shadow-[0_3px_7px_#1d2c0907] opacity-0 pointer-events-none z-5 [&:has(details[open])]:z-40 [&:has(details[open])]:opacity-100 [&:has(details[open])]:pointer-events-auto **:data-[ui~=a-icon-button]:w-7 **:data-[ui~=a-icon-button]:h-6.75 [&_[data-ui~=a-icon-button]_svg]:w-4 max-[760px]:right-4.5 max-[760px]:-top-3 max-[760px]:**:data-[ui~=a-icon-button]:w-7.5 max-[760px]:**:data-[ui~=a-icon-button]:h-7.25 max-[480px]:shadow-none max-[480px]:self-end max-[480px]:absolute max-[480px]:top-2 max-[480px]:right-1.75 max-[480px]:flex max-[480px]:opacity-100 max-[480px]:pointer-events-auto max-[480px]:p-0 max-[480px]:border-0 max-[480px]:border-none max-[480px]:border-[currentColor] max-[480px]:bg-transparent max-[480px]:m-0 max-[480px]:*:data-[ui~=a-icon-button]:hidden max-[480px]:[&_[data-ui~=a-message-menu]>summary]:size-6 [&:has([data-ui~=a-emoji-trigger][aria-expanded='true'])]:opacity-100 [&:has([data-ui~=a-emoji-trigger][aria-expanded='true'])]:pointer-events-auto max-[480px]:*:data-[ui~=a-emoji-trigger]:flex"
        >
          <EmojiPanel reaction onSelect={(emoji) => react(message.id, emoji)} />
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
          <details
            data-ui="a-message-menu"
            className="relative [&>summary]:flex [&>summary]:items-center [&>summary]:justify-center [&>summary]:w-7.25 [&>summary]:h-7 [&>summary]:text-(--a-muted) [&>summary]:rounded-[5px] [&>summary]:cursor-pointer [&>summary:hover]:bg-(--a-hover) [&>summary:hover]:text-(--a-green) **:data-[ui~=a-dropdown]:top-8.25 **:data-[ui~=a-dropdown]:right-0 max-[480px]:**:data-[ui~=a-dropdown]:top-7.25 max-[480px]:**:data-[ui~=a-dropdown]:bottom-auto"
          >
            <summary
              aria-label="More message options"
              title="More message options"
            >
              <AppIcon name="more" size={17} />
            </summary>
            <div
              data-ui="a-dropdown"
              className="absolute z-30 min-w-51.25 p-1.5 border border-solid border-(--a-border) bg-(--a-surface) rounded-[9px] shadow-[0_8px_28px_#17220720] text-left [&_button]:flex [&_button]:items-center [&_button]:gap-2.25 [&_button]:w-full [&_button]:rounded-[5px] [&_button]:bg-transparent [&_button]:p-2.5 [&_button]:text-(--a-text) [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_a]:flex [&_a]:items-center [&_a]:gap-2.25 [&_a]:w-full [&_a]:rounded-[5px] [&_a]:bg-transparent [&_a]:p-2.5 [&_a]:text-(--a-text) [&_a]:text-[12px] [&_a]:whitespace-nowrap [&_button:hover]:bg-(--a-hover) [&_a:hover]:bg-(--a-hover)"
              onClick={closeMenu}
            >
              <div
                data-ui="a-mobile-message-options"
                className="hidden max-[480px]:block"
              >
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
              {canPin && (
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
              )}
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
                    data-ui="danger-text"
                    className="text-[#b8654b]!"
                    onClick={() =>
                      setModal({
                        type: "confirm",
                        title: "Delete this message?",
                        description:
                          "This message and its replies will be deleted for everyone.",
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
});
const noReplies: Message[] = [];
const ignoreThread = () => {};
function Composer({
  inputRef,
  typingEnabled = true,
  conversation,
  placeholder,
  threadOf,
}: {
  conversation: string;
  placeholder: string;
  typingEnabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  threadOf?: string;
}) {
  const { state, sendMessage, notify, observeRoom, setTyping, typingPeople } =
    useApp();
  useEffect(
    () => (typingEnabled ? observeRoom({ conversation, threadOf }) : undefined),
    [conversation, threadOf, observeRoom, typingEnabled],
  );
  const typing = typingPeople.filter(
    (p) =>
      typingEnabled &&
      p.conversation === conversation &&
      p.threadOf === threadOf,
  );
  const typingText =
    typing.length > 2
      ? `${typing[0].name}, ${typing[1].name} and ${typing.length - 2} others are typing…`
      : typing.length === 2
        ? `${typing[0].name} and ${typing[1].name} are typing…`
        : typing.length === 1
          ? `${typing[0].name} is typing…`
          : "";
  const files = useAttachments(conversation);
  const picker = useRef<HTMLInputElement>(null);
  const draftKey = threadOf ? `thread:${threadOf}` : conversation;
  const [draft, writeDraft] = useDraft(draftKey);
  const localTextarea = useRef<HTMLTextAreaElement>(null);
  const textarea = inputRef ?? localTextarea;
  const setDraft = (text: string) => {
    if (typingEnabled) setTyping({ conversation, threadOf }, !!text.trim());
    writeDraft(text.slice(0, 4000));
  };
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 160)}px`;
    }
  }, [draft]);
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!files.ready || (!draft.trim() && !files.files.length)) return;
    const attachments = files.take();
    setTyping({ conversation, threadOf }, false);
    writeDraft("");
    void sendMessage(conversation, draft, threadOf, attachments);
    textarea.current?.focus();
  }
  function insert(text: string) {
    const node = textarea.current;
    const start = node?.selectionStart ?? draft.length;
    const end = node?.selectionEnd ?? draft.length;
    if (draft.length - (end - start) + text.length > 4000) {
      notify("This message has reached the 4,000-character limit.");
      return;
    }
    setDraft(draft.slice(0, start) + text + draft.slice(end));
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  return (
    <form
      data-ui={`a-composer-wrap ${threadOf ? "a-thread-composer" : ""}`}
      className="py-3.25 px-6 shrink-0 bg-(--a-surface) [&[data-ui~=a-thread-composer]_[data-ui~=a-composer-footnote]>span:last-child]:hidden [&[data-ui~=a-thread-composer]_[data-ui~=a-composer-footnote]]:text-[7px] min-[1600px]:px-8 max-[760px]:pt-2.5 max-[760px]:pb-2.75 max-[760px]:px-3.75"
      onSubmit={submit}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          event.preventDefault();
          files.add(Array.from(event.dataTransfer.files));
        }
      }}
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.files);
        if (pasted.length) {
          event.preventDefault();
          files.add(pasted);
        }
      }}
    >
      <div
        data-ui="a-composer"
        className="bg-(--a-soft) border border-solid border-[#e0e5d4] rounded-[9px] pt-3.25 pb-2.25 px-3.5 [transition:border-color_0.2s,box-shadow_0.2s] in-data-[ui~=theme-dark]:border-(--a-border) focus-within:border-[#bbc9a4] focus-within:shadow-[0_0_0_3px_#90a57108] [&>textarea]:block [&>textarea]:w-full [&>textarea]:min-h-7.25 [&>textarea]:max-h-40 [&>textarea]:bg-transparent [&>textarea]:border-0 [&>textarea]:border-none [&>textarea]:border-[currentColor] [&>textarea]:pt-0 [&>textarea]:pb-1.25 [&>textarea]:px-0.5 [&>textarea]:resize-none [&>textarea]:text-(length:--a-font) [&>textarea]:leading-[1.6] [&>textarea]:rounded-none [&>textarea]:shadow-none! [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:pt-3 max-[760px]:pb-2 max-[760px]:px-2.75 max-[760px]:[&>textarea]:text-[16px] max-[760px]:[&>textarea::placeholder]:text-[13px]"
      >
        <UploadTray
          uploads={files.uploads}
          remove={files.remove}
          retry={files.retry}
        />
        <input
          type="file"
          multiple
          hidden
          ref={picker}
          onChange={(event) => {
            files.add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <MentionTextarea
          conversation={conversation}
          textareaRef={textarea}
          highlightMentions
          rows={1}
          aria-label={placeholder}
          placeholder={placeholder}
          maxLength={4000}
          value={draft}
          onValueChange={setDraft}
          onBlur={() => setTyping({ conversation, threadOf }, false)}
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
        <div
          data-ui="a-composer-tools"
          className="flex items-center justify-between mt-2 [&>div]:flex [&>div]:items-center [&>div]:gap-1.75"
        >
          <div>
            <details
              data-ui="a-compose-menu"
              className="relative [&>summary]:flex [&>summary]:items-center [&>summary]:justify-center [&>summary]:w-7.25 [&>summary]:h-7 [&>summary]:text-(--a-muted) [&>summary]:rounded-[5px] [&>summary]:cursor-pointer [&>summary:hover]:bg-(--a-hover) [&>summary:hover]:text-(--a-green) **:data-[ui~=a-dropdown]:left-0 **:data-[ui~=a-dropdown]:bottom-8.75"
            >
              <summary title="Add to message" aria-label="Add to message">
                <AppIcon name="plus" size={20} />
              </summary>
              <div
                data-ui="a-dropdown"
                className="absolute z-30 min-w-51.25 p-1.5 border border-solid border-(--a-border) bg-(--a-surface) rounded-[9px] shadow-[0_8px_28px_#17220720] text-left [&_button]:flex [&_button]:items-center [&_button]:gap-2.25 [&_button]:w-full [&_button]:rounded-[5px] [&_button]:bg-transparent [&_button]:p-2.5 [&_button]:text-(--a-text) [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_a]:flex [&_a]:items-center [&_a]:gap-2.25 [&_a]:w-full [&_a]:rounded-[5px] [&_a]:bg-transparent [&_a]:p-2.5 [&_a]:text-(--a-text) [&_a]:text-[12px] [&_a]:whitespace-nowrap [&_button:hover]:bg-(--a-hover) [&_a:hover]:bg-(--a-hover)"
              >
                <button
                  type="button"
                  disabled={files.uploads.length >= 10}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    picker.current?.click();
                  }}
                >
                  <AppIcon name="file" size={17} />
                  Upload a file
                </button>
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
            <EmojiPanel onSelect={insert} />
            {!threadOf && (
              <span
                data-ui="a-composer-hint"
                className="[border-left-width:1px] [border-left-style:solid] border-l-(--a-border) pl-3 ml-0.75 text-[9px] text-(--a-faint) max-[760px]:text-[9px] max-[480px]:text-[8px] max-[480px]:pl-2.25"
              >
                A little thought goes a long way.
              </span>
            )}
          </div>
          <button
            data-ui="a-send-button"
            className="flex items-center justify-center w-7.5 h-7.25 bg-[#f5a383] text-[#975a3a] rounded-md [transition:background_0.15s] [&:hover:not(:disabled)]:bg-[#f1865f] disabled:opacity-50"
            type="submit"
            disabled={!files.ready || (!draft.trim() && !files.files.length)}
            aria-label={threadOf ? "Send reply" : "Send message"}
            title={threadOf ? "Send reply" : "Send message"}
          >
            <AppIcon name="send" size={18} />
          </button>
        </div>
      </div>
      <div
        data-ui="a-typing-indicator"
        className="min-h-6 flex items-center gap-1.75 pt-0.75 pb-0 px-3 text-(--a-muted) text-[11px]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {typingText && (
          <>
            <span
              data-ui="a-typing-dots"
              className="inline-flex gap-0.75 [&_i]:rounded-full [&_i]:[background:currentColor] [&_i]:animate-[typing-pulse_1.2s_ease-in-out_infinite] [&_i]:size-0.75 [&_i:nth-child(2)]:[animation-delay:0.15s] [&_i:nth-child(3)]:[animation-delay:0.3s] motion-reduce:[&_i]:animate-none"
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
            <span>{typingText}</span>
          </>
        )}
      </div>
      <div
        data-ui="a-composer-footnote"
        className="flex items-center justify-between gap-3 pt-2 pb-0 px-0.5 text-[8px] text-(--a-faint) [&_kbd]:text-(--a-muted) [&>span>span]:mx-1 max-[760px]:text-[8px] max-[480px]:[&>span:last-child]:hidden"
      >
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
  const canManage = canManageCommunity(community);
  const members = [findPerson("you"), ...state.people]
    .filter(
      (person) =>
        !community.memberIds || community.memberIds.includes(person.id),
    )
    .map((person) => ({
      ...person,
      role: community.memberRoles?.[person.id] ?? person.role,
    }));
  return (
    <aside
      data-ui="a-detail-panel a-member-panel"
      className="flex flex-col shrink-0 w-63.5 [border-left-width:1px] [border-left-style:solid] border-l-(--a-border) bg-(--a-bg) **:data-[ui~=a-empty]:min-h-62.5 **:data-[ui~=a-empty]:py-6.75 **:data-[ui~=a-empty]:px-2.5 **:data-[ui~=a-empty]:gap-3.25 [&_[data-ui~=a-empty]_h2]:text-[19px] [&_[data-ui~=a-empty]_p]:text-[12px] **:data-[ui~=a-empty-icon]:rounded-2xl **:data-[ui~=a-empty-icon]:size-13.25 min-[1600px]:w-68.75 max-[1250px]:w-55.5 max-[1050px]:absolute max-[1050px]:top-0 max-[1050px]:bottom-0 max-[1050px]:right-0 max-[1050px]:z-12 max-[1050px]:w-69 max-[1050px]:shadow-[-14px_0_30px_#2437100c] max-[760px]:absolute max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:right-0 max-[760px]:w-75 max-[760px]:max-w-full max-[760px]:shadow-[-20px_0_70px_#24371025] max-[760px]:flex max-[480px]:**:data-[ui~=a-message-toolbar]:right-auto"
    >
      <div
        data-ui="a-panel-heading"
        className="flex items-center gap-2 min-h-13.75 py-3 px-4.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) text-(--a-muted) [&_h2]:flex-1 [&_h2]:text-[12px] [&_h2]:font-[550] [&_h2]:tracking-normal [&_h2]:text-(--a-text) [&_h2_span]:text-(--a-faint) [&_h2_span]:ml-1 [&_h2_span]:text-[10px] **:data-[ui~=a-icon-button]:w-5.75 **:data-[ui~=a-icon-button]:h-6"
      >
        <h2>
          The people here <span>{members.length}</span>
        </h2>
        <IconButton name="close" label="Close member list" onClick={onClose} />
      </div>
      <div
        data-ui="a-member-list"
        className="min-h-0 overflow-auto pt-0 pb-3.75 px-2.25 max-[760px]:flex-1"
      >
        {["online", "away", "offline"].map((status) => (
          <div
            data-ui="a-member-group"
            className="**:data-[ui~=a-sidebar-label]:mt-4.75 **:data-[ui~=a-sidebar-label]:mb-2 **:data-[ui~=a-sidebar-label]:mx-2.25 **:data-[ui~=a-sidebar-label]:text-[8px] **:data-[ui~=a-sidebar-label]:tracking-[0.6px]"
            key={status}
          >
            <span
              data-ui="a-sidebar-label"
              className="flex items-center justify-between gap-2 mt-6 mb-2.25 mx-2.25 text-(--a-faint) font-mono text-[9px] font-normal tracking-[1px] [&_button]:p-0 [&_button]:text-(--a-faint) [&_button]:bg-transparent [&_button]:flex [&_button:hover]:text-(--a-green)"
            >
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
                  data-ui="a-member"
                  className="flex items-center gap-2.5 w-full py-2.25 px-2 text-left bg-transparent rounded-[7px] hover:bg-(--a-hover) [&>span:nth-child(2)]:min-w-0 [&>span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[9px] [&_small]:text-(--a-faint) [&_small]:mt-0.75 [&_small]:truncate **:data-[ui~=avatar]:rounded-[10px] **:data-[ui~=avatar]:size-8 max-[1250px]:[&_small]:text-[8px]"
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
                    <span
                      data-ui="a-owner-star"
                      className="text-[#bd916b] text-[19px]"
                      title="Owner"
                    >
                      ✳
                    </span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
      {canManage && (
        <div
          data-ui="a-member-invite"
          className="relative border border-solid border-[#dbe2cf] rounded-lg bg-[#edf0e5] mb-4.5 mx-4.25 pt-4.5 pb-3.75 px-3.75 overflow-hidden mt-auto shrink-0 in-data-[ui~=theme-dark]:bg-(--a-soft) in-data-[ui~=theme-dark]:border-(--a-border) [&_h3]:text-[19px] [&_h3]:leading-[1.2] [&_h3]:font-medium [&_h3]:text-[#758461] [&_h3]:mb-4.75 [[data-ui~=theme-dark]_&_h3]:text-(--a-green) [&>svg]:absolute [&>svg]:top-6.25 [&>svg]:-right-2.5 [&>svg]:transform-[rotate(10deg)] [&>svg]:text-[#c4ceb2] **:data-[ui~=a-button]:text-[10px]! **:data-[ui~=a-button]:min-h-8.25 [[data-ui~=theme-dark]_&>svg]:text-[#555555] max-[1250px]:mx-3 max-[760px]:mt-3.75"
        >
          <h3>
            There’s always
            <br />
            room for one more.
          </h3>
          <button
            data-ui="a-button secondary full"
            className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=full]:w-full [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
            onClick={() =>
              setModal({ type: "invite", communityId: community.id })
            }
          >
            <AppIcon name="userAdd" size={17} />
            Invite a friend
          </button>
          <AppIcon name="sun" size={44} />
        </div>
      )}
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
  const { parent, replies, loadMessages, readOnly } = useApp((app) => ({
    parent: app.state.messages.find((m) => m.id === parentId),
    readOnly: dmReadOnly(app.state, conversation),
    replies: app.replies.get(parentId) ?? noReplies,
    loadMessages: app.loadMessages,
  }));
  useEffect(() => {
    void loadMessages(conversation, undefined, parentId);
  }, [conversation, parentId, loadMessages]);
  const scroll = useRef<HTMLDivElement>(null);

  return (
    <aside
      data-ui="a-detail-panel a-thread-panel"
      className="flex flex-col shrink-0 [border-left-width:1px] [border-left-style:solid] border-l-(--a-border) bg-(--a-bg) w-87.5 **:data-[ui~=a-message]:py-3.25 **:data-[ui~=a-message]:px-4.25 **:data-[ui~=a-message]:gap-2.25 [&_[data-ui~=a-message]_[data-ui~=avatar]]:rounded-[9px] [&_[data-ui~=a-message]_[data-ui~=avatar]]:text-[11px] [&_[data-ui~=a-message]_[data-ui~=avatar]]:size-7.25 **:data-[ui~=a-message-text]:text-[12px] **:data-[ui~=a-message-meta]:gap-1.25 [&_[data-ui~=a-message-meta]_time]:text-[8px] **:data-[ui~=a-moderator-tag]:hidden **:data-[ui~=a-composer-wrap]:p-3 **:data-[ui~=a-composer-wrap]:bg-(--a-bg) **:data-[ui~=a-empty]:min-h-62.5 **:data-[ui~=a-empty]:py-6.75 **:data-[ui~=a-empty]:px-2.5 **:data-[ui~=a-empty]:gap-3.25 [&_[data-ui~=a-empty]_h2]:text-[19px] [&_[data-ui~=a-empty]_p]:text-[12px] **:data-[ui~=a-empty-icon]:rounded-2xl **:data-[ui~=a-empty-icon]:size-13.25 min-[1600px]:w-91.25 max-[1250px]:w-77.5 max-[1050px]:absolute max-[1050px]:top-0 max-[1050px]:bottom-0 max-[1050px]:right-0 max-[1050px]:z-12 max-[1050px]:shadow-[-14px_0_30px_#2437100c] max-[1050px]:w-85 max-[760px]:absolute max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:right-0 max-[760px]:max-w-full max-[760px]:shadow-[-20px_0_70px_#24371025] max-[760px]:w-92.5 max-[760px]:**:data-[ui~=a-message-toolbar]:right-2 max-[760px]:**:data-[ui~=a-message-text]:text-[13px] max-[760px]:[&_[data-ui~=a-composer]>textarea]:text-[16px] max-[760px]:[&_[data-ui~=a-composer]>textarea::placeholder]:text-[12px] max-[760px]:**:data-[ui~=a-composer-footnote]:text-[8px] max-[480px]:w-full max-[480px]:**:data-[ui~=a-message-toolbar]:right-auto"
    >
      <div
        data-ui="a-panel-heading"
        className="flex items-center gap-2 min-h-13.75 py-3 px-4.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) text-(--a-muted) [&_h2]:flex-1 [&_h2]:text-[12px] [&_h2]:font-[550] [&_h2]:tracking-normal [&_h2]:text-(--a-text) [&_h2_span]:text-(--a-faint) [&_h2_span]:ml-1 [&_h2_span]:text-[10px] **:data-[ui~=a-icon-button]:w-5.75 **:data-[ui~=a-icon-button]:h-6"
      >
        <AppIcon name="reply" size={18} />
        <h2>A little side conversation</h2>
        <IconButton name="close" label="Close thread" onClick={onClose} />
      </div>
      <div
        data-ui="a-thread-scroll"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-0"
        ref={scroll}
      >
        {parent ? (
          <>
            <MessageCard message={parent} onThread={ignoreThread} compact />
            <div
              data-ui="a-date-divider"
              className="flex items-center gap-3.5 my-4.75 mx-7.5 text-(--a-faint) font-mono text-[8px] tracking-[0.6px] before:[content:''] before:flex-1 before:h-px before:bg-(--a-border) after:[content:''] after:flex-1 after:h-px after:bg-(--a-border) max-[760px]:mx-5.25 max-[480px]:mx-4.25 max-[480px]:text-[7px]"
            >
              <span>
                {replies.length} {replies.length === 1 ? "REPLY" : "REPLIES"}
              </span>
            </div>
            <VirtualMessages
              key={parentId}
              messages={replies}
              scrollRef={scroll}
              onThread={ignoreThread}
              compact
            />
            {replies.length === 0 && (
              <div
                data-ui="a-thread-empty"
                className="text-[12px] text-(--a-muted) p-5 text-center"
              >
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
      {parent && readOnly ? (
        <p className="shrink-0 border-t border-(--a-border) p-4 text-sm text-(--a-muted)">
          You can read this thread, but replies are unavailable.
        </p>
      ) : (
        parent && (
          <Composer
            key={parentId}
            conversation={conversation}
            threadOf={parentId}
            placeholder="Keep the thought going…"
          />
        )
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
        data-ui="a-form"
        className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
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
        <button
          type="submit"
          data-ui="a-button primary full"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
        >
          Save topic <AppIcon name="check" size={17} />
        </button>
      </form>
    </Dialog>
  );
}
