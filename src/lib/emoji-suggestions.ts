import emojiData from "emoji-picker-react/dist/data/emojis-en.js";

export type EmojiSuggestion = {
  emoji: string;
  shortcode: string;
  name: string;
};

type EmojiRecord = {
  n: string[];
  u: string;
};

const records = Object.values(emojiData.emojis).flat() as EmojiRecord[];

function fromUnified(unified: string) {
  return String.fromCodePoint(
    ...unified.split("-").map((codepoint) => Number.parseInt(codepoint, 16)),
  );
}

function shortcode(names: string[]) {
  const canonical = names.at(-1) ?? names[0] ?? "emoji";
  return canonical
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function score(names: string[], query: string) {
  if (!query) return 0;
  const normalized = names.map((name) => name.toLowerCase());
  if (normalized.some((name) => name === query)) return 0;
  if (normalized.some((name) => name.startsWith(query))) return 1;
  if (
    normalized.some((name) =>
      name.split(/\s+/).some((word) => word.startsWith(query)),
    )
  )
    return 2;
  if (normalized.some((name) => name.includes(query))) return 3;
  return Number.POSITIVE_INFINITY;
}

export function searchEmojiSuggestions(query: string, limit = 8) {
  return records
    .map((record, index) => ({ record, index, score: score(record.n, query) }))
    .filter(({ score: matchScore }) => Number.isFinite(matchScore))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map(({ record }) => ({
      emoji: fromUnified(record.u),
      shortcode: shortcode(record.n),
      name: record.n.at(-1) ?? record.n[0] ?? "Emoji",
    })) satisfies EmojiSuggestion[];
}
