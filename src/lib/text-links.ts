import tlds from "tlds" with { type: "json" };

export type TextLinkPart =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const domainLabel = String.raw`[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?`;

export const textLinkPatternSource = String.raw`(?:https?:\/\/[^\s<]+|(?<![@\p{L}\p{N}_-])(?:${domainLabel}\.)+[a-z]{2,63}(?:[/?#][^\s<]*)?)`;

const wholeLinkPattern = new RegExp(`^(?:${textLinkPatternSource})$`, "iu");
const knownTopLevelDomains = new Set(tlds);

function splitTrailingPunctuation(value: string) {
  let text = value;
  let trailing = "";
  while (text) {
    const last = text.at(-1)!;
    const simplePunctuation = ".,!?;:".includes(last);
    const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
    const opener = pairs[last];
    const unmatchedCloser =
      opener && text.split(last).length > text.split(opener).length;
    if (!simplePunctuation && !unmatchedCloser) break;
    trailing = last + trailing;
    text = text.slice(0, -1);
  }
  return { text, trailing };
}

export function externalTextLink(value: string) {
  if (!wholeLinkPattern.test(value)) return null;
  const { text, trailing } = splitTrailingPunctuation(value);
  if (!text) return null;
  const explicit = /^https?:\/\//i.test(text);
  const href = explicit ? text : `https://${text}`;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!explicit) {
      const topLevelDomain = url.hostname.toLowerCase().split(".").at(-1);
      if (!topLevelDomain || !knownTopLevelDomains.has(topLevelDomain))
        return null;
    }
  } catch {
    return null;
  }
  return { text, href, trailing };
}

export function textLinks(value: string): TextLinkPart[] {
  const matcher = new RegExp(textLinkPatternSource, "giu");
  const parts: TextLinkPart[] = [];
  let cursor = 0;
  for (const match of value.matchAll(matcher)) {
    const link = externalTextLink(match[0]);
    if (!link) continue;
    if (match.index > cursor)
      parts.push({ kind: "text", text: value.slice(cursor, match.index) });
    parts.push({ kind: "link", text: link.text, href: link.href });
    if (link.trailing) parts.push({ kind: "text", text: link.trailing });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length)
    parts.push({ kind: "text", text: value.slice(cursor) });
  return parts.length ? parts : [{ kind: "text", text: value }];
}
