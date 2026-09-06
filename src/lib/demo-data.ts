export type Presence = "online" | "away" | "offline";
export type Person = {
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
  id: string;
  name: string;
  description: string;
  group: string;
  private?: boolean;
  unread?: number;
};
export type Community = {
  id: string;
  name: string;
  description: string;
  icon:
    "sun" | "leaf" | "coffee" | "book" | "game" | "brush" | "music" | "code";
  color: string;
  category: string;
  members: number;
  memberIds?: string[];
  joined: boolean;
  channels: Channel[];
  channelCategories?: string[];
};
export function getChannelCategories(community: Community): string[] {
  return [
    ...new Set([
      ...(community.channelCategories ?? []),
      ...community.channels.map((channel) => channel.group),
    ]),
  ];
}
export type Reaction = { emoji: string; count: number; mine?: boolean };
export type Message = {
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
export type DemoState = {
  version: 1;
  profile: Person;
  people: Person[];
  communities: Community[];
  messages: Message[];
  friends: string[];
  pending: string[];
  outgoing: string[];
  blocked: string[];
  activities: Activity[];
  preferences: Preferences;
  muted: string[];
  drafts: Record<string, string>;
  onboardingComplete: boolean;
};

export const people: Person[] = [
  {
    id: "jamie",
    name: "Jamie Park",
    handle: "jamie",
    color: "purple",
    status: "online",
    bio: "Making things on the internet. Probably cheering you on. 🌱",
    activity: "Working on something good",
    role: "Moderator",
  },
  {
    id: "alex",
    name: "Alex Morgan",
    handle: "alexm",
    color: "peach",
    status: "online",
    bio: "Developer, coffee person, chronic side-project starter.",
    activity: "One more cup of coffee",
    role: "Member",
  },
  {
    id: "sam",
    name: "Sam Rivers",
    handle: "samr",
    color: "green",
    status: "online",
    bio: "Design, good books, and playlists for very specific moods.",
    activity: "Making a little progress",
    role: "Member",
  },
  {
    id: "riley",
    name: "Riley Chen",
    handle: "riley",
    color: "yellow",
    status: "away",
    bio: "Designer by day. Amateur baker at every other opportunity.",
    activity: "Stepped out for a walk",
    role: "Member",
  },
  {
    id: "maya",
    name: "Maya Okafor",
    handle: "maya",
    color: "blue",
    status: "online",
    bio: "Turning small ideas into things you can actually use.",
    activity: "Sketching the next thing",
    role: "Member",
  },
  {
    id: "leo",
    name: "Leo Santos",
    handle: "leos",
    color: "peach",
    status: "offline",
    bio: "Photographs, road trips, and stories worth telling.",
    activity: "Last around yesterday",
    role: "Member",
  },
  {
    id: "ava",
    name: "Ava Wilson",
    handle: "avaw",
    color: "purple",
    status: "offline",
    bio: "A little bit of code. A lot of curiosity.",
    activity: "Last around 2 hours ago",
    role: "Member",
  },
  {
    id: "noah",
    name: "Noah Williams",
    handle: "noahw",
    color: "green",
    status: "online",
    bio: "Here for the good conversations and the occasional bad pun.",
    activity: "Around for a chat",
    role: "Member",
  },
];

export function starterChannels(): Channel[] {
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
    {
      id: "show-and-tell",
      name: "show-and-tell",
      group: "THE COMMON ROOM",
      description: "Big launches, small wins, works in progress.",
      unread: 3,
    },
    {
      id: "off-topic",
      name: "off-topic",
      group: "THE COMMON ROOM",
      description: "The conversations between the conversations.",
    },
    {
      id: "resources",
      name: "resources",
      group: "MAKING THINGS",
      description: "Good finds are even better when shared.",
    },
    {
      id: "feedback",
      name: "feedback",
      group: "MAKING THINGS",
      description: "A fresh pair of eyes, kindly offered.",
    },
  ];
}
export const communities: Community[] = [
  {
    id: "creative",
    name: "The Creative Corner",
    description:
      "A cozy corner for people who make things. Share your work, find your next idea, and enjoy the process together.",
    icon: "sun",
    color: "peach",
    category: "Design & making",
    members: 128,
    joined: true,
    channels: starterChannels(),
  },
  {
    id: "greenhouse",
    name: "The Greenhouse",
    description:
      "A place to grow things, ask questions, and celebrate the arrival of one very small leaf.",
    icon: "leaf",
    color: "green",
    category: "Life & hobbies",
    members: 86,
    joined: true,
    channels: starterChannels().filter(
      (c) => !["feedback", "resources"].includes(c.id),
    ),
  },
  {
    id: "coffee-club",
    name: "Coffee & Company",
    description:
      "Slow mornings, good coffee, and people who appreciate both. Pull up a chair.",
    icon: "coffee",
    color: "yellow",
    category: "Life & hobbies",
    members: 64,
    joined: true,
    channels: starterChannels().slice(0, 5),
  },
  {
    id: "little-library",
    name: "The Little Library",
    description:
      "For the just-one-more-chapter crowd. Find your next read and someone to talk about it with.",
    icon: "book",
    color: "purple",
    category: "Books & culture",
    members: 213,
    joined: false,
    channels: starterChannels().slice(0, 5),
  },
  {
    id: "side-projects",
    name: "Side Project Society",
    description:
      "Your half-finished idea has good company here. Build, share, and find a little momentum.",
    icon: "code",
    color: "blue",
    category: "Technology",
    members: 342,
    joined: false,
    channels: starterChannels(),
  },
  {
    id: "after-hours",
    name: "After Hours Arcade",
    description:
      "Co-op friends, indie discoveries, and one more round. All skill levels welcome.",
    icon: "game",
    color: "peach",
    category: "Gaming",
    members: 196,
    joined: false,
    channels: starterChannels().slice(0, 5),
  },
  {
    id: "listening-room",
    name: "The Listening Room",
    description:
      "Trade a song, discover a new favorite, and talk about the records you keep coming back to.",
    icon: "music",
    color: "yellow",
    category: "Books & culture",
    members: 105,
    joined: false,
    channels: starterChannels().slice(0, 5),
  },
  {
    id: "sketchbook",
    name: "Open Sketchbook",
    description:
      "A friendly place for your sketches, messy drafts, and creative experiments.",
    icon: "brush",
    color: "green",
    category: "Design & making",
    members: 178,
    joined: false,
    channels: starterChannels(),
  },
];
const m = (
  id: string,
  conversation: string,
  author: string,
  text: string,
  time: string,
  reactions: Reaction[] = [],
  extra: Partial<Message> = {},
): Message => ({ id, conversation, author, text, time, reactions, ...extra });
export const messages: Message[] = [
  m(
    "g1",
    "creative:general",
    "jamie",
    "Morning, everyone! What are we making today? ☀️",
    "10:42 AM",
    [{ emoji: "☀️", count: 4 }],
  ),
  m(
    "g2",
    "creative:general",
    "alex",
    "Finally giving my side project a little love. And an unreasonable amount of coffee.",
    "10:44 AM",
    [
      { emoji: "☕", count: 3 },
      { emoji: "🤝", count: 2 },
    ],
  ),
  m(
    "g3",
    "creative:general",
    "sam",
    "A playlist for people who have 37 tabs open and call it a workflow 🎶",
    "10:45 AM",
    [{ emoji: "😂", count: 6 }],
  ),
  m(
    "g4",
    "creative:general",
    "riley",
    "I feel very seen by this conversation.",
    "10:46 AM",
    [{ emoji: "🧡", count: 3 }],
  ),
  m(
    "g5",
    "creative:general",
    "maya",
    "Small reminder: you don’t have to finish something today for it to count as progress. Showing up is a pretty good start.",
    "10:49 AM",
    [
      { emoji: "🌱", count: 8 },
      { emoji: "🧡", count: 5 },
    ],
    { pinned: true },
  ),
  m(
    "g6",
    "creative:general",
    "jamie",
    "@you how’s that new project coming along? Would love to see what you’ve been working on!",
    "10:52 AM",
    [],
  ),
  m(
    "g7",
    "creative:general",
    "you",
    "Slowly, then all at once. I finally found a direction that feels right! ✨",
    "10:54 AM",
    [{ emoji: "🎉", count: 4 }],
  ),
  m(
    "g8",
    "creative:general",
    "alex",
    "That’s the best part. The moment it starts feeling like a real thing.",
    "10:55 AM",
  ),
  m(
    "t1",
    "creative:general",
    "sam",
    "Needed this today. The tiny steps add up.",
    "10:51 AM",
    [{ emoji: "🧡", count: 2 }],
    { threadOf: "g5" },
  ),
  m(
    "t2",
    "creative:general",
    "maya",
    "Exactly. Rooting for whatever you’re making! 🌿",
    "10:53 AM",
    [],
    { threadOf: "g5" },
  ),
  m(
    "w1",
    "creative:welcome",
    "jamie",
    "Welcome to The Creative Corner! 👋\n\nThis is a little space for people who make things. Designers, developers, writers, curious humans — you’re all in the right place.\n\nA few house rules:\n• Be kind. There’s a person on the other side of every message.\n• Share what you know, and ask what you don’t.\n• Feedback is a gift. Give it thoughtfully.\n• Celebrate the small stuff. It’s usually the big stuff in disguise.\n\nSay hello in #introductions, share your work in #show-and-tell, or just hang out in #general.",
    "9:00 AM",
    [
      { emoji: "👋", count: 24 },
      { emoji: "🧡", count: 18 },
    ],
    { pinned: true },
  ),
  m(
    "i1",
    "creative:introductions",
    "riley",
    "Hey, I’m Riley! Designer, weekend baker, and collector of unfinished notebooks. Happy to be here. 👋",
    "9:12 AM",
    [{ emoji: "👋", count: 8 }],
  ),
  m(
    "i2",
    "creative:introductions",
    "jamie",
    "You’re in exactly the right place. Welcome to the corner! Make yourself at home.",
    "9:14 AM",
    [{ emoji: "🧡", count: 5 }],
  ),
  m(
    "i3",
    "creative:introductions",
    "alex",
    "Important question: sourdough or cinnamon rolls?",
    "9:16 AM",
  ),
  m(
    "s1",
    "creative:show-and-tell",
    "sam",
    "Small win: shipped the first version of my little reading tracker today! 📚\n\nIt’s simple: a shelf for what I’m reading, a spot for notes, and absolutely no pressure to read 100 books a year.",
    "11:03 AM",
    [{ emoji: "🎉", count: 7 }],
    { saved: true },
  ),
  m(
    "s2",
    "creative:show-and-tell",
    "jamie",
    "The best feeling. What was your favorite part of building it?",
    "11:05 AM",
  ),
  m(
    "s3",
    "creative:show-and-tell",
    "sam",
    "Honestly? Sharing it with you all.",
    "11:07 AM",
    [{ emoji: "🧡", count: 9 }],
  ),
  m(
    "o1",
    "creative:off-topic",
    "alex",
    "This is your reminder to drink some water and look at something that isn’t a screen. 🌿",
    "2:15 PM",
    [{ emoji: "💧", count: 5 }],
  ),
  m(
    "o2",
    "creative:off-topic",
    "riley",
    "Does staring at my houseplant while thinking about my screen count?",
    "2:17 PM",
    [{ emoji: "😂", count: 8 }],
  ),
  m("o3", "creative:off-topic", "jamie", "We’ll allow it.", "2:18 PM"),
  m(
    "r1",
    "creative:resources",
    "maya",
    "A good read for anyone making things for the web: https://web.dev/learn/accessibility\n\nThe little details make a big difference.",
    "Yesterday",
    [{ emoji: "🔖", count: 6 }],
    { pinned: true },
  ),
  m(
    "r2",
    "creative:resources",
    "alex",
    "Adding this one: https://developer.mozilla.org/en-US/docs/Learn_web_development\n\nStill my first stop when I need a refresher.",
    "Yesterday",
  ),
  m(
    "f1",
    "creative:feedback",
    "riley",
    "Working on a little portfolio refresh. What’s one thing you always look for on someone’s personal site?",
    "1:22 PM",
    [{ emoji: "👀", count: 3 }],
  ),
  m(
    "f2",
    "creative:feedback",
    "maya",
    "Something that sounds like them. I love a good about page that feels like a conversation.",
    "1:25 PM",
  ),
  m(
    "gr1",
    "greenhouse:general",
    "sam",
    "New leaf day! My monstera is finally doing its thing. 🌱",
    "9:30 AM",
    [{ emoji: "🌿", count: 7 }],
  ),
  m(
    "gr2",
    "greenhouse:general",
    "maya",
    "The most satisfying notification of all.",
    "9:32 AM",
  ),
  m(
    "co1",
    "coffee-club:general",
    "alex",
    "Today’s setup: a pour-over, a rainy window, and absolutely no plans. ☕",
    "8:40 AM",
    [{ emoji: "☕", count: 6 }],
  ),
  m(
    "co2",
    "coffee-club:general",
    "riley",
    "Sounds like you’ve already won the day.",
    "8:45 AM",
  ),
  m(
    "d1",
    "dm:jamie",
    "jamie",
    "Hey! Really glad you found your way to the corner. How’s your week been?",
    "Yesterday",
  ),
  m(
    "d2",
    "dm:jamie",
    "you",
    "A good kind of busy. This community is exactly the kind of place I’ve been looking for.",
    "Yesterday",
    [{ emoji: "🧡", count: 1 }],
  ),
  m(
    "d3",
    "dm:jamie",
    "jamie",
    "That makes me so happy to hear. We’ve got a lovely little bunch here.",
    "Yesterday",
  ),
  m(
    "d4",
    "dm:jamie",
    "jamie",
    "Also — no pressure to be productive all the time. Sometimes just hanging out is the whole point. 🌿",
    "10:30 AM",
    [{ emoji: "🧡", count: 1, mine: true }],
  ),
  m(
    "d5",
    "dm:alex",
    "alex",
    "That thing you shared in #general — very cool. How did you come up with the idea?",
    "9:45 AM",
  ),
  m(
    "d6",
    "dm:alex",
    "you",
    "It started as something I wanted to use myself, honestly!",
    "9:48 AM",
  ),
  m(
    "d7",
    "dm:alex",
    "alex",
    "The best kind of side project. Let me know if you want a second pair of eyes.",
    "9:50 AM",
  ),
  m(
    "d8",
    "dm:sam",
    "sam",
    "Found a playlist that has your name written all over it. Remind me to send it your way. 🎶",
    "Yesterday",
  ),
];

export function initialState(): DemoState {
  return structuredClone({
    version: 1,
    profile: {
      id: "you",
      name: "Taylor Brooks",
      handle: "taylor",
      color: "blue",
      status: "online",
      bio: "Making little things for the internet. Happy to be here. ✨",
      activity: "Finding my corner",
      role: "Owner",
    },
    people,
    communities,
    messages,
    friends: ["jamie", "alex", "sam", "riley", "maya", "leo"],
    pending: ["noah"],
    outgoing: [],
    blocked: [],
    activities: [
      {
        id: "a1",
        person: "jamie",
        type: "mention",
        text: "how’s that new project coming along? Would love to see what you’ve been working on!",
        community: "creative",
        channel: "general",
        time: "10:52 AM",
        read: false,
      },
      {
        id: "a2",
        person: "sam",
        type: "reply",
        text: "Needed this today. The tiny steps add up.",
        community: "creative",
        channel: "general",
        time: "10:51 AM",
        read: false,
      },
      {
        id: "a3",
        person: "maya",
        type: "mention",
        text: "Thought you might like this accessibility guide. Lots of good details in here.",
        community: "creative",
        channel: "resources",
        time: "Yesterday",
        read: true,
      },
    ],
    preferences: {
      theme: "light",
      density: "comfortable",
      fontSize: "default",
      notifications: true,
      mentions: true,
      sounds: false,
      directMessages: true,
      activity: true,
    },
    muted: [],
    drafts: {},
    onboardingComplete: false,
  } satisfies DemoState);
}
export function personName(person?: Person) {
  return person?.name.split(" ")[0] ?? "Someone";
}
export function conversationLabel(key: string, state: DemoState) {
  const [communityId, channelId] = key.split(":");
  if (communityId === "dm")
    return (
      state.people.find((p) => p.id === channelId)?.name ?? "Direct message"
    );
  const community = state.communities.find((c) => c.id === communityId);
  return `${community?.name ?? "Community"} / #${community?.channels.find((c) => c.id === channelId)?.name ?? channelId}`;
}
