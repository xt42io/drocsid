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
  label: customLabel,
  value,
  disabled = false,
}: {
  onSelect: (emoji: string) => void;
  reaction?: boolean;
  label?: string;
  value?: string;
  disabled?: boolean;
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
  const label = customLabel ?? (reaction ? "Add a reaction" : "Add an emoji");
  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        disabled={disabled}
        data-ui={`a-icon-button a-emoji-trigger ${open ? "is-active" : ""}`}
        className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green) data-[ui~=is-active]:bg-(--a-hover) data-[ui~=is-active]:text-(--a-green)"
        title={label}
        aria-label={label}
        {...getReferenceProps()}
      >
        {value ? (
          <span className="text-xl" aria-hidden="true">
            {value}
          </span>
        ) : (
          <AppIcon name="smile" size={reaction ? 17 : 20} />
        )}
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
              data-ui={`a-emoji-panel ${reaction && !expanded ? "a-quick-reactions" : ""}`}
              className="z-80 border border-solid border-(--a-border) rounded-xl bg-(--a-surface) text-(--a-text) shadow-[0_12px_45px_#00000026] overflow-hidden whitespace-normal w-[min(352px,calc(100vw-24px))] data-[ui~=a-quick-reactions]:w-auto data-[ui~=a-quick-reactions]:rounded-[9px] [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:gap-2.5 [&>header]:py-1.75 [&>header]:pr-2.5 [&>header]:pl-4 [&>header]:[border-bottom-width:1px] [&>header]:[border-bottom-style:solid] [&>header]:border-b-(--a-border) [&>header]:text-[12px] [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-text-color:var(--a-text)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-text-color:var(--a-text)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-picker-border-color:transparent]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-picker-border-color:transparent]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-picker-border-radius:0]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-highlight-color:var(--a-orange)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-highlight-color:var(--a-orange)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-hover-bg-color:var(--a-hover)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-hover-bg-color:var(--a-hover)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-focus-bg-color:var(--a-selected)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-focus-bg-color:var(--a-selected)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-input-bg-color:var(--a-soft)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-search-input-bg-color:var(--a-soft)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-input-bg-color-active:var(--a-soft)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-search-input-bg-color-active:var(--a-soft)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-input-text-color:var(--a-text)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-input-placeholder-color:var(--a-muted)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-border-color:var(--a-border)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-border-color-active:var(--a-orange)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-category-label-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-category-label-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-category-label-text-color:var(--a-muted)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-category-icon-active-color:var(--a-orange)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-category-icon-active-color:var(--a-orange)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-skin-tone-picker-menu-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-skin-tone-picker-menu-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-emoji-variation-picker-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-dark-emoji-variation-picker-bg-color:var(--a-surface)]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-emoji-size:27px]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-category-label-height:32px]! [[data-ui~=workspace]_&_.EmojiPickerReact]:[--epr-search-input-height:38px]! [[data-ui~=workspace]_&_.EmojiPickerReact]:font-sans! [[data-ui~=workspace]_&_.EmojiPickerReact]:border-0! [[data-ui~=workspace]_&_.EmojiPickerReact]:border-none! [[data-ui~=workspace]_&_.EmojiPickerReact]:border-[currentColor]! [[data-ui~=workspace]_&_h2]:text-[12px]! [[data-ui~=workspace]_&_h2]:font-[550]! [[data-ui~=workspace]_&_h2]:tracking-normal! [[data-ui~=workspace]_&_input:focus]:border-(--a-orange)! [[data-ui~=workspace]_&_input:focus]:shadow-none! [[data-ui~=workspace]_&_[role='tab']]:text-(--a-muted)! [[data-ui~=workspace]_&_[role='tab'][aria-selected='true']]:text-(--a-orange)! max-[480px]:[[data-ui~=workspace]_&_input]:text-[16px]!"
              {...getFloatingProps({
                "aria-label": reaction ? "Choose a reaction" : "Emoji picker",
              })}
            >
              {reaction && !expanded ? (
                <div
                  data-ui="a-quick-reaction-list"
                  className="flex items-center gap-0.75 p-1.5 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:p-0 [&>button]:rounded-md [&>button]:bg-transparent [&>button]:text-(--a-muted) [&>button]:text-[21px] [&>button]:size-9 [&>button:hover]:bg-(--a-hover) [&>button:focus-visible]:bg-(--a-hover) *:data-[ui~=a-more-reactions]:[border-left-width:1px] *:data-[ui~=a-more-reactions]:[border-left-style:solid] *:data-[ui~=a-more-reactions]:border-l-(--a-border) *:data-[ui~=a-more-reactions]:rounded-[0_6px_6px_0] *:data-[ui~=a-more-reactions]:ml-0.75 *:data-[ui~=a-more-reactions]:w-8.5"
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
                    data-ui="a-more-reactions"
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
                      <div
                        data-ui="a-emoji-loading"
                        className="min-h-62.5 grid place-items-center text-(--a-muted) text-[13px]"
                        role="status"
                      >
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
