import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement, memo, useRef } from "react";
import type { AppState } from "../src/types/app";
import { defaults } from "../src/lib/contracts";

test("React keeps drafts local, windows long histories, and preserves failed sends across metadata refreshes", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', {
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
  ])
    install(key, (dom.window as unknown as Record<string, unknown>)[key]);
  install(
    "requestAnimationFrame",
    dom.window.requestAnimationFrame.bind(dom.window),
  );
  install(
    "cancelAnimationFrame",
    dom.window.cancelAnimationFrame.bind(dom.window),
  );
  install("IS_REACT_ACT_ENVIRONMENT", true);
  class ResizeObserverMock {
    private targets = new Set<Element>();
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.targets.add(target);
      queueMicrotask(() => {
        if (this.targets.has(target))
          this.callback(
            [
              {
                target,
                contentRect: target.getBoundingClientRect(),
                borderBoxSize: [
                  {
                    blockSize: target.getBoundingClientRect().height,
                    inlineSize: 800,
                  },
                ],
              } as unknown as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      });
    }
    unobserve(target: Element) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
    }
  }
  install("ResizeObserver", ResizeObserverMock);
  Object.assign(dom.window, { ResizeObserver: ResizeObserverMock });
  class Socket {
    static OPEN = 1;
    readyState = 0;
    close() {
      this.readyState = 3;
    }
    send() {}
  }
  install("WebSocket", Socket);
  const prototype = dom.window.HTMLElement.prototype;
  Object.defineProperty(prototype, "clientHeight", {
    get() {
      return this.id === "scroll"
        ? 500
        : this.hasAttribute("data-index")
          ? 80
          : 0;
    },
  });
  Object.defineProperty(prototype, "offsetHeight", {
    get() {
      return this.id === "scroll"
        ? 500
        : this.hasAttribute("data-index")
          ? 80
          : 0;
    },
  });
  Object.defineProperty(prototype, "offsetWidth", {
    get() {
      return 800;
    },
  });
  Object.defineProperty(prototype, "scrollHeight", {
    get() {
      return this.id === "scroll"
        ? Number.parseFloat(
            this.querySelector<HTMLElement>(
              '[data-ui="virtual-messages"]',
            )?.style.getPropertyValue("--list-height") ?? "0",
          )
        : 0;
    },
  });
  prototype.getBoundingClientRect = function () {
    const scroll = dom.window.document.getElementById("scroll");
    const top = this.hasAttribute("data-index")
      ? parseFloat(this.style.getPropertyValue("--row-offset")) -
        (scroll?.scrollTop ?? 0)
      : this.dataset.ui === "virtual-messages"
        ? -(scroll?.scrollTop ?? 0)
        : 0;
    const height =
      this.id === "scroll"
        ? 500
        : this.hasAttribute("data-index")
          ? 80
          : this.dataset.ui === "virtual-messages"
            ? parseFloat(this.style.getPropertyValue("--list-height"))
            : 0;
    return {
      top,
      left: 0,
      right: 800,
      bottom: top + height,
      width: 800,
      height,
      x: 0,
      y: top,
      toJSON() {},
    };
  };
  prototype.scrollTo = function (
    options: ScrollToOptions | number,
    y?: number,
  ) {
    this.scrollTop =
      typeof options === "number" ? (y ?? 0) : (options.top ?? this.scrollTop);
    this.dispatchEvent(new dom.window.Event("scroll"));
  };
  const messages = Array.from({ length: 2000 }, (_, index) => ({
    id: `message-${index}`,
    conversation: "room:general",
    author: "you",
    text: `Message ${index}`,
    createdAt: new Date(index * 1000).toISOString(),
    time: "",
    reactions: [],
  }));
  const initial: AppState = {
    version: 1,
    profile: {
      id: "you",
      name: "Tester",
      handle: "tester",
      color: "purple",
      status: "offline",
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
    messages,
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
  let failSend = true;
  let actionReply: (() => Promise<Response>) | undefined;
  const paths: string[] = [];
  install("fetch", async (input: string, init?: RequestInit) => {
    paths.push(input);
    if (input === "/api/app" && init?.body && actionReply) return actionReply();
    if (input === "/api/messages") {
      const action = JSON.parse(init?.body as string);
      if (failSend)
        return new Response(JSON.stringify({ error: "Temporary failure" }), {
          status: 503,
        });
      return Response.json({
        message: {
          ...messages[0],
          id: action.id,
          text: action.text,
          createdAt: new Date().toISOString(),
        },
      });
    }
    return Response.json(
      input.includes("history=none") ? { ...initial, messages: [] } : initial,
    );
  });
  const { createRoot } = await import("react-dom/client");
  const { AppProvider, useApp, useDraft } =
    await import("../src/lib/app-state");
  const { VirtualMessages } =
    await import("../src/components/app/virtual-messages");
  let app!: ReturnType<typeof useApp>;
  let writeDraft!: (value: string) => void;
  let rowRenders = 0;
  const RowProbe = memo(function RowProbe() {
    useApp((value) => value.state.messages[0]);
    rowRenders++;
    return null;
  });
  const noThread = () => {};
  function Harness() {
    app = useApp();
    const [draft, setDraft] = useDraft("room:general");
    writeDraft = setDraft;
    const scroll = useRef<HTMLDivElement>(null);
    return createElement(
      "div",
      null,
      createElement(RowProbe),
      createElement("output", { id: "draft" }, draft),
      createElement(
        "div",
        { id: "scroll", ref: scroll },
        createElement(VirtualMessages, {
          messages: app.state.messages,
          scrollRef: scroll,
          onThread: noThread,
        }),
      ),
    );
  }
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
    root.render(createElement(AppProvider, null, createElement(Harness)));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  const list = dom.window.document.querySelector(
    '[data-ui="virtual-messages"]',
  )!;
  assert.ok(list, "The cold-mounted provider supplies app context");
  assert.ok(
    list.children.length < 40,
    `Only visible rows and overscan mount, got ${list.children.length}`,
  );
  assert.ok(
    list.querySelector('[data-index="1999"]'),
    `The initial window reaches the newest message; rows=${list.children.length}, first=${list.firstElementChild?.getAttribute("data-index")}, last=${list.lastElementChild?.getAttribute("data-index")}, offset=${dom.window.document.getElementById("scroll")?.scrollTop}`,
  );
  const before = rowRenders;
  await act(async () => writeDraft("Another message while the app is busy"));
  assert.equal(
    dom.window.document.getElementById("draft")?.textContent,
    "Another message while the app is busy",
  );
  assert.equal(rowRenders, before, "Typing does not render message consumers");
  const requestCount = paths.length;
  await act(async () => {
    await Promise.all([app.refresh(), app.refresh(), app.refresh()]);
  });
  assert.equal(
    paths.length - requestCount,
    1,
    "Concurrent refresh callers share one request",
  );
  assert.equal(
    app.state.messages.length,
    2000,
    "Metadata refresh preserves already-loaded pages",
  );
  await act(async () => {
    assert.equal(await app.sendMessage("room:general", "retry this"), false);
  });
  const failed = app.state.messages.find((message) => message.sendError)!;
  assert.ok(failed);
  await act(async () => {
    await app.refresh();
  });
  failSend = false;
  await act(async () => {
    assert.equal(await app.retryMessage(failed.id), true);
  });
  assert.equal(
    app.state.messages.find((message) => message.id === failed.id)?.sendError,
    undefined,
  );
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const created = {
    ...initial.communities[0],
    id: "confirmed-community",
    name: "Confirmed",
  };
  // The write succeeds, but the snapshot read still lags and does not report
  // the new community yet.
  actionReply = async () => {
    await gate;
    return Response.json({ ok: true });
  };
  let saving!: Promise<boolean>;
  await act(async () => {
    saving = app.setState((previous) => ({
      ...previous,
      communities: [...previous.communities, created],
    }));
  });
  assert.ok(
    app.state.communities.some((community) => community.id === created.id),
    "Creation shows immediately while its request is pending",
  );
  await act(async () => {
    release();
    assert.equal(await saving, true);
  });
  assert.ok(
    app.state.communities.some((community) => community.id === created.id),
    "A successful creation survives a snapshot that still lags the write",
  );
  await act(async () => {
    await app.refresh();
  });
  assert.ok(
    app.state.communities.some((community) => community.id === created.id),
    "Repeated lagging refreshes never drop the created community",
  );
  await act(async () => {
    initial.communities.push(created);
    await app.refresh();
  });
  assert.ok(
    app.state.communities.some((community) => community.id === created.id),
    "The community stays once the snapshot finally reports it",
  );
  await act(async () => {
    initial.communities = initial.communities.filter(
      (community) => community.id !== created.id,
    );
    await app.refresh();
  });
  assert.ok(
    !app.state.communities.some((community) => community.id === created.id),
    "Once acknowledged, the server owns the community and can drop it",
  );
  actionReply = async () =>
    new Response(JSON.stringify({ error: "Creation failed" }), { status: 503 });
  await act(async () => {
    assert.equal(
      await app.setState((previous) => ({
        ...previous,
        communities: [
          ...previous.communities,
          { ...created, id: "failed-community" },
        ],
      })),
      false,
    );
  });
  await act(async () => {
    await app.refresh();
  });
  assert.ok(
    !app.state.communities.some(
      (community) => community.id === "failed-community",
    ),
    "A failed creation does not persist in the sidebar",
  );
});
