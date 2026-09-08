export type InvitePreview = {
  code: string;
  community: {
    id: string;
    name: string;
    description: string;
    icon: "" | "sun" | "leaf" | "coffee" | "book" | "game" | "brush" | "music" | "code";
    iconUrl?: string;
    color: string;
    members: number;
  };
};

export type InviteLink = {
  code: string;
  url: string;
};

export type AcceptedInvite = {
  communityId: string;
  channelId: string;
};
