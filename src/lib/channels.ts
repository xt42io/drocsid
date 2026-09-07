import type { AppState, Channel, Community } from "../types/app";

export function getChannelCategories(community: Community): string[] {
  return [
    ...new Set([
      ...(community.channelCategories ?? []),
      ...community.channels.map((channel) => channel.group),
    ]),
  ];
}
export function createDefaultChannels(): Channel[] {
  return [
    {
      id: "welcome",
      name: "welcome",
      group: "START HERE",
      description: "A few things to help you feel at home.",
    },
    {
      id: "introductions",
      name: "introductions",
      group: "START HERE",
      description: "Come as you are. Tell us a little about yourself.",
    },
    {
      id: "general",
      name: "general",
      group: "THE COMMON ROOM",
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
        channelCategories: [
          ...new Set([
            ...(community.channelCategories ?? []),
            result.channel.group,
          ]),
        ],
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
