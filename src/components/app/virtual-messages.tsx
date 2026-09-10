import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Message } from "../../types/app";
import { MessageCard } from "./conversation";

function estimatedMessageSize(message: Message, compact: boolean) {
  return message.attachments?.length ? 300 : compact ? 64 : 72;
}

export const VirtualMessages = memo(function VirtualMessages({
  messages,
  scrollRef,
  highlighted,
  onThread,
  compact = false,
}: {
  messages: Message[];
  scrollRef: RefObject<HTMLDivElement | null>;
  highlighted?: string;
  onThread: (id: string) => void;
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [margin, setMargin] = useState(0);
  const [focused, setFocused] = useState<string>();
  const [ready, setReady] = useState(false);
  const focusedIndex = focused
    ? messages.findIndex((message) => message.id === focused)
    : -1;
  const getItemKey = useCallback(
    (index: number) => messages[index].id,
    [messages],
  );
  const virtualizer = useVirtualizer({
    count: messages.length,
    // Positions and container size are corrected synchronously in the DOM;
    // React can update the rendered range without flushSync lifecycle warnings.
    useFlushSync: false,
    directDomUpdates: true,
    directDomUpdatesMode: "transform",
    // The parent's ref can attach after child layout effects on a cold mount.
    getScrollElement: () =>
      scrollRef.current ??
      (container.current?.parentElement as HTMLDivElement | null),
    estimateSize: (index) => estimatedMessageSize(messages[index], compact),
    // Start on the newest messages before the first paint. The browser clamps
    // this estimated content height to the real maximum scroll offset.
    initialOffset: () =>
      messages.reduce(
        (height, message) => height + estimatedMessageSize(message, compact),
        0,
      ),
    getItemKey,
    overscan: 6,
    scrollMargin: margin,
    anchorTo: "end",
    followOnAppend: "auto",
    scrollEndThreshold: 100,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...(focusedIndex >= 0 ? [focusedIndex] : []),
        ]),
      ].sort((a, b) => a - b),
  });
  useLayoutEffect(() => {
    const element = container.current;
    const scroll = scrollRef.current ?? element?.parentElement;
    if (!scroll || !element) return;
    const measure = () =>
      setMargin(
        element.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top +
          scroll.scrollTop,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    if (element.previousElementSibling)
      observer.observe(element.previousElementSibling);
    return () => observer.disconnect();
  }, [scrollRef, messages.length]);
  const initialized = useRef(false);
  const previousTarget = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (!messages.length) return;
    if (initialized.current) {
      if (!highlighted || highlighted === previousTarget.current) return;
      const index = messages.findIndex((message) => message.id === highlighted);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: "center" });
        previousTarget.current = highlighted;
      }
      return;
    }

    // The list height and its scroll element settle after refs attach. Keep
    // the rows hidden for that single setup frame instead of painting the
    // oldest messages and visibly jumping to the newest ones.
    let revealFrame = 0;
    const positionFrame = requestAnimationFrame(() => {
      const targetIndex = highlighted
        ? messages.findIndex((message) => message.id === highlighted)
        : -1;
      if (targetIndex >= 0) {
        virtualizer.scrollToIndex(targetIndex, { align: "center" });
        previousTarget.current = highlighted;
      } else {
        virtualizer.scrollToEnd();
      }
      initialized.current = true;
      revealFrame = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(positionFrame);
      cancelAnimationFrame(revealFrame);
    };
  }, [highlighted, messages, virtualizer, margin]);
  const setContainer = useCallback(
    (element: HTMLDivElement | null) => {
      container.current = element;
      virtualizer.containerRef(element);
    },
    [virtualizer],
  );
  return (
    <div
      ref={setContainer}
      data-ui="virtual-messages"
      data-ready={ready}
      data-message-count={messages.length}
      className="relative invisible w-full data-[ready=true]:visible"
      onFocusCapture={(event) =>
        setFocused(
          (event.target as HTMLElement).closest<HTMLElement>(
            "[data-message-key]",
          )?.dataset.messageKey,
        )
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(undefined);
      }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          data-index={row.index}
          data-message-key={messages[row.index].id}
          ref={virtualizer.measureElement}
          className="absolute top-0 left-0 z-0 w-full [&:has([data-ui~=a-message-menu][aria-expanded='true'])]:z-50"
        >
          <MessageCard
            message={messages[row.index]}
            highlighted={messages[row.index].id === highlighted}
            onThread={onThread}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
});
