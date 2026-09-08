import { test } from "node:test";
import assert from "node:assert/strict";
import type { AppState } from "../src/types/app";
import {
  appPageTitle,
  formatPageTitle,
  unreadMessageCount,
} from "../src/lib/page-title";

const state = {
  people: [
    {
      id: "friend",
      name: "Jamie Rivera",
      handle: "jamie",
    },
  ],
  communities: [
    {
      id: "makers",
      name: "The Makers",
      channels: [
        { id: "general", name: "general", unread: 2 },
        { id: "showcase", name: "showcase", unread: 3 },
      ],
    },
  ],
  dmConversations: [{ personId: "friend", unread: 4 }],
  messages: [],
} as unknown as AppState;

test("page titles use live community, channel and person data", () => {
  assert.equal(
    appPageTitle("/app/community/makers/general", {}, state),
    "(9) #general · The Makers — Drocsid",
  );
  assert.equal(
    appPageTitle("/app/community/makers/settings", {}, state),
    "(9) Community settings · The Makers — Drocsid",
  );
  assert.equal(
    appPageTitle("/app/dm/friend", {}, state),
    "(9) Jamie Rivera (@jamie) — Drocsid",
  );
});

test("page titles reflect search and settings state with bounded unread badges", () => {
  assert.equal(unreadMessageCount(state), 9);
  assert.equal(
    appPageTitle("/app/search", { q: "message history" }, state),
    "(9) Search · “message history” — Drocsid",
  );
  assert.equal(
    appPageTitle("/app/settings", { section: "privacy" }, state),
    "(9) Privacy settings — Drocsid",
  );
  assert.equal(formatPageTitle("Inbox", 120), "(99+) Inbox — Drocsid");
});
