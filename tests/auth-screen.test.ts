import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

// Renders the real AuthScreen in a DOM so the button visibility and the
// error-recovery message are checked as the user would see them.
async function renderAuthScreen(options: {
  mode: "sign-in" | "sign-up";
  providers: ("discord" | "github")[];
  url?: string;
}) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: options.url ?? "http://localhost:1515/sign-up",
    pretendToBeVisual: true,
  });
  const captured: { event: string; properties: unknown }[] = [];
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    location: dom.window.location,
    history: dom.window.history,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const { createRoot } = await import("react-dom/client");
  const { PostHogContext } = await import("@posthog/react");
  const {
    createRootRoute,
    createRouter,
    createMemoryHistory,
    RouterContextProvider,
  } = await import("@tanstack/react-router");
  const { AuthScreen } = await import("../src/components/auth-screen");

  const posthog = {
    capture: (event: string, properties: unknown) =>
      captured.push({ event, properties }),
  };
  // A real router gives Link its context; RouterContextProvider renders the
  // screen as plain children, so the DOM under test is the AuthScreen itself.
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();

  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => {
    root.render(
      createElement(
        RouterContextProvider,
        { router } as never,
        createElement(
          PostHogContext.Provider,
          { value: { client: posthog } as never },
          createElement(AuthScreen, {
            mode: options.mode,
            providers: options.providers,
          }),
        ),
      ),
    );
  });

  return {
    dom,
    captured,
    html: () => dom.window.document.getElementById("root")!.innerHTML,
    social: (provider: "discord" | "github") =>
      dom.window.document.querySelector(`[data-ui~="${provider}"]`),
    cleanup: () => {
      act(() => root.unmount());
      for (const [key, descriptor] of previous)
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete (globalThis as Record<string, unknown>)[key];
    },
  };
}

test("only configured providers render a button", async () => {
  const view = await renderAuthScreen({ mode: "sign-up", providers: ["discord"] });
  try {
    assert.ok(view.social("discord"), "Discord button should render");
    assert.equal(view.social("github"), null, "GitHub button should be hidden");
  } finally {
    view.cleanup();
  }
});

test("no providers hides the whole social block and its divider", async () => {
  const view = await renderAuthScreen({ mode: "sign-up", providers: [] });
  try {
    assert.equal(view.social("discord"), null);
    assert.equal(view.social("github"), null);
    assert.doesNotMatch(view.html(), /the good old email way/);
    // The email form still renders as the working fallback.
    assert.ok(view.dom.window.document.querySelector('input[type="email"]'));
  } finally {
    view.cleanup();
  }
});

test("an OAuth error redirect shows a message, records it, and clears the param", async () => {
  const view = await renderAuthScreen({
    mode: "sign-up",
    providers: ["discord"],
    url: "http://localhost:1515/sign-up?error=state_mismatch",
  });
  try {
    assert.match(view.html(), /did not go through/);
    assert.deepEqual(view.captured, [
      { event: "social_sign_in_failed", properties: { mode: "sign-up", error: "state_mismatch" } },
    ]);
    // The param is dropped so a refresh does not repeat the message.
    assert.equal(view.dom.window.location.search, "");
  } finally {
    view.cleanup();
  }
});
