export type EmojiQuery = {
  kind: "emoji";
  start: number;
  end: number;
  query: string;
};

function isInsideCode(text: string, caret: number) {
  const before = text.slice(0, caret);
  if ((before.match(/```/g)?.length ?? 0) % 2 !== 0) return true;
  const line = before.slice(before.lastIndexOf("\n") + 1);
  return (line.match(/`/g)?.length ?? 0) % 2 !== 0;
}

export function emojiAtCaret(text: string, caret: number): EmojiQuery | null {
  const before = text.slice(0, caret);
  if (isInsideCode(text, caret)) return null;
  const match = before.match(/(?:^|[\s([{]):([\p{L}\p{N}_+-]{0,40})$/u);
  if (!match) return null;
  const start = before.lastIndexOf(":");
  const tail = text.slice(caret).match(/^[\p{L}\p{N}_+-]*/u)?.[0] ?? "";
  return {
    kind: "emoji",
    start,
    end: caret + tail.length,
    query: match[1].toLowerCase(),
  };
}
