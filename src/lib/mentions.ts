import type { Channel, AppState, Person } from "../types/app";

export type ComposerQuery = {
  kind: "mention" | "channel";
  start: number;
  end: number;
  query: string;
};

export type MentionTarget =
  | { kind: "person"; key: string; handle: string; person: Person }
  | {
      kind: "group";
      key: string;
      handle: "everyone" | "admin";
      description: string;
      people: Person[];
    };

export function conversationPeople(
  state: AppState,
  conversation: string,
): Person[] {
  const profile = {
    ...state.profile,
    activity: state.preferences.activity ? state.profile.activity : "",
  };
  const people = [profile, ...state.people];
  const [communityId, personId] = conversation.split(":");
  if (communityId === "dm")
    return people.filter(
      (person) => person.id === "you" || person.id === personId,
    );
  const community = state.communities.find((item) => item.id === communityId);
  if (!community) return [];
  return people
    .filter(
      (person) =>
        !community.memberIds || community.memberIds.includes(person.id),
    )
    .map((person) => ({
      ...person,
      role: community.memberRoles?.[person.id] ?? person.role,
    }));
}

export function mentionTargets(
  state: AppState,
  conversation: string,
): MentionTarget[] {
  const people = conversationPeople(state, conversation);
  const targets: MentionTarget[] = people.map((person) => ({
    kind: "person",
    key: person.id,
    handle: person.handle,
    person,
  }));
  if (!conversation.startsWith("dm:")) {
    targets.push(
      {
        kind: "group",
        key: "everyone",
        handle: "everyone",
        description: "Everyone in this community",
        people,
      },
      {
        kind: "group",
        key: "admin",
        handle: "admin",
        description: "Community owners and admins",
        people: people.filter(
          (person) => person.role === "Owner" || person.role === "Admin",
        ),
      },
    );
  }
  return targets;
}

export function resolveMention(handle: string, targets: MentionTarget[]) {
  const normalized = handle.toLowerCase();
  // Group handles are reserved; @you keeps the original sample messages working.
  return (
    targets.find(
      (target) => target.kind === "group" && target.handle === normalized,
    ) ??
    targets.find(
      (target) =>
        target.handle.toLowerCase() === normalized ||
        (normalized === "you" && target.key === "you"),
    )
  );
}

export type ComposerHighlightPart = {
  kind: "text" | "mention" | "self-mention";
  text: string;
};

export function composerHighlightParts(
  text: string,
  targets: MentionTarget[],
  profile: Pick<Person, "id" | "handle">,
): ComposerHighlightPart[] {
  const parts: ComposerHighlightPart[] = [];
  let offset = 0;
  const excluded = Array.from(
    text.matchAll(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g),
    (match) => [match.index, match.index + match[0].length] as const,
  );
  const matches = text.matchAll(
    /(?<![\p{L}\p{N}_@])@[\p{L}\p{N}_-]+/gu,
  );
  for (const match of matches) {
    const index = match.index;
    if (index > offset)
      parts.push({ kind: "text", text: text.slice(offset, index) });
    const target = excluded.some(
      ([start, end]) => index >= start && index < end,
    )
      ? undefined
      : resolveMention(match[0].slice(1), targets);
    const self =
      target?.kind === "person" &&
      (target.key === profile.id ||
        target.handle.toLowerCase() === profile.handle.toLowerCase());
    parts.push({
      kind: target ? (self ? "self-mention" : "mention") : "text",
      text: match[0],
    });
    offset = index + match[0].length;
  }
  if (offset < text.length)
    parts.push({ kind: "text", text: text.slice(offset) });
  return parts.length ? parts : [{ kind: "text", text }];
}

function isInsideCode(text: string, caret: number) {
  const before = text.slice(0, caret);
  if ((before.match(/```/g)?.length ?? 0) % 2 !== 0) return true;
  const line = before.slice(before.lastIndexOf("\n") + 1);
  return (line.match(/`/g)?.length ?? 0) % 2 !== 0;
}

export function mentionAtCaret(
  text: string,
  caret: number,
): ComposerQuery | null {
  const before = text.slice(0, caret);
  // Don't suggest mentions inside code, email addresses, or URLs.
  if (isInsideCode(text, caret)) return null;
  const match = before.match(/(?:^|[\s([{])@([\p{L}\p{N}_\-. ]{0,64})$/u);
  if (!match) return null;
  const start = before.lastIndexOf("@");
  const tail = text.slice(caret).match(/^[\p{L}\p{N}_-]*/u)?.[0] ?? "";
  return {
    kind: "mention",
    start,
    end: caret + tail.length,
    query: match[1].toLowerCase().trim(),
  };
}

export function conversationChannels(
  state: AppState,
  conversation: string,
): Channel[] {
  if (conversation.startsWith("dm:")) return [];
  const communityId = conversation.split(":")[0];
  return (
    state.communities.find(
      (community) => community.id === communityId && community.joined,
    )?.channels ?? []
  );
}

export function channelAtCaret(
  text: string,
  caret: number,
): ComposerQuery | null {
  const before = text.slice(0, caret);
  if (isInsideCode(text, caret)) return null;
  const match = before.match(/(?:^|[\s([{])#([\p{L}\p{N}_-]{0,64})$/u);
  if (!match) return null;
  const start = before.lastIndexOf("#");
  const tail = text.slice(caret).match(/^[\p{L}\p{N}_-]*/u)?.[0] ?? "";
  return {
    kind: "channel",
    start,
    end: caret + tail.length,
    query: match[1].toLowerCase(),
  };
}

export function searchChannels(channels: Channel[], query: string) {
  return channels.filter((channel) =>
    `${channel.name} ${channel.description}`.toLowerCase().includes(query),
  );
}

export function resolveChannel(name: string, channels: Channel[]) {
  return channels.find(
    (channel) => channel.name.toLowerCase() === name.toLowerCase(),
  );
}

export function searchMentions(targets: MentionTarget[], query: string) {
  return targets.filter((target) => {
    const searchable =
      target.kind === "person"
        ? `${target.handle} ${target.person.name}`
        : `${target.handle} ${target.description}`;
    return searchable.toLowerCase().includes(query);
  });
}

export function isMentioned(text: string, targets: MentionTarget[]) {
  const withoutCodeAndLinks = text.replace(
    /```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g,
    "",
  );
  return Array.from(
    withoutCodeAndLinks.matchAll(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_-]+)/gu),
  ).some((match) => {
    const target = resolveMention(match[1], targets);
    return target?.kind === "person"
      ? target.key === "you"
      : target?.people.some((person) => person.id === "you");
  });
}
