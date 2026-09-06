import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { initialState } from "./demo-data";
import type { Community, DemoState, Message, Person } from "./demo-data";

const STORAGE_KEY = "drocsid-design-preview-v1";
export type ModalState =
  | { type: "create-community" | "new-message" | "add-friend" | "help" }
  | { type: "create-channel"; communityId: string; group?: string }
  | { type: "create-category"; communityId: string }
  | { type: "invite"; communityId: string }
  | { type: "profile"; personId: string }
  | {
      type: "confirm";
      title: string;
      description: string;
      label: string;
      action: () => void;
    }
  | null;
type AppContextValue = {
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  ready: boolean;
  modal: ModalState;
  setModal: Dispatch<SetStateAction<ModalState>>;
  toast: string;
  notify: (message: string) => void;
  findPerson: (id: string) => Person;
  sendMessage: (conversation: string, text: string, threadOf?: string) => void;
  react: (messageId: string, emoji: string) => void;
  updateMessage: (messageId: string, patch: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  joinCommunity: (id: string) => Community | undefined;
  reset: () => void;
};
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageWarning = useRef(false);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DemoState;
        if (
          parsed.version === 1 &&
          typeof parsed.profile?.name === "string" &&
          Array.isArray(parsed.people) &&
          Array.isArray(parsed.messages) &&
          Array.isArray(parsed.communities) &&
          parsed.communities.every(
            (c) => typeof c.id === "string" && Array.isArray(c.channels),
          ) &&
          Array.isArray(parsed.friends) &&
          Array.isArray(parsed.activities) &&
          parsed.preferences &&
          parsed.drafts
        ) {
          const defaults = initialState();
          setState({
            ...defaults,
            ...parsed,
            preferences: { ...defaults.preferences, ...parsed.preferences },
          });
        }
      }
    } catch {
      /* A damaged or unavailable local preview starts fresh. */
    }
    setReady(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      if (!storageWarning.current) {
        storageWarning.current = true;
        notify(
          "Your changes work here, but browser storage is full or unavailable.",
        );
      }
    }
  }, [state, ready]);
  const findPerson = (id: string) =>
    id === "you"
      ? {
          ...state.profile,
          activity: state.preferences.activity ? state.profile.activity : "",
        }
      : (state.people.find((p) => p.id === id) ?? {
          id,
          name: "Former member",
          handle: "former-member",
          color: "green",
          status: "offline" as const,
          bio: "",
          activity: "",
          role: "Member" as const,
        });
  function sendMessage(conversation: string, text: string, threadOf?: string) {
    if (!text.trim()) return;
    const message: Message = {
      id: crypto.randomUUID(),
      conversation,
      author: "you",
      text: text.trim().slice(0, 4000),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      reactions: [],
      ...(threadOf ? { threadOf } : {}),
    };
    setState((previous) => ({
      ...previous,
      messages: [...previous.messages, message],
      drafts: {
        ...previous.drafts,
        [threadOf ? `thread:${threadOf}` : conversation]: "",
      },
    }));
  }
  function react(messageId: string, emoji: string) {
    setState((previous) => ({
      ...previous,
      messages: previous.messages.map((message) => {
        if (message.id !== messageId) return message;
        const existing = message.reactions.find(
          (reaction) => reaction.emoji === emoji,
        );
        return {
          ...message,
          reactions: existing
            ? message.reactions
                .map((reaction) =>
                  reaction.emoji === emoji
                    ? {
                        ...reaction,
                        count: reaction.count + (reaction.mine ? -1 : 1),
                        mine: !reaction.mine,
                      }
                    : reaction,
                )
                .filter((reaction) => reaction.count > 0)
            : [...message.reactions, { emoji, count: 1, mine: true }],
        };
      }),
    }));
  }
  function updateMessage(messageId: string, patch: Partial<Message>) {
    setState((previous) => ({
      ...previous,
      messages: previous.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    }));
  }
  function deleteMessage(messageId: string) {
    setState((previous) => ({
      ...previous,
      messages: previous.messages.filter(
        (message) => message.id !== messageId && message.threadOf !== messageId,
      ),
    }));
    notify("Message deleted.");
  }
  function joinCommunity(id: string) {
    const community = state.communities.find((c) => c.id === id);
    if (!community) return;
    setState((previous) => ({
      ...previous,
      communities: previous.communities.map((c) =>
        c.id === id ? { ...c, joined: true } : c,
      ),
    }));
    if (!community.joined) notify(`You’ve found a spot in ${community.name}.`);
    return community;
  }
  function reset() {
    setState(initialState());
    setModal(null);
    notify("A fresh start. The original demo is back.");
  }
  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        ready,
        modal,
        setModal,
        toast,
        notify,
        findPerson,
        sendMessage,
        react,
        updateMessage,
        deleteMessage,
        joinCommunity,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside AppProvider");
  return value;
}
