import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import {
  AppIcon,
  EmptyState,
  IconButton,
  PageHeading,
  PersonAvatar,
} from "./primitives";

export function FriendsPage() {
  const { state, setState, setModal, notify } = useApp();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const tabs = [
    {
      id: "all",
      label: "All friends",
      count: state.friends.filter((id) => !state.blocked.includes(id)).length,
    },
    {
      id: "online",
      label: "Around now",
      count: state.people.filter(
        (p) =>
          state.friends.includes(p.id) &&
          p.status === "online" &&
          !state.blocked.includes(p.id),
      ).length,
    },
    {
      id: "pending",
      label: "Pending",
      count: state.pending.length + state.outgoing.length,
    },
    { id: "blocked", label: "Blocked", count: state.blocked.length },
  ];
  const filtered = state.people.filter(
    (p) =>
      (tab === "blocked"
        ? state.blocked.includes(p.id)
        : tab === "pending"
          ? state.pending.includes(p.id) || state.outgoing.includes(p.id)
          : state.friends.includes(p.id) &&
            !state.blocked.includes(p.id) &&
            (tab !== "online" || p.status === "online")) &&
      `${p.name} ${p.handle}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      data-ui="a-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      <PageHeading
        title="Good company."
        description="Your people, just a little hello away."
      >
        <button
          data-ui="a-button primary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
          onClick={() => setModal({ type: "add-friend" })}
        >
          <AppIcon name="userAdd" size={18} />
          Add a friend
        </button>
      </PageHeading>
      <div
        data-ui="a-friends-banner"
        className="flex items-center justify-between gap-5 py-7.75 px-7.5 border border-solid border-[#e0e4d5] rounded-[10px] bg-[#ecefe4] mb-8 in-data-[ui~=theme-dark]:border-(--a-border) in-data-[ui~=theme-dark]:bg-(--a-soft) [&_h2]:text-[28px] [&_h2]:text-(--a-green) [&_h2]:font-medium [&_h2]:tracking-[-1px] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-(--a-muted) [&_p]:max-w-90 [&_p]:mt-2.5 max-[1250px]:p-6.25 max-[1250px]:[&_p]:max-w-75 max-[1050px]:py-6.25 max-[1050px]:px-5 max-[760px]:p-6 max-[760px]:mb-7 max-[760px]:[&_p]:max-w-none max-[760px]:[&_h2]:text-[27px] max-[480px]:py-5.75 max-[480px]:px-5 max-[480px]:[&_h2]:text-[26px] max-[480px]:[&_p]:text-[12px]"
      >
        <div>
          <h2>People who just get it.</h2>
          <p>
            The late-night ideas. The everyday updates. The comfortable
            silences.
          </p>
        </div>
        <div
          data-ui="a-friend-stack"
          className="flex items-center pr-5 relative **:data-[ui~=a-avatar]:-ml-3.75 **:data-[ui~=a-avatar]:transform-[rotate(-9deg)] [&_[data-ui~=a-avatar]:nth-child(2n)]:transform-[rotate(10deg)_translateY(10px)] **:data-[ui~=avatar]:w-13 **:data-[ui~=avatar]:h-14.5 **:data-[ui~=avatar]:rounded-[17px] **:data-[ui~=avatar]:border-[3px] **:data-[ui~=avatar]:border-solid **:data-[ui~=avatar]:border-[#ecefe4] **:data-[ui~=avatar]:text-[22px] [&>span:last-child:not([data-ui~=a-avatar])]:absolute [&>span:last-child:not([data-ui~=a-avatar])]:-right-2 [&>span:last-child:not([data-ui~=a-avatar])]:-top-5 [&>span:last-child:not([data-ui~=a-avatar])]:text-[35px] [&>span:last-child:not([data-ui~=a-avatar])]:text-[#97a582] [[data-ui~=theme-dark]_&>span:last-child:not([data-ui~=a-avatar])]:text-(--a-muted) [[data-ui~=theme-dark]_&_[data-ui~=avatar]]:border-(--a-soft) max-[1250px]:**:data-[ui~=avatar]:w-10.75 max-[1250px]:**:data-[ui~=avatar]:h-12.25 max-[1250px]:**:data-[ui~=avatar]:text-[18px] max-[1250px]:pr-3.5 max-[1050px]:hidden max-[760px]:flex max-[480px]:hidden"
          aria-hidden="true"
        >
          {state.people.slice(0, 4).map((person) => (
            <PersonAvatar key={person.id} person={person} large />
          ))}
          <span>✳</span>
        </div>
      </div>
      <div
        data-ui="a-list-controls"
        className="flex items-center justify-between gap-5 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) mb-5.75 max-[1250px]:gap-3 max-[1050px]:flex-col max-[1050px]:items-stretch max-[1050px]:gap-3.75 max-[1050px]:[border-bottom-width:0] max-[1050px]:[border-bottom-style:none] max-[1050px]:border-b-[currentColor] max-[1050px]:**:data-[ui~=a-tabs]:[border-bottom-width:1px] max-[1050px]:**:data-[ui~=a-tabs]:[border-bottom-style:solid] max-[1050px]:**:data-[ui~=a-tabs]:border-b-(--a-border) max-[760px]:gap-4.25"
      >
        <div
          data-ui="a-tabs"
          className="flex gap-4.25 items-center min-w-0 [&>button]:relative [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&>button]:min-h-11.25 [&>button]:bg-transparent [&>button]:pt-0 [&>button]:pb-3.25 [&>button]:px-0.75 [&>button]:text-(--a-muted) [&>button]:text-[12px] [&>button]:whitespace-nowrap [&>button[data-ui~=active]]:text-(--a-text) [&>button[data-ui~=active]]:font-semibold [&>button[data-ui~=active]::after]:[content:''] [&>button[data-ui~=active]::after]:absolute [&>button[data-ui~=active]::after]:-bottom-px [&>button[data-ui~=active]::after]:left-0 [&>button[data-ui~=active]::after]:right-0 [&>button[data-ui~=active]::after]:h-0.5 [&>button[data-ui~=active]::after]:bg-(--a-orange) [&>button>span]:bg-(--a-soft) [&>button>span]:text-(--a-muted) [&>button>span]:py-px [&>button>span]:px-1.25 [&>button>span]:rounded-sm [&>button>span]:text-[10px] max-[1250px]:gap-3 max-[1250px]:[&>button]:text-[11px] max-[760px]:gap-5.5 max-[760px]:[&>button]:text-[12px] max-[480px]:gap-4 max-[480px]:overflow-x-auto max-[480px]:scrollbar-none max-[480px]:[&>button]:text-[11px] max-[480px]:[&>button]:shrink-0 max-[480px]:[&>button>span]:text-[9px]"
          aria-label="Filter friends"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              data-ui={tab === item.id ? "active" : ""}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.count > 0 && <span>{item.count}</span>}
            </button>
          ))}
        </div>
        <label
          data-ui="a-search-field small"
          className="flex items-center gap-2.25 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] min-h-10.75 py-0 px-3 text-(--a-muted) [&_input]:w-full [&_input]:py-2.75 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:border-none [&_input]:border-[currentColor] [&_input]:rounded-none [&_input]:text-[12px] [&_input]:shadow-none! focus-within:border-[#b8c5a3] data-[ui~=small]:min-h-8.25 data-[ui~=small]:mb-2.75 data-[ui~=small]:max-w-47.5 [&[data-ui~=small]_input]:py-1.75 [&[data-ui~=small]_input]:px-0 [&[data-ui~=small]_input]:text-[10px] [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[1250px]:data-[ui~=small]:max-w-38.75 max-[1050px]:data-[ui~=small]:m-0 max-[1050px]:data-[ui~=small]:max-w-none max-[760px]:[[data-ui~=workspace]_&_input]:text-[16px] max-[760px]:[[data-ui~=workspace]_&_input::placeholder]:text-[12px]"
        >
          <AppIcon name="search" size={17} />
          <input
            placeholder="Find a friend"
            aria-label="Find a friend"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div
        data-ui="a-list-caption"
        className="font-mono text-(--a-muted) text-[9px] tracking-[0.75px] mb-3.5"
      >
        {tab === "online"
          ? "AROUND FOR A CONVERSATION"
          : tab === "pending"
            ? "A HELLO IN THE MAKING"
            : tab === "blocked"
              ? "YOUR BOUNDARIES, YOUR CALL"
              : "YOUR PEOPLE"}{" "}
        — {filtered.length}
      </div>
      <div data-ui="a-friends-list" className="">
        {filtered.map((person) => (
          <div
            data-ui="a-friend-row"
            className="flex items-center gap-5 py-4.75 px-2 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) max-[760px]:py-4.5 max-[760px]:gap-3 max-[480px]:px-0"
            key={person.id}
          >
            <button
              data-ui="a-person-summary"
              className="flex items-center gap-3.25 flex-1 min-w-0 p-0 bg-transparent text-left [&>span:last-child]:min-w-0 [&_strong]:flex [&_strong]:items-center [&_strong]:gap-2.5 [&_strong]:text-[14px] [&_strong]:font-semibold [&_strong]:leading-[1.4] [&_strong_small]:text-[11px] [&_strong_small]:text-(--a-faint) [&_strong_small]:font-normal [&>span:last-child>span]:block [&>span:last-child>span]:text-[11px] [&>span:last-child>span]:text-(--a-muted) [&>span:last-child>span]:mt-1 max-[760px]:[&_strong]:text-[14px] max-[760px]:[&_strong]:gap-2.25 max-[760px]:[&_strong_small]:text-[10px] max-[760px]:[&>span:last-child>span]:text-[11px] max-[480px]:[&_strong]:block max-[480px]:[&_strong]:text-[13px] max-[480px]:[&_strong_small]:hidden max-[480px]:[&>span:last-child>span]:text-[10px] max-[480px]:gap-2.5 max-[480px]:**:data-[ui~=avatar]:size-9"
              onClick={() => setModal({ type: "profile", personId: person.id })}
            >
              <PersonAvatar person={person} presence />
              <span>
                <strong>
                  {person.name}
                  {person.handle && <small>@{person.handle}</small>}
                </strong>
                <span>
                  {tab === "pending"
                    ? state.pending.includes(person.id)
                      ? "Incoming friend request"
                      : "Outgoing request"
                    : person.activity}
                </span>
              </span>
            </button>
            <div
              data-ui="a-friend-actions"
              className="flex gap-2.25 **:data-[ui~=a-icon-button]:border **:data-[ui~=a-icon-button]:border-solid **:data-[ui~=a-icon-button]:border-(--a-border) **:data-[ui~=a-icon-button]:bg-(--a-surface) **:data-[ui~=a-icon-button]:rounded-full **:data-[ui~=a-icon-button]:size-8.5 max-[760px]:gap-1.75 max-[760px]:**:data-[ui~=a-icon-button]:size-8.25 max-[480px]:**:data-[ui~=a-icon-button]:size-7.75"
            >
              {tab === "pending" ? (
                state.pending.includes(person.id) ? (
                  <>
                    <IconButton
                      name="check"
                      label={`Accept ${person.name}'s request`}
                      onClick={() => {
                        setState((previous) => ({
                          ...previous,
                          friends: [
                            ...new Set([...previous.friends, person.id]),
                          ],
                          outgoing: previous.outgoing.filter(
                            (id) => id !== person.id,
                          ),
                          pending: previous.pending.filter(
                            (id) => id !== person.id,
                          ),
                        }));
                        notify(
                          `${person.name.split(" ")[0]} is now in your friends.`,
                        );
                      }}
                    />
                    <IconButton
                      name="close"
                      label={`Decline ${person.name}'s request`}
                      onClick={() => {
                        setState((previous) => ({
                          ...previous,
                          pending: previous.pending.filter(
                            (id) => id !== person.id,
                          ),
                        }));
                        notify("Request removed.");
                      }}
                    />
                  </>
                ) : (
                  <button
                    data-ui="a-button secondary small"
                    className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                    onClick={() => {
                      setState((previous) => ({
                        ...previous,
                        outgoing: previous.outgoing.filter(
                          (id) => id !== person.id,
                        ),
                      }));
                      notify("Preview request canceled.");
                    }}
                  >
                    Cancel request
                  </button>
                )
              ) : tab === "blocked" ? (
                <button
                  data-ui="a-button secondary small"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  onClick={() => {
                    setState((previous) => ({
                      ...previous,
                      blocked: previous.blocked.filter(
                        (id) => id !== person.id,
                      ),
                    }));
                    notify("Person unblocked.");
                  }}
                >
                  Unblock
                </button>
              ) : (
                <>
                  <Link
                    to="/app/dm/$personId"
                    params={{ personId: person.id }}
                    data-ui="a-icon-button"
                    className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green)"
                    title={`Message ${person.name}`}
                    aria-label={`Message ${person.name}`}
                  >
                    <AppIcon name="message" size={19} />
                  </Link>
                  <IconButton
                    name="more"
                    label={`View ${person.name}'s profile and options`}
                    onClick={() =>
                      setModal({ type: "profile", personId: person.id })
                    }
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          icon={tab === "pending" ? "checkCircle" : "people"}
          title={
            query
              ? "No one by that name."
              : tab === "pending"
                ? "All caught up."
                : tab === "blocked"
                  ? "Nothing to see here."
                  : "A quiet moment."
          }
          description={
            query
              ? "Try a first name or username."
              : tab === "pending"
                ? "No friend requests waiting. A new hello is never far away."
                : tab === "blocked"
                  ? "People you block will appear here."
                  : "Your friends will be back around. Leave them a little message."
          }
        />
      )}
    </div>
  );
}
