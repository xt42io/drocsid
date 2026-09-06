import { lazy, Suspense, useState } from "react";
import type { EmojiStyle, SuggestionMode, Theme } from "emoji-picker-react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { AppIcon, IconButton } from "./primitives";
import { WorkspacePortal } from "./floating-panel";
import { useApp } from "../../lib/app-state";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const quickReactions = ["🧡", "👍", "😂", "🎉", "👀"];

export function EmojiPanel({
  onSelect,
  reaction = false,
}: {
  onSelect: (emoji: string) => void;
  reaction?: boolean;
}) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  function close() {
    setOpen(false);
    setExpanded(false);
  }
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setExpanded(false);
    },
    placement: reaction ? "top-end" : "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableHeight, elements }) {
          elements.floating.style.setProperty(
            "--emoji-picker-height",
            `${Math.max(180, Math.min(390, availableHeight - 44))}px`,
          );
        },
      }),
    ],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context),
  ]);
  const label = reaction ? "Add a reaction" : "Add an emoji";
  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        className={`a-icon-button a-emoji-trigger ${open ? "is-active" : ""}`}
        title={label}
        aria-label={label}
        {...getReferenceProps()}
      >
        <AppIcon name="smile" size={reaction ? 17 : 20} />
      </button>
      {open && (
        <WorkspacePortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={`a-emoji-panel ${reaction && !expanded ? "a-quick-reactions" : ""}`}
              {...getFloatingProps({
                "aria-label": reaction ? "Choose a reaction" : "Emoji picker",
              })}
            >
              {reaction && !expanded ? (
                <div
                  className="a-quick-reaction-list"
                  aria-label="Quick reactions"
                >
                  {quickReactions.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      title={`React ${emoji}`}
                      aria-label={`React ${emoji}`}
                      onClick={() => {
                        onSelect(emoji);
                        close();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="a-more-reactions"
                    title="More reactions"
                    aria-label="More reactions"
                    onClick={() => setExpanded(true)}
                  >
                    <AppIcon name="more" size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <header>
                    <strong>
                      {reaction
                        ? "Add a reaction"
                        : "Find the right expression"}
                    </strong>
                    <IconButton
                      name="close"
                      label="Close emoji panel"
                      onClick={close}
                    />
                  </header>
                  <Suspense
                    fallback={
                      <div className="a-emoji-loading" role="status">
                        Loading emoji…
                      </div>
                    }
                  >
                    <EmojiPicker
                      theme={state.preferences.theme as Theme}
                      emojiStyle={"native" as EmojiStyle}
                      width="100%"
                      height="var(--emoji-picker-height, 390px)"
                      searchPlaceHolder="Search all emoji"
                      autoFocusSearch
                      suggestedEmojisMode={"recent" as SuggestionMode}
                      previewConfig={{ showPreview: false }}
                      categoryIcons={{
                        suggested: <AppIcon name="reset" />,
                        smileys_people: <AppIcon name="smile" />,
                        animals_nature: <AppIcon name="leaf" />,
                        food_drink: <AppIcon name="coffee" />,
                        travel_places: <AppIcon name="discover" />,
                        activities: <AppIcon name="game" />,
                        objects: <AppIcon name="book" />,
                        symbols: <AppIcon name="heart" />,
                        flags: <AppIcon name="flag" />,
                      }}
                      onEmojiClick={(data) => {
                        onSelect(data.emoji);
                        close();
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          </FloatingFocusManager>
        </WorkspacePortal>
      )}
    </>
  );
}
