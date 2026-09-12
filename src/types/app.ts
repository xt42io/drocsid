export type Presence = "online" | "away" | "offline";
export type Person = {
  avatarUrl?: string;
  id: string;
  name: string;
  handle: string;
  color: string;
  status: Presence;
  bio: string;
  activity: string;
  role: "Owner" | "Admin" | "Moderator" | "Member";
};
export type Channel = {
  icon?: string;
  hasMessages?: boolean;
  id: string;
  name: string;
  description: string;
  group: string;
  private?: boolean;
  unread?: number;
};
export type Community = {
  iconUrl?: string;
  iconUploadId?: string;
  id: string;
  name: string;
  description: string;
  icon:
    | ""
    | "sun"
    | "leaf"
    | "coffee"
    | "book"
    | "game"
    | "brush"
    | "music"
    | "code";
  color: string;
  category: string;
  discoverable: boolean;
  members: number;
  memberIds?: string[];
  memberRoles?: Record<string, Person["role"]>;
  bannedIds?: string[];
  joined: boolean;
  channels: Channel[];
  channelCategories?: string[];
};
export type Reaction = { emoji: string; count: number; mine?: boolean };
export type Message = {
  sending?: boolean;
  sendError?: string;
  id: string;
  conversation: string;
  author: string;
  text: string;
  time: string;
  reactions: Reaction[];
  pinned?: boolean;
  saved?: boolean;
  edited?: boolean;
  threadOf?: string;
  createdAt?: string;
  attachments?: Attachment[];
};
export type Attachment = {
  id: string;
  name: string;
  contentType: string;
  byteSize: number;
  url: string;
};
export type Activity = {
  id: string;
  person: string;
  type: "mention" | "reply" | "invite";
  text: string;
  community: string;
  channel: string;
  time: string;
  read: boolean;
};
export type Preferences = {
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  fontSize: "default" | "large";
  notifications: boolean;
  mentions: boolean;
  sounds: boolean;
  directMessages: boolean;
  activity: boolean;
};
export type AppState = {
  version: 1;
  profile: Person;
  people: Person[];
  communities: Community[];
  messages: Message[];
  friends: string[];
  dmConversations: DirectConversation[];
  pending: string[];
  outgoing: string[];
  blocked: string[];
  activities: Activity[];
  preferences: Preferences;
  muted: string[];
  drafts: Record<string, string>;
  onboardingComplete: boolean;
};

export type DirectConversation = {
  conversation: string;
  messagingBlocked: boolean;
  hasMessages: boolean;
  unread: number;
  personId: string;
  status: "pending" | "accepted" | "declined";
  incoming: boolean;
};
