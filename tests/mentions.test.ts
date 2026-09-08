import assert from "node:assert/strict";
import test from "node:test";
import {
  composerHighlightParts,
  type MentionTarget,
} from "../src/lib/mentions";

const targets: MentionTarget[] = [
  {
    kind: "person",
    key: "viewer",
    handle: "ada",
    person: {
      id: "viewer",
      name: "Ada",
      handle: "ada",
      color: "#fff",
      status: "online",
      bio: "",
      activity: "",
      role: "Member",
    },
  },
  {
    kind: "person",
    key: "friend",
    handle: "grace",
    person: {
      id: "friend",
      name: "Grace",
      handle: "grace",
      color: "#fff",
      status: "online",
      bio: "",
      activity: "",
      role: "Member",
    },
  },
];

test("composer highlights resolved mentions and distinguishes the viewer", () => {
  assert.deepEqual(
    composerHighlightParts("Hi @grace and @ada", targets, {
      id: "viewer",
      handle: "ada",
    }),
    [
      { kind: "text", text: "Hi " },
      { kind: "mention", text: "@grace" },
      { kind: "text", text: " and " },
      { kind: "self-mention", text: "@ada" },
    ],
  );
});

test("composer leaves non-mentions unstyled", () => {
  assert.deepEqual(
    composerHighlightParts(
      "hello@example.com @unknown `@ada` https://drocsid.app/@ada",
      targets,
      {
        id: "viewer",
        handle: "ada",
      },
    ),
    [
      { kind: "text", text: "hello@example.com " },
      { kind: "text", text: "@unknown" },
      { kind: "text", text: " `" },
      { kind: "text", text: "@ada" },
      { kind: "text", text: "` https://drocsid.app/" },
      { kind: "text", text: "@ada" },
    ],
  );
});
