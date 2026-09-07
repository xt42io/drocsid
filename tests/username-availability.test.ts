import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  act,
  createElement,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useUsernameAvailability } from "../src/lib/use-username-availability";

test("username checks debounce, ignore aborted results, validate locally and support retry", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:1515",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const requests: {
    url: string;
    signal: AbortSignal;
    resolve: (value: Response) => void;
    reject: (error: Error) => void;
  }[] = [];
  const mocked = mock.method(
    globalThis,
    "fetch",
    (url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        requests.push({ url, signal: init.signal!, resolve, reject });
      }),
  );
  const { createRoot } = await import("react-dom/client");
  let setUsername: Dispatch<SetStateAction<string>>;
  let current: ReturnType<typeof useUsernameAvailability>;
  function Harness() {
    const [username, set] = useState("");
    setUsername = set;
    current = useUsernameAvailability(username);
    return createElement("span", null, current.message);
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  const wait = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 390));
    });
  const change = (value: string) =>
    act(async () => {
      setUsername(value);
    });
  try {
    await act(async () => {
      root.render(createElement(Harness));
    });
    assert.equal(current!.status, "idle");
    await change("ali");
    await change("alice");
    assert.equal(requests.length, 0);
    await wait();
    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.endsWith("username=alice"));
    await change("alicia");
    assert.equal(requests[0].signal.aborted, true);
    await wait();
    assert.equal(requests.length, 2);
    await act(async () => {
      requests[0].resolve(
        Response.json({ username: "alice", available: true }),
      );
    });
    assert.equal(current!.status, "checking");
    await act(async () => {
      requests[1].resolve(
        Response.json({ username: "alicia", available: false }),
      );
    });
    assert.equal(current!.status, "taken");
    await change("admin");
    await wait();
    assert.equal(current!.status, "invalid");
    assert.equal(requests.length, 2);
    await change("fresh_name");
    await wait();
    await act(async () => {
      requests[2].reject(new Error("Network unavailable"));
    });
    assert.equal(current!.status, "error");
    await act(async () => {
      current!.retry();
    });
    assert.equal(current!.status, "checking");
    await wait();
    await act(async () => {
      requests[3].resolve(
        Response.json({ username: "fresh_name", available: true }),
      );
    });
    assert.equal(current!.status, "available");
    await change("");
    assert.equal(current!.status, "idle");
  } finally {
    await act(async () => {
      root.unmount();
    });
    mocked.mock.restore();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});
