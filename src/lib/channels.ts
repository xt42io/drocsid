import type { Channel, Community } from "../types/app";

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
