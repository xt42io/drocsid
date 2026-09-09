import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Message } from "../../types/app";
import { MessageCard } from "./conversation";

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
  const focusedIndex = focused
    ? messages.findIndex((message) => message.id === focused)
    : -1;
  const getItemKey = useCallback(
    (index: number) => messages[index].id,
    [messages],
  );
  const virtualizer = useVirtualizer({
    count: messages.length,
    useFlushSync: false,
    // The parent's ref can attach after child layout effects on a cold mount.
    getScrollElement: () =>
      scrollRef.current ??
      (container.current?.parentElement as HTMLDivElement | null),
    estimateSize: (index) =>
      messages[index].attachments?.length ? 360 : compact ? 100 : 120,
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
    if (highlighted && highlighted !== previousTarget.current) {
      const index = messages.findIndex((message) => message.id === highlighted);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: "center" });
        previousTarget.current = highlighted;
        initialized.current = true;
      }
    } else if (!initialized.current) {
      const frame = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
        initialized.current = true;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [highlighted, messages, virtualizer, margin]);
  return (
    <div
      ref={container}
      data-ui="virtual-messages"
      data-message-count={messages.length}
      className="relative w-full h-(--list-height)"
      style={
        { "--list-height": `${virtualizer.getTotalSize()}px` } as CSSProperties
      }
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
          className="absolute top-0 left-0 z-0 w-full translate-y-(--row-offset) [&:has([data-ui~=a-message-menu][open])]:z-50"
          style={{ "--row-offset": `${row.start - margin}px` } as CSSProperties}
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
