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
        className={`a-mention ${person ? "" : "a-group-mention"}`}
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
              className="a-mention-profile"
              {...getFloatingProps({
                "aria-label": person
                  ? `${person.name}’s profile preview`
                  : `@${target.handle} mention`,
              })}
            >
              {person ? (
                <>
                  <div className="a-mention-profile-head">
                    <PersonAvatar person={person} presence />
                    <div>
                      <strong>{person.name}</strong>
                      <span>@{person.handle}</span>
                    </div>
                    <span className="a-role-tag">{person.role}</span>
                  </div>
                  <p>{person.bio || "A little introduction is on its way."}</p>
                  {person.activity && (
                    <small className="a-mention-activity">
                      {person.activity}
                    </small>
                  )}
                  <button
                    type="button"
                    className="a-text-link"
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
                    <div className="a-mention-group-heading">
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
                    <div className="a-mention-group-people">
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
        className="a-mention a-channel-mention"
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
              className="a-mention-profile a-channel-preview"
              {...getFloatingProps({
                "aria-label": `#${channel.name} channel preview`,
              })}
            >
              <div className="a-mention-group-heading">
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
                className="a-text-link"
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
