import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
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
          .querySelectorAll<HTMLDetailsElement>(".workspace details[open]")
          .forEach((details) => {
            if (details.contains(document.activeElement))
              details.querySelector("summary")?.focus();
            details.open = false;
          });
      }
    }
    function closeOutsideMenus(event: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(".workspace details[open]")
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
      className={`workspace theme-${state.preferences.theme} density-${state.preferences.density} text-${state.preferences.fontSize} ${standalone ? "workspace-standalone" : ""}`}
    >
      {!standalone && (
        <>
          <header className="a-mobile-header" inert={drawer}>
            <IconButton
              name="menu"
              label="Open sidebar"
              onClick={() => setDrawer(true)}
            />
            <Link to="/app" className="a-mobile-brand">
              <LogoMark /> drocsid.
            </Link>
            <Link to="/app/search" search={{ q: "" }} aria-label="Search">
              <AppIcon name="search" />
            </Link>
          </header>
          {drawer && (
            <button
              className="a-drawer-scrim"
              aria-label="Close sidebar"
              onClick={() => setDrawer(false)}
            />
          )}
          <div className={`a-navigation ${drawer ? "drawer-open" : ""}`}>
            <nav className="a-rail" aria-label="Your communities">
              <Link
                to="/app/friends"
                className={`a-rail-logo ${!community ? "active" : ""}`}
                title="Your people"
                aria-label="Your people"
              >
                <LogoMark />
              </Link>
              <div className="a-rail-divider" />
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
                    className={`a-community-icon tone-${c.color} ${community?.id === c.id ? "selected" : ""}`}
                  >
                    <AppIcon name={c.icon} size={25} />
                    {c.id === "creative" && !community && (
                      <span className="a-rail-dot" />
                    )}
                  </Link>
                ))}
              <button
                className="a-community-icon a-create-community"
                title="Create a community"
                aria-label="Create a community"
                onClick={() => setModal({ type: "create-community" })}
              >
                <AppIcon name="plus" size={23} />
              </button>
              <Link
                to="/app/discover"
                className={`a-rail-discover ${pathname === "/app/discover" ? "active" : ""}`}
                title="Discover communities"
                aria-label="Discover communities"
              >
                <AppIcon name="discover" size={25} />
              </Link>
              <div className="a-rail-spacer" />
              <button
                className="a-rail-help"
                onClick={() => setModal({ type: "help" })}
                title="A little help"
                aria-label="Help"
              >
                <AppIcon name="info" size={21} />
              </button>
              <Link
                to="/"
                className="a-rail-home"
                title="Back to the website"
                aria-label="Back to the website"
              >
                <AppIcon name="external" size={20} />
              </Link>
            </nav>
            <aside className="a-sidebar">
              <header className="a-sidebar-header">
                {community ? (
                  <details className="a-community-menu">
                    <summary>
                      <span>
                        <strong>{community.name}</strong>
                        <small>
                          <i /> A little corner, a lot of good company
                        </small>
                      </span>
                      <AppIcon name="down" size={16} />
                    </summary>
                    <div className="a-dropdown">
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
                  <div className="a-personal-title">
                    <strong>Your little corner.</strong>
                    <span>Good to have you around.</span>
                  </div>
                )}
              </header>
              <div className="a-sidebar-scroll">
                <Link
                  className="a-quick-search"
                  to="/app/search"
                  search={{ q: "" }}
                >
                  <AppIcon name="search" size={16} />
                  <span>Find a conversation</span>
                  <kbd>⌘ K</kbd>
                </Link>
                <nav
                  className="a-personal-nav"
                  aria-label="Personal navigation"
                >
                  <Link
                    to="/app/inbox"
                    className={pathname === "/app/inbox" ? "active" : ""}
                  >
                    <AppIcon name="inbox" size={19} />
                    <span>Inbox</span>
                    {unread > 0 && (
                      <span className="a-count orange">{unread}</span>
                    )}
                  </Link>
                  <Link
                    to="/app/friends"
                    className={pathname === "/app/friends" ? "active" : ""}
                  >
                    <AppIcon name="people" size={19} />
                    <span>Friends</span>
                    {state.pending.length > 0 && (
                      <span className="a-count">{state.pending.length}</span>
                    )}
                  </Link>
                  <Link
                    to="/app/saved"
                    className={pathname === "/app/saved" ? "active" : ""}
                  >
                    <AppIcon name="bookmark" size={18} />
                    <span>Saved for later</span>
                  </Link>
                </nav>
                {community && (
                  <div className="a-channel-groups">
                    {[...new Set(community.channels.map((c) => c.group))].map(
                      (group) => (
                        <div key={group}>
                          <div className="a-sidebar-label">
                            <span>{group}</span>
                            <button
                              aria-label={`Create channel in ${community.name}`}
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
                                  className={`a-channel-link ${pathname === `/app/community/${community.id}/${channel.id}` ? "active" : ""}`}
                                >
                                  <AppIcon
                                    name={channel.private ? "lock" : "hash"}
                                    size={19}
                                  />
                                  <span>{channel.name}</span>
                                  {!!channel.unread && (
                                    <span className="a-count">
                                      {channel.unread}
                                    </span>
                                  )}
                                </Link>
                              ))}
                          </nav>
                        </div>
                      ),
                    )}
                  </div>
                )}
                <div className="a-sidebar-label a-dm-label">
                  <span>DIRECT MESSAGES</span>
                  <button
                    title="New message"
                    aria-label="New direct message"
                    onClick={() => setModal({ type: "new-message" })}
                  >
                    <AppIcon name="plus" size={14} />
                  </button>
                </div>
                <nav className="a-dm-list" aria-label="Direct messages">
                  {dmPeople.map((person) => (
                    <Link
                      key={person.id}
                      to="/app/dm/$personId"
                      params={{ personId: person.id }}
                      className={
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
                        ) && <i className="a-unread-dot" />}
                    </Link>
                  ))}
                </nav>
                {!community && (
                  <Link to="/app/discover" className="a-discover-teaser">
                    <AppIcon name="sun" size={27} />
                    <strong>Your people are out there.</strong>
                    <span>Find another corner to call home.</span>
                    <small>
                      Explore communities <AppIcon name="right" size={14} />
                    </small>
                  </Link>
                )}
              </div>
              <div className="a-sidebar-note">
                <PreviewNote />
              </div>
              <footer className="a-user-bar">
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
                  className="a-icon-button"
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
      <main id="main" className="a-main" inert={drawer}>
        <Outlet />
      </main>
      <AppDialogs />
      {toast && (
        <div className="a-toast" role="status">
          <AppIcon name="checkCircle" size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
