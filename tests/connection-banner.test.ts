import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import type { AppState } from "../src/types/app";
import { defaults } from "../src/lib/contracts";

const bannerSelector = '[data-ui="a-connection-status"]';

const appState: AppState = {
  version: 1,
  profile: {
    id: "you",
    name: "You",
    handle: "you",
    color: "purple",
    status: "online",
    bio: "",
    activity: "",
    role: "Member",
  },
  people: [],
  communities: [],
  messages: [],
  friends: [],
  dmConversations: [],
  pending: [],
  outgoing: [],
  blocked: [],
  activities: [],
  preferences: defaults,
  muted: [],
  onboardingComplete: true,
  drafts: {},
};

// Mount AppProvider against a JSDOM window and a fake socket. When `handshake`
// is true the socket reaches "ready" like a healthy connection; otherwise it
// opens but never connects, leaving the client offline.
async function mountApp(t: any, handshake: boolean) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:1515/app",
    pretendToBeVisual: true,
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const install = (key: string, value: unknown) => {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  };
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "navigator",
    "location",
    "localStorage",
  ])
    install(key, (dom.window as unknown as Record<string, unknown>)[key]);
  install("IS_REACT_ACT_ENVIRONMENT", true);

  class Socket {
    static OPEN = 1;
    readyState = 1;
    onmessage?: (event: any) => void;
    onclose?: (event: any) => void;
    onerror?: (event: any) => void;
    constructor(public url: URL) {
      if (handshake)
        queueMicrotask(() =>
          this.onmessage?.({ data: JSON.stringify({ type: "ready" }) }),
        );
    }
    send() {}
    close() {
      this.readyState = 3;
      this.onclose?.({ code: 1000 });
    }
  }
  install("WebSocket", Socket);
  install("fetch", async () => Response.json(appState));

  const { createRoot } = await import("react-dom/client");
  const { AppProvider } = await import("../src/lib/app-state");
  const root = createRoot(dom.window.document.getElementById("root")!);
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  await act(async () => {
    root.render(createElement(AppProvider, null, null));
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  return {
    banner: () => dom.window.document.querySelector(bannerSelector),
    wait: (ms: number) =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ms));
      }),
  };
}

// The banner used to render from the moment the app was ready until the socket
// handshake finished, so every healthy load flashed a false connection warning.
test("the connection banner stays hidden on a healthy load", async (t) => {
  const app = await mountApp(t, true);
  assert.equal(
    app.banner(),
    null,
    "A healthy load must not show the reconnecting banner",
  );
});

test("the connection banner appears with a retry once trouble outlasts the grace period", async (t) => {
  const app = await mountApp(t, false);
  // Still inside the grace window: no banner yet.
  assert.equal(app.banner(), null, "The banner must wait out the grace period");

  await app.wait(5200);
  const banner = app.banner();
  assert.ok(banner, "Persistent trouble must surface the banner");
  assert.ok(
    banner!.querySelector("button"),
    "The banner must offer a retry action",
  );
});
