import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import type { MentionTarget } from "../../lib/mentions";
import type { Channel } from "../../types/app";
import { useApp } from "../../lib/app-state";
import { AppIcon, PersonAvatar } from "./primitives";
import { WorkspacePortal } from "./floating-panel";

export function Mention({ target }: { target: MentionTarget }) {
  const { setModal } = useApp();
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      delay: { open: 180, close: 100 },
      handleClose: safePolygon(),
    }),
    useFocus(context),
    useDismiss(context),
    useRole(context),
  ]);
  const person = target.kind === "person" ? target.person : null;
  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        data-ui={`a-mention ${person ? "" : "a-group-mention"}`}
        className="inline py-px px-1 rounded-sm bg-[#f4ded2] text-[#954b32] leading-[inherit] cursor-pointer text-left wrap-anywhere font-[550]! hover:bg-[#edc4ae] aria-expanded:bg-[#edc4ae] in-data-[ui~=theme-dark]:bg-[#f45e3826] in-data-[ui~=theme-dark]:text-[#ffb29c] [[data-ui~=theme-dark]_&:hover]:bg-[#f45e3840] [[data-ui~=theme-dark]_&[aria-expanded='true']]:bg-[#f45e3840]"
        {...getReferenceProps({ onClick: () => setOpen(true) })}
      >
        @{person?.name ?? target.handle}
      </button>
      {open && (
        <WorkspacePortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
            returnFocus={false}
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              data-ui="a-mention-profile"
              className="z-80 border border-solid border-(--a-border) rounded-xl bg-(--a-surface) text-(--a-text) shadow-[0_12px_45px_#00000026] overflow-hidden whitespace-normal w-[min(325px,calc(100vw-24px))] p-4.5 text-[12px] max-h-[calc(100dvh-24px)] overflow-y-auto [&>p]:mt-4.25 [&>p]:leading-[1.7] [&>p]:wrap-anywhere **:data-[ui~=a-mention-activity]:block **:data-[ui~=a-mention-activity]:text-(--a-muted) **:data-[ui~=a-mention-activity]:mt-2.25 *:data-[ui~=a-text-link]:w-full *:data-[ui~=a-text-link]:justify-between *:data-[ui~=a-text-link]:mt-4.25 *:data-[ui~=a-text-link]:pt-3.25 *:data-[ui~=a-text-link]:[border-top-width:1px] *:data-[ui~=a-text-link]:[border-top-style:solid] *:data-[ui~=a-text-link]:border-t-(--a-border) *:data-[ui~=a-text-link]:text-[11px] [&>small]:text-(--a-muted) [&>small]:text-[10px] [&>small]:block [&>small]:mt-3.5"
              {...getFloatingProps({
                "aria-label": person
                  ? `${person.name}’s profile preview`
                  : `@${target.handle} mention`,
              })}
            >
              {person ? (
                <>
                  <div
                    data-ui="a-mention-profile-head"
                    className="flex items-center gap-2.75 [&>div]:flex-1 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[14px] [&_strong]:wrap-anywhere [&>div>span]:block [&>div>span]:mt-1 [&>div>span]:text-(--a-muted) [&>div>span]:text-[11px] [&>div>span]:wrap-anywhere"
                  >
                    <PersonAvatar person={person} presence />
                    <div>
                      <strong>{person.name}</strong>
                      <span>@{person.handle}</span>
                    </div>
                    <span
                      data-ui="a-role-tag"
                      className="inline-block py-0.75 px-1.75 border border-solid border-(--a-border) rounded-sm bg-(--a-soft) text-[9px] text-(--a-muted)"
                    >
                      {person.role}
                    </span>
                  </div>
                  <p>{person.bio || "A little introduction is on its way."}</p>
                  {person.activity && (
                    <small data-ui="a-mention-activity" className="">
                      {person.activity}
                    </small>
                  )}
                  <button
                    type="button"
                    data-ui="a-text-link"
                    className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
                    onClick={() => {
                      setOpen(false);
                      setModal({ type: "profile", personId: person.id });
                    }}
                  >
                    View full profile <AppIcon name="right" size={15} />
                  </button>
                </>
              ) : (
                target.kind === "group" && (
                  <>
                    <div
                      data-ui="a-mention-group-heading"
                      className="flex items-center gap-2.75 [&>div]:flex-1 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[14px] [&_strong]:wrap-anywhere [&>div>span]:block [&>div>span]:mt-1 [&>div>span]:text-(--a-muted) [&>div>span]:text-[11px] [&>div>span]:wrap-anywhere"
                    >
                      <AppIcon
                        name={target.handle === "admin" ? "shield" : "people"}
                        size={24}
                      />
                      <div>
                        <strong>@{target.handle}</strong>
                        <span>{target.description}</span>
                      </div>
                    </div>
                    <p>
                      {target.people.length}{" "}
                      {target.people.length === 1 ? "person" : "people"} in this
                      group
                    </p>
                    <div
                      data-ui="a-mention-group-people"
                      className="grid gap-2.5 mt-3.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2 **:data-[ui~=avatar]:text-[11px] **:data-[ui~=avatar]:rounded-lg **:data-[ui~=avatar]:size-6.25 [&>div>span:nth-child(2)]:flex-1 [&_small]:text-(--a-muted) [&_small]:text-[10px]"
                    >
                      {target.people.slice(0, 5).map((member) => (
                        <div key={member.id}>
                          <PersonAvatar person={member} />
                          <span>{member.name}</span>
                          <small>@{member.handle}</small>
                        </div>
                      ))}
                    </div>
                    {target.people.length > 5 && (
                      <small>
                        And {target.people.length - 5} more community members.
                      </small>
                    )}
                  </>
                )
              )}
            </div>
          </FloatingFocusManager>
        </WorkspacePortal>
      )}
    </>
  );
}

export function ChannelMention({
  channel,
  communityId,
}: {
  channel: Channel;
  communityId: string;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      delay: { open: 180, close: 100 },
      handleClose: safePolygon(),
    }),
    useFocus(context),
    useDismiss(context),
    useRole(context),
  ]);
  return (
    <>
      <Link
        ref={refs.setReference}
        to="/app/community/$communityId/$channelId"
        params={{ communityId, channelId: channel.id }}
        data-ui="a-mention a-channel-mention"
        className="inline py-px px-1 rounded-sm leading-[inherit] cursor-pointer text-left wrap-anywhere bg-[#e5eadc] text-[#52663c] font-[550]! no-underline! hover:bg-[#d6dfc7] aria-expanded:bg-[#d6dfc7] in-data-[ui~=theme-dark]:bg-[#ffffff12] in-data-[ui~=theme-dark]:text-[#dedede] [[data-ui~=theme-dark]_&:hover]:bg-[#ffffff20] [[data-ui~=theme-dark]_&[aria-expanded='true']]:bg-[#ffffff20]"
        {...getReferenceProps()}
      >
        #{channel.name}
      </Link>
      {open && (
        <WorkspacePortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
            returnFocus={false}
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              data-ui="a-mention-profile a-channel-preview"
              className="z-80 border border-solid border-(--a-border) rounded-xl bg-(--a-surface) text-(--a-text) shadow-[0_12px_45px_#00000026] overflow-hidden whitespace-normal w-[min(325px,calc(100vw-24px))] p-4.5 text-[12px] max-h-[calc(100dvh-24px)] overflow-y-auto [&_[data-ui~=a-mention-group-heading]>svg]:text-(--a-muted) [&>p]:mt-4.25 [&>p]:leading-[1.7] [&>p]:wrap-anywhere **:data-[ui~=a-mention-activity]:block **:data-[ui~=a-mention-activity]:text-(--a-muted) **:data-[ui~=a-mention-activity]:mt-2.25 *:data-[ui~=a-text-link]:w-full *:data-[ui~=a-text-link]:justify-between *:data-[ui~=a-text-link]:mt-4.25 *:data-[ui~=a-text-link]:pt-3.25 *:data-[ui~=a-text-link]:[border-top-width:1px] *:data-[ui~=a-text-link]:[border-top-style:solid] *:data-[ui~=a-text-link]:border-t-(--a-border) *:data-[ui~=a-text-link]:text-[11px] [&>small]:text-(--a-muted) [&>small]:text-[10px] [&>small]:block [&>small]:mt-3.5"
              {...getFloatingProps({
                "aria-label": `#${channel.name} channel preview`,
              })}
            >
              <div
                data-ui="a-mention-group-heading"
                className="flex items-center gap-2.75 [&>div]:flex-1 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[14px] [&_strong]:wrap-anywhere [&>div>span]:block [&>div>span]:mt-1 [&>div>span]:text-(--a-muted) [&>div>span]:text-[11px] [&>div>span]:wrap-anywhere"
              >
                <AppIcon name={channel.private ? "lock" : "hash"} size={24} />
                <div>
                  <strong>#{channel.name}</strong>
                  <span>{channel.group}</span>
                </div>
              </div>
              <p>{channel.description}</p>
              <Link
                to="/app/community/$communityId/$channelId"
                params={{ communityId, channelId: channel.id }}
                data-ui="a-text-link"
                className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
                onClick={() => setOpen(false)}
              >
                Open channel <AppIcon name="right" size={15} />
              </Link>
            </div>
          </FloatingFocusManager>
        </WorkspacePortal>
      )}
    </>
  );
}
