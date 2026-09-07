import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, RefObject } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import {
  channelAtCaret,
  conversationChannels,
  mentionAtCaret,
  mentionTargets,
  searchChannels,
  searchMentions,
} from "../../lib/mentions";
import type { ComposerQuery, MentionTarget } from "../../lib/mentions";
import type { Channel } from "../../types/app";
import { useApp } from "../../lib/app-state";
import { AppIcon, PersonAvatar } from "./primitives";
import { WorkspacePortal } from "./floating-panel";

type Props = Omit<ComponentProps<"textarea">, "value" | "onChange" | "ref"> & {
  value: string;
  onValueChange: (value: string) => void;
  conversation: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

export function MentionTextarea({
  value,
  onValueChange,
  conversation,
  textareaRef,
  onKeyDown,
  ...props
}: Props) {
  const { state, notify } = useApp();
  const [query, setQuery] = useState<ComposerQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const ignoredStart = useRef<number | null>(null);
  const completedToken = useRef("");
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = textareaRef ?? localRef;
  const listId = useId();
  const targets = mentionTargets(state, conversation);
  const channels = conversationChannels(state, conversation);
  const matches: Array<
    | { kind: "mention"; target: MentionTarget }
    | { kind: "channel"; channel: Channel }
  > = query
    ? query.kind === "mention"
      ? searchMentions(targets, query.query).map((target) => ({
          kind: "mention",
          target,
        }))
      : searchChannels(channels, query.query).map((channel) => ({
          kind: "channel",
          channel,
        }))
    : [];
  const selectedIndex = Math.min(activeIndex, Math.max(0, matches.length - 1));
  function dismiss() {
    if (query) ignoredStart.current = query.start;
    completedToken.current = "";
    setQuery(null);
  }
  const { refs, floatingStyles, context } = useFloating({
    open: !!query,
    onOpenChange: (open) => {
      if (!open) dismiss();
    },
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(12),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(100, Math.min(340, availableHeight))}px`;
        },
      }),
    ],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useDismiss(context),
  ]);
  useEffect(() => {
    if (!value) {
      ignoredStart.current = null;
      completedToken.current = "";
      setQuery(null);
    }
  }, [value]);
  useEffect(() => {
    if (query)
      document
        .getElementById(`${listId}-${selectedIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, listId, query?.query]);
  function updateQuery(node: HTMLTextAreaElement) {
    const candidates =
      node.selectionStart === node.selectionEnd
        ? [
            mentionAtCaret(node.value, node.selectionStart),
            channels.length
              ? channelAtCaret(node.value, node.selectionStart)
              : null,
          ].filter((candidate): candidate is ComposerQuery => !!candidate)
        : [];
    const next = candidates.sort((a, b) => b.start - a.start)[0] ?? null;
    if (!next) {
      ignoredStart.current = null;
      completedToken.current = "";
      setQuery(null);
      return;
    }
    if (next.start === ignoredStart.current) {
      setQuery(null);
      return;
    }
    const hasMatches =
      next.kind === "mention"
        ? searchMentions(targets, next.query).length > 0
        : searchChannels(channels, next.query).length > 0;
    if (!hasMatches) {
      ignoredStart.current = next.start;
      completedToken.current = "";
      setQuery(null);
      return;
    }
    setQuery(next);
    if (next?.start !== query?.start || next?.query !== query?.query)
      setActiveIndex(0);
  }
  function select(match: (typeof matches)[number]) {
    if (!query) return;
    const insertion =
      match.kind === "mention"
        ? `@${match.target.handle} `
        : `#${match.channel.name} `;
    const next =
      value.slice(0, query.start) + insertion + value.slice(query.end);
    if (next.length > (props.maxLength ?? 4000)) {
      notify(
        "There isn’t enough room for that mention. Shorten your message first.",
      );
      return;
    }
    ignoredStart.current = query.start;
    completedToken.current = insertion;
    setQuery(null);
    onValueChange(next);
    requestAnimationFrame(() => {
      const caret = query.start + insertion.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  }
  return (
    <>
      <textarea
        {...props}
        {...getReferenceProps()}
        ref={(node) => {
          inputRef.current = node;
          refs.setReference(node);
        }}
        value={value}
        aria-autocomplete="list"
        aria-controls={query ? listId : undefined}
        aria-activedescendant={
          query && matches.length ? `${listId}-${selectedIndex}` : undefined
        }
        onChange={(event) => {
          if (
            ignoredStart.current !== null &&
            completedToken.current &&
            !event.target.value
              .slice(ignoredStart.current)
              .startsWith(completedToken.current)
          )
            ignoredStart.current = null;
          onValueChange(event.target.value);
          updateQuery(event.currentTarget);
        }}
        onSelect={(event) => updateQuery(event.currentTarget)}
        onBlur={(event) => {
          setQuery(null);
          props.onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (query) {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              dismiss();
              return;
            }
            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              matches.length
            ) {
              event.preventDefault();
              setActiveIndex(
                (selectedIndex +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  matches.length) %
                  matches.length,
              );
              return;
            }
            if (
              (event.key === "Enter" || event.key === "Tab") &&
              !event.shiftKey &&
              matches.length
            ) {
              event.preventDefault();
              select(matches[selectedIndex]);
              return;
            }
          }
          onKeyDown?.(event);
        }}
      />
      {query && (
        <WorkspacePortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            data-ui="a-mention-suggestions"
            className="z-80 border border-solid border-(--a-border) rounded-xl bg-(--a-surface) text-(--a-text) shadow-[0_12px_45px_#00000026] overflow-hidden whitespace-normal w-[min(370px,calc(100vw-24px))] overflow-y-auto p-1.5 [&>header]:flex [&>header]:flex-wrap [&>header]:items-center [&>header]:justify-between [&>header]:gap-1.25 [&>header]:pt-2.5 [&>header]:pb-3 [&>header]:px-2.25 [&>header]:text-(--a-muted) [&>header]:text-[11px] [&>header>span]:text-[9px]"
            {...getFloatingProps()}
          >
            <header>
              <strong>
                {query.kind === "mention"
                  ? "Mention someone"
                  : "Mention a channel"}
              </strong>
              <span>↑ ↓ to browse · Enter to choose</span>
            </header>
            <div
              role="listbox"
              id={listId}
              aria-label={
                query.kind === "mention"
                  ? "Mention suggestions"
                  : "Channel suggestions"
              }
            >
              {matches.map((match, index) => (
                <button
                  key={
                    match.kind === "mention"
                      ? `mention-${match.target.key}`
                      : `channel-${match.channel.id}`
                  }
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  tabIndex={-1}
                  data-ui={`a-mention-option ${index === selectedIndex ? "selected" : ""}`}
                  className="flex items-center gap-2.75 w-full p-2.25 rounded-[7px] bg-transparent text-(--a-text) text-left data-[ui~=selected]:bg-(--a-selected) [&>span:nth-child(2)]:min-w-0 [&>span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:wrap-anywhere [&_strong]:text-[12px] [&_strong]:font-[550] [&_small]:block [&_small]:wrap-anywhere [&_small]:text-[10px] [&_small]:mt-1 [&_small]:text-(--a-muted) **:data-[ui~=avatar]:rounded-[10px] **:data-[ui~=avatar]:text-[13px] **:data-[ui~=avatar]:size-8"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(match)}
                  onMouseMove={() => setActiveIndex(index)}
                >
                  {match.kind === "channel" ? (
                    <span
                      data-ui="a-mention-group-icon"
                      className="rounded-[10px] text-[13px] flex items-center justify-center shrink-0 text-(--a-green) bg-(--a-soft) size-8"
                    >
                      <AppIcon
                        name={match.channel.private ? "lock" : "hash"}
                        size={20}
                      />
                    </span>
                  ) : match.target.kind === "person" ? (
                    <PersonAvatar person={match.target.person} presence />
                  ) : (
                    <span
                      data-ui="a-mention-group-icon"
                      className="rounded-[10px] text-[13px] flex items-center justify-center shrink-0 text-(--a-green) bg-(--a-soft) size-8"
                    >
                      <AppIcon
                        name={
                          match.target.handle === "admin" ? "shield" : "people"
                        }
                        size={20}
                      />
                    </span>
                  )}
                  <span>
                    <strong>
                      {match.kind === "channel"
                        ? `#${match.channel.name}`
                        : match.target.kind === "person"
                          ? match.target.person.name
                          : `@${match.target.handle}`}
                    </strong>
                    <small>
                      {match.kind === "channel"
                        ? match.channel.description
                        : match.target.kind === "person"
                          ? `@${match.target.handle}`
                          : match.target.description}
                    </small>
                  </span>
                  {match.kind === "mention" &&
                    match.target.kind === "group" && (
                      <span
                        data-ui="a-role-tag"
                        className="inline-block py-0.75 px-1.75 border border-solid border-(--a-border) rounded-sm bg-(--a-soft) text-[9px] text-(--a-muted)"
                      >
                        {match.target.people.length}
                      </span>
                    )}
                </button>
              ))}
            </div>
          </div>
        </WorkspacePortal>
      )}
    </>
  );
}
