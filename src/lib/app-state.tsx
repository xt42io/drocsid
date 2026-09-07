import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  Attachment,
  Channel,
  Community,
  AppState,
  Message,
  Person,
} from "../types/app";
import { defaults, type Action } from "./contracts";
import { api, ApiError } from "./api-client";
import { stateActions } from "./state-actions";
import { applyChannel, type ChannelWriteResult } from "./channels";
import {
  PendingReactions,
  replaceReaction,
  type ReactionResult,
} from "./reactions";
import { dmReadOnly } from "./direct-messages";
import {
  reconcileMessages,
  enqueueMessage,
  replaceMessage,
} from "./pending-messages";

import { AttachmentPreviews } from "./attachment-previews";
import { RealtimeClient } from "./realtime-client";
import { applyLiveMessage, applyLiveRead } from "./live-state";
import type { MessageUpdate, Room, TypingPerson } from "./realtime-protocol";

export type ModalState =
  | { type: "create-community" | "new-message" | "add-friend" | "help" }
  | { type: "create-channel"; communityId: string; group?: string }
  | { type: "create-category" | "invite"; communityId: string }
  | { type: "profile"; personId: string }
  | {
      type: "confirm";
      title: string;
      description: string;
      label: string;
      action: () => void;
    }
  | null;
const empty: AppState = {
  version: 1,
  profile: {
    id: "you",
    name: "",
    handle: "",
    color: "purple",
    status: "offline",
    bio: "",
    activity: "",
    role: "Member",
  },
  people: [],
  communities: [],
  messages: [],
  friends: [],
  dmConversations: [],
  pending: [],
  outgoing: [],
  blocked: [],
  activities: [],
  preferences: defaults,
  muted: [],
  drafts: {},
  onboardingComplete: false,
};
type AppContextValue = {
  state: AppState;
  attachmentPreviews: AttachmentPreviews;
  setState: (next: SetStateAction<AppState>) => Promise<boolean>;
  ready: boolean;
  typingPeople: TypingPerson[];
  observeRoom: (room: Room) => () => void;
  setTyping: (room: Room, active: boolean) => void;
  refresh: () => Promise<void>;
  modal: ModalState;
  setModal: Dispatch<SetStateAction<ModalState>>;
  toast: string;
  notify: (message: string) => void;
  findPerson: (id: string) => Person;
  sendMessage: (
    conversation: string,
    text: string,
    threadOf?: string,
    attachments?: Attachment[],
  ) => Promise<boolean>;
  retryMessage: (messageId: string) => Promise<boolean>;
  react: (messageId: string, emoji: string) => void;
  createChannel: (communityId: string, channel: Channel) => Promise<boolean>;
  updateMessage: (
    messageId: string,
    patch: Partial<Message>,
  ) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  joinCommunity: (id: string) => Promise<Community | undefined>;
  command: (action: Action) => Promise<boolean>;
  loadMessages: (
    conversation: string,
    before?: string,
    target?: string,
  ) => Promise<boolean>;
  reset: () => void;
};
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, renderState] = useState<AppState>(empty);
  const [attachmentPreviews] = useState(() => new AttachmentPreviews());
  useEffect(() => () => attachmentPreviews.clear(), [attachmentPreviews]);
  useEffect(() => {
    attachmentPreviews.prune(
      new Set(
        state.messages.flatMap((message) =>
          (message.attachments ?? [])
            .filter((file) => file.contentType.startsWith("image/"))
            .map((file) => file.id),
        ),
      ),
    );
  }, [attachmentPreviews, state.messages]);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [typingPeople, setTypingPeople] = useState<TypingPerson[]>([]);
  const realtime = useRef<RealtimeClient | null>(null);
  const liveMessages = useRef(new Map<string, MessageUpdate>());
  const livePresence = useRef(new Map<string, Person["status"]>());
  const liveReads = useRef(new Map<string, string>());
  const receivedAt = useRef(new Map<string, number>());
  const messageRevision = useRef(0);
  const needsRefresh = useRef(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const active = useRef(true);
  const refreshing = useRef<Promise<void> | null>(null);
  const localMessages = useRef(new Map<string, Message>());
  const historyLimit = useRef(500);
  const version = useRef(0);
  const inFlightMessages = useRef(new Set<string>());
  const pendingReactions = useRef(new PendingReactions());
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 5000);
  }, []);
  const apply = useCallback((next: AppState) => {
    const rendered = {
      ...next,
      messages: pendingReactions.current.overlay(next.messages),
    };
    current.current = rendered;
    renderState(rendered);
  }, []);
  const refresh = useCallback(
    async function refreshState(): Promise<void> {
      if (!active.current) return;
      if (pending.current) {
        needsRefresh.current = true;
        return;
      }
      if (refreshing.current) {
        await refreshing.current;
        return refreshState();
      }
      needsRefresh.current = false;
      liveMessages.current.clear();
      liveReads.current.clear();
      const started = version.current;
      const task = (async () => {
        try {
          const next = await api<AppState>(
            `/api/app?limit=${historyLimit.current}`,
          );
          if (!active.current) return;
          if (pending.current || started !== version.current) {
            needsRefresh.current = true;
            return;
          }
          pendingReactions.current.observe(next.messages);
          let merged = {
            ...next,
            messages: reconcileMessages(next.messages, localMessages.current),
            drafts: current.current.drafts,
          };
          for (const update of liveMessages.current.values())
            merged = applyLiveMessage(merged, update);
          for (const [conversation, through] of liveReads.current)
            merged = applyLiveRead(merged, conversation, through);
          merged.people = merged.people.map((p) => ({
            ...p,
            status: livePresence.current.get(p.id) ?? p.status,
          }));
          apply(merged);
          setReady(true);
          setError("");
        } catch (e) {
          if (!active.current) return;
          if (e instanceof ApiError && e.status === 401) {
            window.location.assign(
              `/sign-in?next=${encodeURIComponent(window.location.pathname)}`,
            );
            return;
          }
          setError(e instanceof Error ? e.message : "Could not connect.");
        } finally {
          refreshing.current = null;
          if (needsRefresh.current && !pending.current && active.current)
            queueMicrotask(() => {
              void refreshState();
            });
        }
      })();
      refreshing.current = task;
      await task;
    },
    [apply],
  );
  useEffect(() => {
    active.current = true;
    const bootstrapFallback = setTimeout(() => {
      if (!realtime.current?.isConnected) void refresh();
    }, 5000);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refresh();
      }, 100);
    };
    const client = new RealtimeClient(
      (frame) => {
        if (frame.type === "message") {
          receivedAt.current.set(frame.id, ++messageRevision.current);
          liveMessages.current.set(frame.id, frame);
          localMessages.current.delete(frame.id);
          if (frame.message) pendingReactions.current.observe([frame.message]);
          apply(applyLiveMessage(current.current, frame));
        } else if (frame.type === "read") {
          liveReads.current.set(frame.conversation, frame.through);
          apply(
            applyLiveRead(current.current, frame.conversation, frame.through),
          );
        } else if (frame.type === "typing") setTypingPeople(frame.people);
        else if (frame.type === "presence") {
          livePresence.current.set(frame.userId, frame.status);
          // Keep the viewer's chosen status; their connection does not edit that preference.
          apply({
            ...current.current,
            people: current.current.people.map((p) =>
              p.id === frame.userId ? { ...p, status: frame.status } : p,
            ),
          });
        } else if (frame.type === "invalidate") scheduleRefresh();
      },
      (online) => {
        setConnected(online);
        if (online) scheduleRefresh();
        else {
          setTypingPeople([]);
          livePresence.current.clear();
        }
      },
    );
    realtime.current = client;
    client.start();
    // Expire typing locally too, including suspended tabs and lost stop packets.
    const expiry = setInterval(
      () =>
        setTypingPeople((previous) =>
          previous.some((p) => p.expiresAt <= Date.now())
            ? previous.filter((p) => p.expiresAt > Date.now())
            : previous,
        ),
      1000,
    );
    const focus = () => {
      if (!client.isConnected) void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      active.current = false;
      realtime.current = null;
      client.close();
      clearInterval(expiry);
      clearTimeout(bootstrapFallback);
      clearTimeout(refreshTimer);
      clearTimeout(timer.current);
      window.removeEventListener("focus", focus);
    };
  }, [apply, refresh]);
  const observeRoom = useCallback(
    (room: Room) => realtime.current?.observe(room) ?? (() => {}),
    [],
  );
  const setTyping = useCallback((room: Room, typing: boolean) => {
    realtime.current?.setTyping(room, typing);
  }, []);

  const execute = useCallback(
    (actions: Action[]) => {
      if (!actions.length) return Promise.resolve(true);
      pending.current++;
      version.current++;
      const job = queue.current.then(async () => {
        let failed = false;
        try {
          await api("/api/app", actions);
          return true;
        } catch (e) {
          failed = true;
          notify(e instanceof Error ? e.message : "Could not save changes.");
          return false;
        } finally {
          pending.current--;
          const hasDelta = actions.every((a) =>
            [
              "message.update",
              "message.delete",
              "reaction",
              "conversation.read",
            ].includes(a.type),
          );
          if (
            !pending.current &&
            (failed ||
              needsRefresh.current ||
              !hasDelta ||
              !realtime.current?.isConnected)
          )
            await refresh();
        }
      });
      queue.current = job;
      return job;
    },
    [notify, refresh],
  );
  const createChannel = useCallback(
    async (communityId: string, channel: Channel) => {
      pending.current++;
      version.current++;
      try {
        const result = await api<ChannelWriteResult>(
          "/api/app",
          [{ type: "channel.put", communityId, channel }],
          AbortSignal.timeout(15000),
        );
        if (active.current) apply(applyChannel(current.current, result));
        return true;
      } catch (error) {
        if (active.current)
          notify(
            error instanceof Error
              ? error.message
              : "Could not create channel.",
          );
        return false;
      } finally {
        pending.current--;
        version.current++;
        // The confirmed channel is already available locally. Reconcile member
        // updates in the background instead of holding the creation dialog open.
        if (!pending.current && active.current) void refresh();
      }
    },
    [apply, notify, refresh],
  );

  const react = useCallback(
    (id: string, emoji: string) => {
      const message = current.current.messages.find((m) => m.id === id);
      if (
        !message ||
        message.sending ||
        message.sendError ||
        dmReadOnly(current.current, message.conversation)
      )
        return;
      const start = pendingReactions.current.toggle(message, emoji);
      version.current++;
      apply(current.current);
      if (!start) return;
      void (async () => {
        let selection;
        while ((selection = pendingReactions.current.next(id, emoji))) {
          try {
            const result = await api<ReactionResult>(
              "/api/reactions",
              { id, emoji, active: selection.active },
              AbortSignal.timeout(15000),
            );
            const confirmed = pendingReactions.current.acknowledge(
              result,
              selection.observed,
            );
            version.current++;
            receivedAt.current.set(id, ++messageRevision.current);
            if (active.current)
              apply({
                ...current.current,
                messages: replaceReaction(current.current.messages, confirmed),
              });
          } catch (error) {
            const previous = pendingReactions.current.reject(id, emoji);
            version.current++;
            if (active.current) {
              apply({
                ...current.current,
                messages: replaceReaction(current.current.messages, previous),
              });
              notify(
                error instanceof Error
                  ? error.message
                  : "Could not update reaction.",
              );
              // Resolve uncertain network failures against the server without
              // rolling back other reactions or messages that arrived meanwhile.
              void refresh();
            }
            break;
          }
          if (!active.current) break;
        }
      })();
    },
    [apply, notify, refresh],
  );

  const setState = useCallback(
    (updater: SetStateAction<AppState>) => {
      const previous = current.current;
      const next = typeof updater === "function" ? updater(previous) : updater;
      const actions = stateActions(previous, next);
      apply(next);
      return execute(actions);
    },
    [apply, execute],
  );
  const command = useCallback((action: Action) => execute([action]), [execute]);
  const loadMessages = useCallback(
    async (conversation: string, before?: string, target?: string) => {
      try {
        if (conversation.startsWith("dm:") && !before && !target)
          await api("/api/app", [{ type: "conversation.open", conversation }]);
        if (before)
          historyLimit.current = Math.min(
            5000,
            Math.max(
              historyLimit.current + 50,
              current.current.messages.length + 50,
            ),
          );
        const params = new URLSearchParams({
          conversation,
          ...(before ? { before } : {}),
          ...(target ? { target } : {}),
        });
        const started = messageRevision.current;
        const page = await api<{ messages: Message[]; hasMore: boolean }>(
          `/api/messages?${params}`,
        );
        const freshMessages = page.messages.filter(
          (m) => (receivedAt.current.get(m.id) ?? 0) <= started,
        );
        pendingReactions.current.observe(freshMessages);
        const merged = [
          ...new Map(
            [...current.current.messages, ...freshMessages].map((m) => [
              m.id,
              m,
            ]),
          ).values(),
        ].sort(
          (a, b) =>
            (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
            a.id.localeCompare(b.id),
        );
        apply({ ...current.current, messages: merged });
        return page.hasMore;
      } catch (e) {
        notify(e instanceof Error ? e.message : "Could not load messages.");
        return false;
      }
    },
    [apply, notify],
  );
  async function sendMessage(
    conversation: string,
    text: string,
    threadOf?: string,
    attachments: Attachment[] = [],
  ) {
    if (!text.trim() && !attachments.length) return false;
    const id = crypto.randomUUID();
    const optimistic: Message = {
      id,
      conversation,
      author: "you",
      text: text.trim(),
      threadOf,
      attachments,
      reactions: [],
      time: "",
      createdAt: new Date().toISOString(),
      sending: true,
    };
    localMessages.current.set(id, optimistic);
    apply(enqueueMessage(current.current, optimistic));
    return deliverMessage(optimistic);
  }
  async function retryMessage(id: string) {
    const failed = localMessages.current.get(id);
    if (!failed?.sendError || inFlightMessages.current.has(id)) return false;
    const message = { ...failed, sending: true, sendError: undefined };
    localMessages.current.set(id, message);
    apply(replaceMessage(current.current, id, message));
    return deliverMessage(message);
  }
  async function deliverMessage(message: Message) {
    const { id, conversation, text, threadOf, attachments = [] } = message;
    inFlightMessages.current.add(id);
    pending.current++;
    version.current++;
    try {
      const action: Extract<Action, { type: "message.send" }> = {
        type: "message.send",
        id,
        conversation,
        text: text.trim(),
        threadOf,
        attachments: attachments.map((a) => a.id),
      };
      let result: { message: Message | null };
      try {
        if (!realtime.current?.isConnected)
          throw new ApiError(0, "Not connected.");
        result = await realtime.current.send(action);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 0) throw error;
        // An uncertain socket acknowledgement retries the same idempotency key.
        result = await api<{ message: Message | null }>(
          "/api/messages",
          action,
        );
      }
      const live = liveMessages.current.get(id);
      const confirmed = live ? live.message : result.message;
      if (confirmed && !live) localMessages.current.set(id, confirmed);
      else localMessages.current.delete(id);
      receivedAt.current.set(id, ++messageRevision.current);
      apply(replaceMessage(current.current, id, confirmed));
      return true;
    } catch (e) {
      // A committed broadcast can arrive even when its acknowledgement is lost.
      if (
        current.current.messages.some(
          (m) => m.id === id && !m.sending && !m.sendError,
        )
      )
        return true;
      const failed = {
        ...message,
        sending: false,
        sendError:
          e instanceof Error ? e.message : "Message not sent. Please retry.",
      };
      localMessages.current.set(id, failed);
      apply(replaceMessage(current.current, id, failed));
      return false;
    } finally {
      inFlightMessages.current.delete(id);
      pending.current--;
      if (
        !pending.current &&
        (needsRefresh.current || !realtime.current?.isConnected)
      )
        void refresh();
    }
  }
  function findPerson(id: string): Person {
    return id === "you"
      ? state.profile
      : (state.people.find((p) => p.id === id) ?? {
          id,
          name: "Former member",
          handle: "former-member",
          color: "purple",
          status: "offline",
          bio: "",
          activity: "",
          role: "Member",
        });
  }
  if (!ready)
    return (
      <main
        data-ui="a-loading"
        className="h-full flex justify-center items-center text-(--a-muted) text-[14px]"
        role="status"
      >
        {error ? (
          <div>
            <p>{error}</p>
            <button
              data-ui="a-button primary"
              className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
              onClick={() => {
                void refresh();
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          "Finding your little corner…"
        )}
      </main>
    );
  return (
    <AppContext.Provider
      value={{
        state,
        attachmentPreviews,
        setState,
        ready,
        typingPeople,
        observeRoom,
        setTyping,
        refresh,
        modal,
        setModal,
        toast,
        notify,
        findPerson,
        sendMessage,
        retryMessage,
        command,
        loadMessages,
        react,
        createChannel,
        updateMessage: (id, patch) =>
          command({
            type: "message.update",
            id,
            text: patch.text,
            pinned: patch.pinned,
            saved: patch.saved,
          }),
        deleteMessage: (id) => command({ type: "message.delete", id }),
        joinCommunity: async (id) =>
          (await command({ type: "community.join", id }))
            ? current.current.communities.find((c) => c.id === id)
            : undefined,
        reset: () => {
          apply({ ...current.current, drafts: {} });
          notify("Unsent drafts cleared.");
        },
      }}
    >
      {(error || !connected) && (
        <div
          role="status"
          data-ui="a-connection-status"
          className="fixed z-100 top-2.5 left-1/2 transform-[translateX(-50%)] py-2.5 px-4.5 bg-[#f7b267] text-[#171717] rounded-lg text-[13px]"
        >
          Reconnecting to live chat…
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside AppProvider");
  return value;
}
