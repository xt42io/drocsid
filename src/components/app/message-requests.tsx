import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import {
  incomingMessageRequests,
  dmMessagingBlocked,
} from "../../lib/direct-messages";
import {
  AppIcon,
  EmptyState,
  PageHeading,
  PersonAvatar,
} from "./primitives";
import { ButtonLoader } from "../button-loader";

export function MessageRequestActions({
  personId,
  openOnAccept = false,
}: {
  personId: string;
  openOnAccept?: boolean;
}) {
  const { command, state } = useApp();
  const navigate = useNavigate();
  const [busyOperation, setBusyOperation] = useState<
    "accept" | "decline" | "block" | null
  >(null);
  const busy = busyOperation !== null;
  async function respond(operation: "accept" | "decline" | "block") {
    setBusyOperation(operation);
    try {
      const ok = await command(
        operation === "block"
          ? { type: "friend", id: personId, operation: "block" }
          : { type: "dm.request", personId, operation },
      );
      if (ok && operation === "accept" && openOnAccept)
        await navigate({ to: "/app/dm/$personId", params: { personId } });
      else if (ok && operation !== "accept")
        await navigate({ to: "/app/requests" });
    } finally {
      setBusyOperation(null);
    }
  }
  if (dmMessagingBlocked(state, personId))
    return (
      <p className="text-sm text-(--a-muted)">
        You can read this request, but messaging is unavailable.
      </p>
    );
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Respond to message request"
      aria-busy={busy}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => void respond("accept")}
        className="rounded-md bg-(--a-orange) px-4 py-2 text-sm font-semibold text-[#462419] hover:brightness-110 disabled:opacity-45"
      >
        {busyOperation === "accept" ? (
          <ButtonLoader label="Accepting message request" />
        ) : (
          "Accept"
        )}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void respond("decline")}
        className="rounded-md bg-(--a-hover) px-4 py-2 text-sm text-(--a-text) hover:brightness-110 disabled:opacity-45"
      >
        {busyOperation === "decline" ? (
          <ButtonLoader label="Declining message request" />
        ) : (
          "Decline"
        )}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void respond("block")}
        className="rounded-md px-3 py-2 text-sm text-(--a-muted) hover:text-(--a-orange) disabled:opacity-45"
      >
        {busyOperation === "block" ? (
          <ButtonLoader label="Blocking user" />
        ) : (
          "Block"
        )}
      </button>
    </div>
  );
}

export function MessageRequestsPage() {
  const { state, findPerson, setModal } = useApp();
  const requests = incomingMessageRequests(state);
  return (
    <div className="h-full overflow-y-auto px-11 py-10 max-[760px]:px-5 max-[760px]:py-7">
      <PageHeading
        title="Message requests"
        description="Messages from people who aren’t your friends. Accept a request to start chatting."
      />
      <p className="mb-6 text-sm text-(--a-muted)" role="status">
        {requests.length} pending{" "}
        {requests.length === 1 ? "request" : "requests"}
      </p>
      <div className="space-y-3">
        {requests.map((request) => {
          const person = findPerson(request.personId);
          const lastMessage = state.messages
            .filter((m) => m.conversation === `dm:${person.id}`)
            .at(-1);
          return (
            <article
              key={person.id}
              className="flex flex-wrap gap-4 rounded-xl border border-(--a-border) bg-(--a-surface) p-5"
            >
              <button
                type="button"
                aria-label={`View ${person.name}'s profile`}
                onClick={() =>
                  setModal({ type: "profile", personId: person.id })
                }
                className="h-fit rounded-xl bg-transparent"
              >
                <PersonAvatar person={person} />
              </button>
              <div className="min-w-0 flex-1 basis-48">
                <Link
                  to="/app/dm/$personId"
                  params={{ personId: person.id }}
                  className="font-semibold hover:underline"
                >
                  {person.name}
                </Link>
                {person.handle && (
                  <p className="mt-1 text-xs text-(--a-muted)">
                    @{person.handle}
                  </p>
                )}
                <p className="my-3 line-clamp-2 wrap-anywhere text-sm text-(--a-muted)">
                  {lastMessage?.text ||
                    (lastMessage?.attachments?.length
                      ? "Sent an attachment"
                      : "Open this request to read their message.")}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to="/app/dm/$personId"
                    params={{ personId: person.id }}
                    className="inline-flex items-center gap-2 text-sm text-(--a-text) hover:underline"
                  >
                    View message <AppIcon name="right" size={16} />
                  </Link>
                  <MessageRequestActions personId={person.id} openOnAccept />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!requests.length && (
        <EmptyState
          icon="inbox"
          title="No message requests"
          description="New messages from non-friends will appear here. You can read them before deciding whether to accept."
        />
      )}
    </div>
  );
}
