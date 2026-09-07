import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { getChannelCategories } from "../../lib/channels";
import { LogoMark } from "../ui";
import { AppIcon, IconButton, PersonAvatar, PreviewNote } from "./primitives";
import { AppDialogs } from "./app-dialogs";

export function AppShell() {
  const { state, setState, setModal, toast, findPerson } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const communityId = pathname.startsWith("/app/community/")
    ? pathname.split("/")[3]
    : null;
  const community = state.communities.find((c) => c.id === communityId);
  const standalone =
    pathname === "/app/welcome" || pathname.startsWith("/app/invite/");
  const unread = state.activities.filter((a) => !a.read).length;
  const dmPeople = state.people.filter(
    (person) =>
      state.messages.some(
        (message) => message.conversation === `dm:${person.id}`,
      ) && !state.blocked.includes(person.id),
  );
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void navigate({ to: "/app/search", search: { q: "" } });
      }
      if (event.key === "Escape") {
        setDrawer(false);
        document
          .querySelectorAll<HTMLDetailsElement>(
            "[data-ui~=workspace] details[open]",
          )
          .forEach((details) => {
            if (details.contains(document.activeElement))
              details.querySelector("summary")?.focus();
            details.open = false;
          });
      }
    }
    function closeOutsideMenus(event: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(
          "[data-ui~=workspace] details[open]",
        )
        .forEach((details) => {
          if (!details.contains(event.target as Node)) details.open = false;
        });
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", closeOutsideMenus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", closeOutsideMenus);
    };
  }, [navigate]);
  return (
    <div
      data-ui={`workspace theme-${state.preferences.theme} density-${state.preferences.density} text-${state.preferences.fontSize} ${standalone ? "workspace-standalone" : ""}`}
      className="[--a-bg:#fbfaf7] [--a-surface:#fffefa] [--a-soft:#f3f3ec] [--a-sidebar:#eff0e7] [--a-rail:#e5e9da] [--a-border:#e3e5d9] [--a-text:#30362b] [--a-muted:#7b836f] [--a-faint:#949b86] [--a-hover:#e8ecdf] [--a-green:#596b42] [--a-selected:#e0e7d2] [--a-orange:#f45e38] [--a-font:14px] flex w-full h-svh overflow-hidden bg-(--a-bg) text-(--a-text) font-sans text-(length:--a-font) data-[ui~=theme-dark]:scheme-dark data-[ui~=theme-dark]:[--a-bg:#171717] data-[ui~=theme-dark]:[--a-surface:#1f1f1f] data-[ui~=theme-dark]:[--a-soft:#242424] data-[ui~=theme-dark]:[--a-sidebar:#1b1b1b] data-[ui~=theme-dark]:[--a-rail:#111111] data-[ui~=theme-dark]:[--a-border:#343434] data-[ui~=theme-dark]:[--a-text:#ededed] data-[ui~=theme-dark]:[--a-muted:#aaaaaa] data-[ui~=theme-dark]:[--a-faint:#929292] data-[ui~=theme-dark]:[--a-hover:#292929] data-[ui~=theme-dark]:[--a-green:#d0d0d0] data-[ui~=theme-dark]:[--a-selected:#343434] data-[ui~=text-large]:[--a-font:16px] [&_button:disabled]:opacity-45 [&_button:disabled]:cursor-not-allowed [&_input:focus]:border-[#a7b78c] [&_input:focus]:shadow-[0_0_0_3px_#80985616] [&_textarea:focus]:border-[#a7b78c] [&_textarea:focus]:shadow-[0_0_0_3px_#80985616] [&_select:focus]:border-[#a7b78c] [&_select:focus]:shadow-[0_0_0_3px_#80985616] [&_input::placeholder]:text-(--a-faint) [&_textarea::placeholder]:text-(--a-faint) **:[::-webkit-scrollbar]:size-1.25 **:[::-webkit-scrollbar-thumb]:bg-[#b6c0a54d] **:[::-webkit-scrollbar-thumb]:rounded-lg [&_summary::-webkit-details-marker]:hidden data-[ui~=workspace-standalone]:overflow-y-auto [&[data-ui~=workspace-standalone]_[data-ui~=a-main]]:overflow-auto [&[data-ui~=theme-dark]_::-webkit-scrollbar-thumb]:bg-[#ffffff26] [&[data-ui~=theme-dark]_input:focus]:border-[#888888] [&[data-ui~=theme-dark]_input:focus]:shadow-[0_0_0_3px_#ffffff08] [&[data-ui~=theme-dark]_textarea:focus]:border-[#888888] [&[data-ui~=theme-dark]_textarea:focus]:shadow-[0_0_0_3px_#ffffff08] [&[data-ui~=theme-dark]_select:focus]:border-[#888888] [&[data-ui~=theme-dark]_select:focus]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:flex-col"
    >
      {!standalone && (
        <>
          <header
            data-ui="a-mobile-header"
            className="hidden max-[760px]:flex max-[760px]:items-center max-[760px]:justify-between max-[760px]:shrink-0 max-[760px]:h-13.75 max-[760px]:py-0 max-[760px]:px-4 max-[760px]:[border-bottom-width:1px] max-[760px]:[border-bottom-style:solid] max-[760px]:border-b-(--a-border) max-[760px]:bg-(--a-sidebar) max-[760px]:[&>a:last-child]:text-(--a-muted) max-[760px]:[&>a:last-child]:p-1.5"
            inert={drawer}
          >
            <IconButton
              name="menu"
              label="Open sidebar"
              onClick={() => setDrawer(true)}
            />
            <Link
              to="/app"
              data-ui="a-mobile-brand"
              className="max-[760px]:flex max-[760px]:items-center max-[760px]:gap-1.5 max-[760px]:text-[20px] max-[760px]:font-[750] max-[760px]:tracking-[-1px] max-[760px]:**:data-[ui~=logo-mark]:[--logo-eyes:var(--a-sidebar)] max-[760px]:**:data-[ui~=logo-mark]:text-(--a-green) max-[760px]:**:data-[ui~=logo-mark]:size-5.75"
            >
              <LogoMark /> drocsid.
            </Link>
            <Link to="/app/search" search={{ q: "" }} aria-label="Search">
              <AppIcon name="search" />
            </Link>
          </header>
          {drawer && (
            <button
              data-ui="a-drawer-scrim"
              className="in-data-[ui~=theme-dark]:bg-[#00000099] max-[760px]:fixed max-[760px]:bg-[#26361d66] max-[760px]:z-35 max-[760px]:[backdrop-filter:blur(2px)] max-[760px]:inset-0"
              aria-label="Close sidebar"
              onClick={() => setDrawer(false)}
            />
          )}
          <div
            data-ui={`a-navigation ${drawer ? "drawer-open" : ""}`}
            className="flex shrink-0 h-full max-[760px]:fixed max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:left-0 max-[760px]:z-40 max-[760px]:transform-[translateX(-100%)] max-[760px]:[transition:transform_0.2s] max-[760px]:shadow-[10px_0_30px_#18220c20] max-[760px]:invisible max-[760px]:data-[ui~=drawer-open]:transform-[translateX(0)] max-[760px]:data-[ui~=drawer-open]:visible"
          >
            <nav
              data-ui="a-rail"
              className="flex flex-col items-center gap-3.5 w-18.5 pt-5.75 pb-4.5 px-3 bg-(--a-rail) [border-right-width:1px] [border-right-style:solid] border-r-(--a-border) overflow-y-auto scrollbar-none max-[1250px]:w-16.5 max-[1250px]:px-2.5 max-[760px]:w-16.25"
              aria-label="Your communities"
            >
              <Link
                to="/app/friends"
                data-ui={`a-rail-logo ${!community ? "active" : ""}`}
                className="flex items-center justify-center w-10.75 h-10 text-(--a-green) mb-px **:data-[ui~=logo-mark]:[--logo-eyes:var(--a-rail)] **:data-[ui~=logo-mark]:size-7.5 hover:text-(--a-orange)"
                title="Your people"
                aria-label="Your people"
              >
                <LogoMark />
              </Link>
              <div
                data-ui="a-rail-divider"
                className="shrink-0 w-7.25 h-px bg-[#bcc5ad88] mt-0 mb-1.25 mx-0 in-data-[ui~=theme-dark]:bg-(--a-border)"
              />
              {state.communities
                .filter((c) => c.joined)
                .map((c) => (
                  <Link
                    key={c.id}
                    to="/app/community/$communityId/$channelId"
                    params={{
                      communityId: c.id,
                      channelId: c.channels.some((ch) => ch.id === "general")
                        ? "general"
                        : (c.channels[0]?.id ?? "general"),
                    }}
                    title={c.name}
                    aria-label={c.name}
                    aria-current={community?.id === c.id ? "page" : undefined}
                    data-ui={`a-community-icon tone-${c.color} ${community?.id === c.id ? "selected" : ""}`}
                    className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] hover:transform-[translateY(-2px)] hover:rounded-xl data-[ui~=selected]:[outline:1px_solid_#c48b61] data-[ui~=selected]:-outline-offset-2 [&[data-ui~=selected]::before]:[content:''] [&[data-ui~=selected]::before]:absolute [&[data-ui~=selected]::before]:-left-3.5 [&[data-ui~=selected]::before]:h-6 [&[data-ui~=selected]::before]:w-1 [&[data-ui~=selected]::before]:rounded-[0_4px_4px_0] [&[data-ui~=selected]::before]:bg-(--a-green) max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
                  >
                    <AppIcon name={c.icon} size={25} />
                    {c.id === "creative" && !community && (
                      <span
                        data-ui="a-rail-dot"
                        className="rounded-full border-2 border-solid border-(--a-rail) bg-(--a-orange) absolute right-0 bottom-0.5 size-2"
                      />
                    )}
                  </Link>
                ))}
              <button
                data-ui="a-community-icon a-create-community"
                className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] bg-transparent text-(--a-green) size-11.5 border! border-dashed! border-[#aab994]! hover:transform-[translateY(-2px)] hover:rounded-xl in-data-[ui~=theme-dark]:border-(--a-border)! max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
                title="Create a community"
                aria-label="Create a community"
                onClick={() => setModal({ type: "create-community" })}
              >
                <AppIcon name="plus" size={23} />
              </button>
              <Link
                to="/app/discover"
                data-ui={`a-rail-discover ${pathname === "/app/discover" ? "active" : ""}`}
                className="flex items-center justify-center min-h-8.25 w-9.5 text-(--a-muted) bg-transparent rounded-[10px] hover:bg-(--a-hover) hover:text-(--a-green) data-[ui~=active]:bg-(--a-hover) data-[ui~=active]:text-(--a-green)"
                title="Discover communities"
                aria-label="Discover communities"
              >
                <AppIcon name="discover" size={25} />
              </Link>
              <div data-ui="a-rail-spacer" className="flex-1 min-h-7.5" />
              <button
                data-ui="a-rail-help"
                className="flex items-center justify-center min-h-8.25 w-9.5 text-(--a-muted) bg-transparent rounded-[10px] hover:bg-(--a-hover) hover:text-(--a-green)"
                onClick={() => setModal({ type: "help" })}
                title="A little help"
                aria-label="Help"
              >
                <AppIcon name="info" size={21} />
              </button>
              <Link
                to="/"
                data-ui="a-rail-home"
                className="flex items-center justify-center min-h-8.25 w-9.5 text-(--a-muted) bg-transparent rounded-[10px] hover:bg-(--a-hover) hover:text-(--a-green)"
                title="Back to the website"
                aria-label="Back to the website"
              >
                <AppIcon name="external" size={20} />
              </Link>
            </nav>
            <aside
              data-ui="a-sidebar"
              className="flex flex-col w-61.25 min-h-0 bg-(--a-sidebar) [border-right-width:1px] [border-right-style:solid] border-r-(--a-border) min-[1600px]:w-65.75 max-[1250px]:w-55.75 max-[760px]:w-61"
            >
              <header
                data-ui="a-sidebar-header"
                className="h-20 py-0 px-4.75 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) flex items-center shrink-0 max-[1250px]:px-3.75 max-[760px]:h-19"
              >
                {community ? (
                  <details
                    data-ui="a-community-menu"
                    className="relative w-full [&>summary]:flex [&>summary]:items-center [&>summary]:gap-2.5 [&>summary]:cursor-pointer [&_summary>span]:flex-1 [&_summary>span]:min-w-0 [&_strong]:block [&_strong]:text-[14px] [&_strong]:font-[650] [&_strong]:tracking-[-0.25px] [&_strong]:truncate [&_small]:flex [&_small]:items-center [&_small]:gap-1.25 [&_small]:text-[9px] [&_small]:mt-1.5 [&_small]:whitespace-nowrap [&_small]:text-(--a-muted) [&_small_i]:bg-[#819b63] [&_small_i]:rounded-full [&_small_i]:size-1 **:data-[ui~=a-dropdown]:-left-1.25 **:data-[ui~=a-dropdown]:-right-1.25 **:data-[ui~=a-dropdown]:top-12.75 max-[1250px]:[&_small]:text-[8px] max-[1250px]:[&_strong]:text-[13px]"
                  >
                    <summary>
                      <span>
                        <strong>{community.name}</strong>
                        <small>
                          <i /> A little corner, a lot of good company
                        </small>
                      </span>
                      <AppIcon name="down" size={16} />
                    </summary>
                    <div
                      data-ui="a-dropdown"
                      className="absolute z-30 min-w-51.25 p-1.5 border border-solid border-(--a-border) bg-(--a-surface) rounded-[9px] shadow-[0_8px_28px_#17220720] text-left [&_button]:flex [&_button]:items-center [&_button]:gap-2.25 [&_button]:w-full [&_button]:rounded-[5px] [&_button]:bg-transparent [&_button]:p-2.5 [&_button]:text-(--a-text) [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_a]:flex [&_a]:items-center [&_a]:gap-2.25 [&_a]:w-full [&_a]:rounded-[5px] [&_a]:bg-transparent [&_a]:p-2.5 [&_a]:text-(--a-text) [&_a]:text-[12px] [&_a]:whitespace-nowrap [&_button:hover]:bg-(--a-hover) [&_a:hover]:bg-(--a-hover)"
                    >
                      <button
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setModal({
                            type: "invite",
                            communityId: community.id,
                          });
                        }}
                      >
                        <AppIcon name="userAdd" size={17} /> Invite your people
                      </button>
                      <button
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setModal({
                            type: "create-channel",
                            communityId: community.id,
                          });
                        }}
                      >
                        <AppIcon name="plus" size={17} /> Create a channel
                      </button>
                      <button
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setModal({
                            type: "create-category",
                            communityId: community.id,
                          });
                        }}
                      >
                        <AppIcon name="folder" size={17} /> Create category
                      </button>
                      <Link
                        to="/app/community/$communityId/settings"
                        params={{ communityId: community.id }}
                        onClick={(event) =>
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open")
                        }
                      >
                        <AppIcon name="settings" size={17} /> Community settings
                      </Link>
                    </div>
                  </details>
                ) : (
                  <div
                    data-ui="a-personal-title"
                    className="[&_strong]:block [&_strong]:text-[16px] [&_strong]:tracking-[-0.45px] [&_strong]:font-[650] [&_span]:block [&_span]:text-(--a-muted) [&_span]:text-[11px] [&_span]:mt-1"
                  >
                    <strong>Your little corner.</strong>
                    <span>Good to have you around.</span>
                  </div>
                )}
              </header>
              <div
                data-ui="a-sidebar-scroll"
                className="flex-1 min-h-0 overflow-y-auto pt-4.25 pb-5 px-2.75"
              >
                <Link
                  data-ui="a-quick-search"
                  className="flex items-center gap-2 h-8.25 border border-solid border-[#dbe0cf] bg-[#e8ecdf] rounded-[5px] text-[#8a947b] py-0 px-2 text-[10px] mt-0 mb-4 mx-0.5 in-data-[ui~=theme-dark]:bg-(--a-soft) in-data-[ui~=theme-dark]:border-(--a-border) in-data-[ui~=theme-dark]:text-(--a-muted) [&>span]:flex-1 [&_kbd]:border [&_kbd]:border-solid [&_kbd]:border-[#ccd5bc] [&_kbd]:text-[9px] [&_kbd]:py-px [&_kbd]:px-0.75 [&_kbd]:rounded-[3px] [[data-ui~=theme-dark]_&_kbd]:border-(--a-border)!"
                  to="/app/search"
                  search={{ q: "" }}
                >
                  <AppIcon name="search" size={16} />
                  <span>Find a conversation</span>
                  <kbd>⌘ K</kbd>
                </Link>
                <nav
                  data-ui="a-personal-nav"
                  className="pb-4 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) [&>a]:flex [&>a]:items-center [&>a]:gap-2.5 [&>a]:py-2.25 [&>a]:px-2.75 [&>a]:mb-0.75 [&>a]:rounded-md [&>a]:text-[13px] [&>a]:text-(--a-muted) [&>a:hover]:bg-(--a-hover) [&>a:hover]:text-(--a-text) [&>a[data-ui~=active]]:bg-(--a-selected) [&>a[data-ui~=active]]:text-(--a-green) [&>a[data-ui~=active]]:font-[650] [&>a>span:nth-child(2)]:flex-1 [&>a>span:nth-child(2)]:min-w-0 [&>a>span:nth-child(2)]:truncate"
                  aria-label="Personal navigation"
                >
                  <Link
                    to="/app/inbox"
                    data-ui={pathname === "/app/inbox" ? "active" : ""}
                  >
                    <AppIcon name="inbox" size={19} />
                    <span>Inbox</span>
                    {unread > 0 && (
                      <span
                        data-ui="a-count orange"
                        className="flex-none! inline-flex items-center justify-center bg-[#dde3d1] text-[#7c8b66] h-4.5 min-w-4.5 py-0 px-1 text-[10px] rounded-sm data-[ui~=orange]:bg-[#f4d5c4] data-[ui~=orange]:text-[#ad6340] in-data-[ui~=theme-dark]:bg-(--a-selected) in-data-[ui~=theme-dark]:text-(--a-text) [[data-ui~=theme-dark]_&[data-ui~=orange]]:bg-[#f45e3826] [[data-ui~=theme-dark]_&[data-ui~=orange]]:text-[#ff9a7e]"
                      >
                        {unread}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/app/friends"
                    data-ui={pathname === "/app/friends" ? "active" : ""}
                  >
                    <AppIcon name="people" size={19} />
                    <span>Friends</span>
                    {state.pending.length > 0 && (
                      <span
                        data-ui="a-count"
                        className="flex-none! inline-flex items-center justify-center bg-[#dde3d1] text-[#7c8b66] h-4.5 min-w-4.5 py-0 px-1 text-[10px] rounded-sm in-data-[ui~=theme-dark]:bg-(--a-selected) in-data-[ui~=theme-dark]:text-(--a-text)"
                      >
                        {state.pending.length}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/app/saved"
                    data-ui={pathname === "/app/saved" ? "active" : ""}
                  >
                    <AppIcon name="bookmark" size={18} />
                    <span>Saved for later</span>
                  </Link>
                </nav>
                {community && (
                  <div
                    data-ui="a-channel-groups"
                    className="[&_[data-ui~=a-sidebar-label]_button]:shrink-0 [&_[data-ui~=a-sidebar-label]_button]:p-1"
                  >
                    {getChannelCategories(community).map((group) => (
                      <div key={group}>
                        <div
                          data-ui="a-sidebar-label"
                          className="flex items-center justify-between gap-2 mt-6 mb-2.25 mx-2.25 text-(--a-faint) font-mono text-[9px] font-normal tracking-[1px] [&_button]:p-0 [&_button]:text-(--a-faint) [&_button]:bg-transparent [&_button]:flex [&_button:hover]:text-(--a-green)"
                        >
                          <span
                            data-ui="a-category-name"
                            className="min-w-0 wrap-anywhere uppercase"
                            title={group}
                          >
                            {group}
                          </span>
                          <button
                            aria-label={`Create channel in ${group}`}
                            title="Create a channel"
                            onClick={() =>
                              setModal({
                                type: "create-channel",
                                communityId: community.id,
                                group,
                              })
                            }
                          >
                            <AppIcon name="plus" size={14} />
                          </button>
                        </div>
                        <nav aria-label={group}>
                          {!community.channels.some(
                            (c) => c.group === group,
                          ) && (
                            <button
                              data-ui="a-empty-category"
                              className="flex items-center gap-2 w-full py-2.25 px-2.5 bg-transparent text-(--a-muted) rounded-md text-left text-[11px]! hover:text-(--a-text) hover:bg-(--a-hover)"
                              onClick={() =>
                                setModal({
                                  type: "create-channel",
                                  communityId: community.id,
                                  group,
                                })
                              }
                            >
                              <AppIcon name="plus" size={14} /> Add a channel
                            </button>
                          )}
                          {community.channels
                            .filter((c) => c.group === group)
                            .map((channel) => (
                              <Link
                                key={channel.id}
                                to="/app/community/$communityId/$channelId"
                                params={{
                                  communityId: community.id,
                                  channelId: channel.id,
                                }}
                                onClick={() => {
                                  if (channel.unread)
                                    setState((previous) => ({
                                      ...previous,
                                      communities: previous.communities.map(
                                        (c) =>
                                          c.id === community.id
                                            ? {
                                                ...c,
                                                channels: c.channels.map(
                                                  (ch) =>
                                                    ch.id === channel.id
                                                      ? { ...ch, unread: 0 }
                                                      : ch,
                                                ),
                                              }
                                            : c,
                                      ),
                                    }));
                                }}
                                data-ui={`a-channel-link ${pathname === `/app/community/${community.id}/${channel.id}` ? "active" : ""}`}
                                className="flex items-center rounded-md text-[13px] text-(--a-muted) gap-2 mb-0.75 py-1.75 px-2.5 hover:bg-(--a-hover) hover:text-(--a-text) data-[ui~=active]:bg-(--a-selected) data-[ui~=active]:text-(--a-green) data-[ui~=active]:font-[650] [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:min-w-0 [&>span:nth-child(2)]:truncate [&>svg]:text-(--a-faint) [&>svg]:shrink-0 [&[data-ui~=active]>svg]:text-(--a-green)"
                              >
                                <AppIcon
                                  name={channel.private ? "lock" : "hash"}
                                  size={19}
                                />
                                <span>{channel.name}</span>
                                {!!channel.unread && (
                                  <span
                                    data-ui="a-count"
                                    className="flex-none! inline-flex items-center justify-center bg-[#dde3d1] text-[#7c8b66] h-4.5 min-w-4.5 py-0 px-1 text-[10px] rounded-sm in-data-[ui~=theme-dark]:bg-(--a-selected) in-data-[ui~=theme-dark]:text-(--a-text)"
                                  >
                                    {channel.unread}
                                  </span>
                                )}
                              </Link>
                            ))}
                        </nav>
                      </div>
                    ))}
                    <button
                      data-ui="a-create-category"
                      className="flex items-center gap-2 w-full py-2.25 px-2.5 bg-transparent text-(--a-muted) rounded-md text-left mt-4 text-[11px]! hover:text-(--a-text) hover:bg-(--a-hover)"
                      onClick={() =>
                        setModal({
                          type: "create-category",
                          communityId: community.id,
                        })
                      }
                    >
                      <AppIcon name="folder" size={15} /> Create category
                    </button>
                  </div>
                )}
                <div
                  data-ui="a-sidebar-label a-dm-label"
                  className="flex items-center justify-between gap-2 mb-2.25 mx-2.25 text-(--a-faint) font-mono text-[9px] font-normal tracking-[1px] mt-6.25 [&_button]:p-0 [&_button]:text-(--a-faint) [&_button]:bg-transparent [&_button]:flex [&_button:hover]:text-(--a-green)"
                >
                  <span>DIRECT MESSAGES</span>
                  <button
                    title="New message"
                    aria-label="New direct message"
                    onClick={() => setModal({ type: "new-message" })}
                  >
                    <AppIcon name="plus" size={14} />
                  </button>
                </div>
                <nav
                  data-ui="a-dm-list"
                  className="[&>a:hover]:bg-(--a-hover) [&>a:hover]:text-(--a-text) [&>a[data-ui~=active]]:bg-(--a-selected) [&>a[data-ui~=active]]:text-(--a-green) [&>a[data-ui~=active]]:font-[650] [&>a]:flex [&>a]:items-center [&>a]:gap-2.25 [&>a]:min-h-12.75 [&>a]:py-1.75 [&>a]:px-2.25 [&>a]:rounded-md [&>a>span:nth-child(2)]:flex-1 [&>a>span:nth-child(2)]:min-w-0 [&_strong]:text-[12px] [&_strong]:font-[550] [&_strong]:block [&_small]:text-[9px] [&_small]:text-(--a-faint) [&_small]:block [&_small]:mt-0.75 [&_small]:truncate"
                  aria-label="Direct messages"
                >
                  {dmPeople.map((person) => (
                    <Link
                      key={person.id}
                      to="/app/dm/$personId"
                      params={{ personId: person.id }}
                      data-ui={
                        pathname === `/app/dm/${person.id}` ? "active" : ""
                      }
                    >
                      <PersonAvatar person={person} presence />
                      <span>
                        <strong>{person.name.split(" ")[0]}</strong>
                        <small>{person.activity}</small>
                      </span>
                      {person.id === "jamie" &&
                        !state.messages.some(
                          (m) =>
                            m.conversation === "dm:jamie" &&
                            m.time !== "Yesterday" &&
                            m.author === "you",
                        ) && (
                          <i
                            data-ui="a-unread-dot"
                            className="rounded-full bg-[#df9774] size-1.5"
                          />
                        )}
                    </Link>
                  ))}
                </nav>
                {!community && (
                  <Link
                    to="/app/discover"
                    data-ui="a-discover-teaser"
                    className="flex flex-col py-5 px-3.75 border border-solid border-(--a-border) rounded-lg mt-7.5 mb-0 mx-0.5 bg-(--a-soft) text-(--a-green) [&>svg]:mb-3.25 [&_strong]:text-[12px] [&>span]:text-[11px] [&>span]:text-(--a-muted) [&>span]:leading-[1.7] [&>span]:mt-1.25 [&_small]:flex [&_small]:items-center [&_small]:gap-1.5 [&_small]:text-[10px] [&_small]:mt-3.75"
                  >
                    <AppIcon name="sun" size={27} />
                    <strong>Your people are out there.</strong>
                    <span>Find another corner to call home.</span>
                    <small>
                      Explore communities <AppIcon name="right" size={14} />
                    </small>
                  </Link>
                )}
              </div>
              <div data-ui="a-sidebar-note" className="pt-0 pb-3 px-4">
                <PreviewNote />
              </div>
              <footer
                data-ui="a-user-bar"
                className="min-h-17 py-3 px-3.25 flex items-center gap-1.75 bg-[#e7ebdd] [border-top-width:1px] [border-top-style:solid] border-t-(--a-border) in-data-[ui~=theme-dark]:bg-(--a-rail) [&>button]:flex [&>button]:items-center [&>button]:flex-1 [&>button]:gap-2.5 [&>button]:min-w-0 [&>button]:text-left [&>button]:bg-transparent [&>button]:p-0 [&>button>span:nth-child(2)]:min-w-0 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:block [&_small]:text-[9px] [&_small]:text-(--a-muted) [&_small]:mt-0.75 [&_small]:truncate"
              >
                <button
                  onClick={() => setModal({ type: "profile", personId: "you" })}
                >
                  <PersonAvatar person={findPerson("you")} presence />
                  <span>
                    <strong>{state.profile.name.split(" ")[0]}</strong>
                    <small>
                      {state.profile.status === "online"
                        ? "Happy to be here"
                        : state.profile.status === "away"
                          ? "Taking a little break"
                          : "Keeping it quiet"}
                    </small>
                  </span>
                </button>
                <Link
                  to="/app/settings"
                  search={{ section: "profile" }}
                  data-ui="a-icon-button"
                  className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green)"
                  aria-label="User settings"
                  title="User settings"
                >
                  <AppIcon name="settings" size={19} />
                </Link>
              </footer>
            </aside>
          </div>
        </>
      )}
      <main
        id="main"
        data-ui="a-main"
        className="flex-1 min-w-0 min-h-0 overflow-hidden max-[760px]:w-full"
        inert={drawer}
      >
        <Outlet />
      </main>
      <AppDialogs />
      {toast && (
        <div
          data-ui="a-toast"
          className="flex items-center gap-2.5 fixed z-100 bottom-6 left-1/2 transform-[translateX(-50%)] w-max max-w-[calc(100vw-36px)] bg-(--a-text) text-(--a-bg) border border-solid border-(--a-border) shadow-[0_7px_30px_#17200a20] rounded-[9px] py-3.5 px-4.75 text-[12px] leading-[1.6] pointer-events-none [&>svg]:text-[#bdcf9e] [&>svg]:shrink-0 [[data-ui~=theme-dark]_&>svg]:text-[#555555] max-[480px]:bottom-4.25 max-[480px]:text-[11px] max-[480px]:py-3 max-[480px]:px-3.75"
          role="status"
        >
          <AppIcon name="checkCircle" size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
