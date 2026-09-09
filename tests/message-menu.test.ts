import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import type { AppState, Message } from "../src/types/app";
import { defaults } from "../src/lib/contracts";

test("message options menu triggers open state, displays action buttons, and closes upon selection", async () => {
  const dom = new JSDOM('<div id="root"><div data-ui="workspace"></div></div>', {
    url: "http://localhost:1515/app",
    pretendToBeVisual: true,
  });

  const previous = new Map<string, PropertyDescriptor | undefined>();
  function install(key: string, value: unknown) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }

  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "navigator",
    "location",
    "getComputedStyle",
    "DOMRect",
    "visualViewport",
  ]) {
    install(key, (dom.window as unknown as Record<string, unknown>)[key]);
  }
  install(
    "requestAnimationFrame",
    dom.window.requestAnimationFrame.bind(dom.window),
  );
  install(
    "cancelAnimationFrame",
    dom.window.cancelAnimationFrame.bind(dom.window),
  );
  install("IS_REACT_ACT_ENVIRONMENT", true);

  const testMessage: Message = {
    id: "msg-123",
    conversation: "room:general",
    author: "you",
    text: "Doing good",
    time: "17:04",
    reactions: [],
  };

  const initial: AppState = {
    version: 1,
    profile: {
      id: "you",
      name: "Derrick",
      handle: "derrick",
      avatar: "",
      color: "purple",
      status: "online",
      bio: "",
      activity: "",
      role: "Member",
    },
    people: [],
    communities: [
      {
        id: "room",
        name: "Room",
        description: "",
        category: "Tests",
        icon: "sun",
        color: "purple",
        joined: true,
        members: 1,
        memberIds: ["you"],
        channels: [
          { id: "general", name: "general", description: "", group: "CHAT" },
        ],
      },
    ],
    messages: [testMessage],
    dmConversations: [],
    friends: [],
    pending: [],
    outgoing: [],
    blocked: [],
    activities: [],
    preferences: defaults,
    muted: [],
    onboardingComplete: true,
    drafts: {},
  };

  install(
    "fetch",
    async () => new Response(JSON.stringify(initial), { status: 200 }),
  );

  const { createRoot } = await import("react-dom/client");
  const { AppProvider } = await import("../src/lib/app-state");
  const { MessageCard } = await import("../src/components/app/conversation");

  const workspaceRoot = dom.window.document.querySelector<HTMLElement>(
    "[data-ui~=workspace]",
  )!;
  const root = createRoot(workspaceRoot);

  await act(async () => {
    root.render(
      createElement(
        AppProvider,
        null,
        createElement(MessageCard, {
          message: testMessage,
          onThread: () => {},
        }),
      ),
    );
  });

  // Verify the trigger button exists
  const trigger = workspaceRoot.querySelector<HTMLButtonElement>(
    "[data-ui~=a-message-menu-trigger]",
  );
  assert.ok(trigger, "Message menu trigger button rendered");
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(trigger.getAttribute("aria-label"), "More message options");

  // Menu should not be open yet
  assert.equal(
    dom.window.document.querySelector("[data-ui~=a-dropdown]"),
    null,
    "Dropdown not open initially",
  );

  // Click trigger to open menu
  await act(async () => {
    trigger.click();
  });

  assert.equal(
    trigger.getAttribute("aria-expanded"),
    "true",
    "Trigger reflects open state",
  );

  // Verify dropdown content is rendered
  const dropdown = dom.window.document.querySelector<HTMLElement>(
    "[data-ui~=a-dropdown]",
  );
  assert.ok(dropdown, "Dropdown rendered upon opening menu");

  const buttons = Array.from(dropdown.querySelectorAll("button")).map((b) =>
    b.textContent?.trim(),
  );
  assert.ok(
    buttons.some((text) => text?.includes("Copy text")),
    "Contains Copy text action",
  );
  assert.ok(
    buttons.some((text) => text?.includes("Edit message")),
    "Contains Edit message action for own message",
  );
  assert.ok(
    buttons.some((text) => text?.includes("Delete message")),
    "Contains Delete message action for own message",
  );

  // Click Copy text button to execute and close menu
  const copyButton = Array.from(dropdown.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy text"),
  );
  assert.ok(copyButton);

  await act(async () => {
    copyButton.click();
  });

  assert.equal(
    trigger.getAttribute("aria-expanded"),
    "false",
    "Trigger reflects closed state after action",
  );

  await act(async () => {
    root.unmount();
  });

  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});
