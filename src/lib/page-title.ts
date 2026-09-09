import type { AppState } from "../types/app";

type TitleState = Pick<
  AppState,
  "communities" | "dmConversations" | "messages" | "people"
>;

const staticAppTitles: Record<string, string> = {
  "/app": "Home",
  "/app/": "Home",
  "/app/discover": "Discover communities",
  "/app/friends": "Friends",
  "/app/inbox": "Inbox",
  "/app/requests": "Message requests",
  "/app/saved": "Saved messages",
  "/app/welcome": "Welcome",
};

const settingsTitles: Record<string, string> = {
  profile: "Profile settings",
  appearance: "Appearance settings",
  notifications: "Notification settings",
  privacy: "Privacy settings",
  data: "Data settings",
};

function clean(value: string, fallback: string) {
  const result = value.replace(/\s+/g, " ").trim();
  return result ? result.slice(0, 90) : fallback;
}

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function formatPageTitle(label: string, unread = 0) {
  const count = Math.max(0, Math.floor(unread));
  const badge = count ? `(${count > 99 ? "99+" : count}) ` : "";
  return `${badge}${clean(label, "Home")} — Drocsid`;
}

export function unreadMessageCount(state: TitleState) {
  const channelUnread = state.communities.reduce(
    (communityTotal, community) =>
      communityTotal +
      community.channels.reduce(
        (channelTotal, channel) => channelTotal + (channel.unread ?? 0),
        0,
      ),
    0,
  );
  return state.dmConversations.reduce(
    (total, direct) => total + (direct.unread ?? 0),
    channelUnread,
  );
}

export function appPageTitle(
  pathname: string,
  search: Record<string, unknown>,
  state: TitleState,
) {
  const unread = unreadMessageCount(state);
  const settings = pathname.match(/^\/app\/community\/([^/]+)\/settings\/?$/);
  if (settings) {
    const communityId = decode(settings[1]);
    const community = state.communities.find(
      (item) => item.id === communityId,
    );
    return formatPageTitle(
      community ? `Community settings · ${community.name}` : "Community settings",
      unread,
    );
  }

  const channel = pathname.match(
    /^\/app\/community\/([^/]+)\/([^/]+)\/?$/,
  );
  if (channel) {
    const communityId = decode(channel[1]);
    const channelId = decode(channel[2]);
    const community = state.communities.find(
      (item) => item.id === communityId,
    );
    const room = community?.channels.find((item) => item.id === channelId);
    const channelName = clean(room?.name ?? channelId, "Channel");
    return formatPageTitle(
      community
        ? `#${channelName} · ${community.name}`
        : `#${channelName}`,
      unread,
    );
  }

  const direct = pathname.match(/^\/app\/dm\/([^/]+)\/?$/);
  if (direct) {
    const personId = decode(direct[1]);
    const person = state.people.find((item) => item.id === personId);
    return formatPageTitle(
      person
        ? person.handle
          ? `${person.name} (@${person.handle})`
          : person.name
        : "Direct message",
      unread,
    );
  }

  if (pathname === "/app/search") {
    const query = typeof search.q === "string" ? search.q : "";
    return formatPageTitle(
      query ? `Search · “${clean(query, "Search")}”` : "Search",
      unread,
    );
  }

  if (pathname === "/app/settings") {
    const section = typeof search.section === "string" ? search.section : "";
    return formatPageTitle(settingsTitles[section] ?? "Settings", unread);
  }

  return formatPageTitle(staticAppTitles[pathname] ?? "Home", unread);
}
