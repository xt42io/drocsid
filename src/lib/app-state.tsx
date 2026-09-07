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
  Community,
  DemoState,
  Message,
  Person,
} from "./demo-data";
import { defaults, type Action } from "./contracts";
import { api, ApiError } from "./api-client";
import { stateActions } from "./state-actions";

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
const empty: DemoState = {
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
  state: DemoState;
  setState: (next: SetStateAction<DemoState>) => Promise<boolean>;
  ready: boolean;
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
  react: (messageId: string, emoji: string) => void;
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
  const [state, renderState] = useState<DemoState>(empty);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const active = useRef(true);
  const refreshing = useRef<Promise<void> | null>(null);
  const historyLimit = useRef(500);
  const version = useRef(0);
  const failedMessages = useRef(
    new Map<string, { fingerprint: string; id: string }>(),
  );
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 5000);
  }, []);
  const apply = useCallback((next: DemoState) => {
    current.current = next;
    renderState(next);
  }, []);
  const refresh = useCallback(
    async function refreshState(): Promise<void> {
      if (!active.current || pending.current) return;
      if (refreshing.current) {
        await refreshing.current;
        return refreshState();
      }
      const started = version.current;
      const task = (async () => {
        try {
          const next = await api<DemoState>(
            `/api/app?limit=${historyLimit.current}`,
          );
          if (!active.current || pending.current || started !== version.current)
            return;
          apply({ ...next, drafts: current.current.drafts });
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
        }
      })();
      refreshing.current = task;
      await task;
    },
    [apply],
  );
  useEffect(() => {
    active.current = true;
    void refresh();
    const source = new EventSource("/api/events");
    source.onmessage = () => {
      void refresh();
    };
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      active.current = false;
      source.close();
      clearInterval(poll);
      clearTimeout(timer.current);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const execute = useCallback(
    (actions: Action[]) => {
      if (!actions.length) return Promise.resolve(true);
      pending.current++;
      version.current++;
      const job = queue.current.then(async () => {
        try {
          await api("/api/app", actions);
          return true;
        } catch (e) {
          notify(e instanceof Error ? e.message : "Could not save changes.");
          return false;
        } finally {
          pending.current--;
          if (!pending.current) await refresh();
        }
      });
      queue.current = job;
      return job;
    },
    [notify, refresh],
  );
  const setState = useCallback(
    (updater: SetStateAction<DemoState>) => {
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
        const page = await api<{ messages: Message[]; hasMore: boolean }>(
          `/api/messages?${params}`,
        );
        const merged = [
          ...new Map(
            [...current.current.messages, ...page.messages].map((m) => [
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
    const draftKey = threadOf ? `thread:${threadOf}` : conversation;
    const fingerprint = JSON.stringify([
      text.trim(),
      attachments.map((a) => a.id),
    ]);
    const old = failedMessages.current.get(draftKey);
    const id = old?.fingerprint === fingerprint ? old.id : crypto.randomUUID();
    failedMessages.current.set(draftKey, { fingerprint, id });
    const ok = await command({
      type: "message.send",
      id,
      conversation,
      text: text.trim(),
      threadOf,
      attachments: attachments.map((a) => a.id),
    });
    if (ok) {
      failedMessages.current.delete(draftKey);
      if (current.current.drafts[draftKey] === text)
        apply({
          ...current.current,
          drafts: { ...current.current.drafts, [draftKey]: "" },
        });
    }
    return ok;
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
      <main className="a-loading" role="status">
        {error ? (
          <div>
            <p>{error}</p>
            <button
              className="a-button primary"
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
        setState,
        ready,
        refresh,
        modal,
        setModal,
        toast,
        notify,
        findPerson,
        sendMessage,
        command,
        loadMessages,
        react: (id, emoji) => {
          void command({ type: "reaction", id, emoji });
        },
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
      {error && (
        <div role="status" className="a-connection-status">
          Connection interrupted. Retrying…
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
