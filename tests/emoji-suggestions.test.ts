import assert from "node:assert/strict";
import test from "node:test";
import { emojiAtCaret } from "../src/lib/emoji-query.ts";
import { searchEmojiSuggestions } from "../src/lib/emoji-suggestions.ts";

test("emoji query finds a colon shortcode at the caret", () => {
  const text = "that was :lol";
  assert.deepEqual(emojiAtCaret(text, text.length), {
    kind: "emoji",
    start: text.indexOf(":"),
    end: text.length,
    query: "lol",
  });
});

test("emoji query ignores times, URLs and inline code", () => {
  assert.equal(emojiAtCaret("meet at 12:30", 13), null);
  assert.equal(emojiAtCaret("https://drocsid.app:lol", 23), null);
  assert.equal(emojiAtCaret("`:lol`", 5), null);
});

test("emoji search returns ranked aliases and respects its limit", () => {
  const results = searchEmojiSuggestions("lol", 5);
  assert.equal(results.length, 5);
  assert.ok(results.every((result) => result.emoji.length > 0));
  assert.ok(results.some((result) => result.name.toLowerCase().includes("laugh")));
  assert.deepEqual(searchEmojiSuggestions("notarealemojiquery"), []);
});
