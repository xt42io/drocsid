import type { AppState, Channel, Community, Message } from "../types/app";

const legacyDefaultCategories = new Set([
  "START HERE",
  "THE COMMON ROOM",
  "CHANNELS",
]);

export function getChannelGroup(channel: Channel): string {
  return legacyDefaultCategories.has(channel.group) ? "" : channel.group;
}

export function showChannelWelcome(
  community: Community,
  channel: Channel,
  messages: Message[],
) {
  const role = community.memberRoles?.you;
  return (
    community.joined &&
    channel.name === "general" &&
    (role === "Owner" || role === "Admin") &&
    !channel.hasMessages &&
    !messages.some(
      (message) =>
        message.conversation === `${community.id}:${channel.id}` &&
        !message.sending &&
        !message.sendError,
    )
  );
}

export function getChannelCategories(community: Community): string[] {
  return [
    ...new Set([
      ...(community.channelCategories ?? []),
      ...community.channels.map(getChannelGroup),
    ]),
  ].filter(
    (category) => category && !legacyDefaultCategories.has(category),
  );
}
export function createDefaultChannels(): Channel[] {
  return [
    {
      id: "general",
      hasMessages: false,
      name: "general",
      group: "",
      description: "A place for a little bit of everything.",
    },
  ];
}

export type ChannelWriteResult = { communityId: string; channel: Channel };

export function applyChannel(
  state: AppState,
  result: ChannelWriteResult,
): AppState {
  return {
    ...state,
    communities: state.communities.map((community) => {
      if (community.id !== result.communityId) return community;
      const exists = community.channels.some((c) => c.id === result.channel.id);
      return {
        ...community,
        channelCategories: result.channel.group
          ? [
              ...new Set([
                ...(community.channelCategories ?? []),
                result.channel.group,
              ]),
            ]
          : community.channelCategories,
        channels: exists
          ? community.channels.map((c) =>
              c.id === result.channel.id
                ? {
                    ...c,
                    ...result.channel,
                    ...(c.unread === undefined ? {} : { unread: c.unread }),
                  }
                : c,
            )
          : [...community.channels, result.channel],
      };
    }),
  };
}
