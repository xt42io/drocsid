import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  act,
  createElement,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

test("OTP boxes support typing, editing, paste, autofill, keyboard navigation, clearing and disabled state", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:1515",
    pretendToBeVisual: true,
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
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
  const { OtpInput } = await import("../src/components/otp-input");
  let latest = "";
  let setCode: Dispatch<SetStateAction<string>>;
  function Harness({ disabled = false }: { disabled?: boolean }) {
    const [code, set] = useState("");
    const first = useRef<HTMLInputElement>(null);
    latest = code;
    setCode = set;
    return createElement(
      "form",
      null,
      createElement(OtpInput, {
        id: "code",
        value: code,
        onChange: set,
        firstInputRef: first,
        disabled,
      }),
    );
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  const inputs = () => [...dom.window.document.querySelectorAll("input")];
  const values = () => inputs().map((input) => input.value);
  async function key(index: number, value: string) {
    await act(async () => {
      inputs()[index].dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: value,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
  async function paste(index: number, value: string) {
    const event = new dom.window.Event("paste", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => value },
    });
    await act(async () => {
      inputs()[index].dispatchEvent(event);
    });
  }
  try {
    await act(async () => {
      root.render(createElement(Harness));
    });
    assert.equal(inputs().length, 6);
    assert.equal(inputs()[0].autocomplete, "one-time-code");
    for (let i = 0; i < 6; i++) {
      await key(i, String(i + 1));
      assert.equal(
        dom.window.document.activeElement,
        inputs()[Math.min(i + 1, 5)],
      );
    }
    assert.equal(latest, "123456");
    assert.equal(
      dom.window.document.querySelector("form")!.checkValidity(),
      true,
    );

    await key(2, "Backspace");
    assert.deepEqual(values(), ["1", "2", "", "4", "5", "6"]);
    assert.equal(latest, "12 456");
    assert.equal(
      dom.window.document.querySelector("form")!.checkValidity(),
      false,
    );
    await key(2, "Backspace");
    assert.equal(dom.window.document.activeElement, inputs()[1]);
    assert.deepEqual(values(), ["1", "", "", "4", "5", "6"]);
    await key(1, "8");
    await key(2, "9");
    assert.equal(latest, "189456");
    await key(3, "Delete");
    assert.deepEqual(values(), ["1", "8", "9", "", "5", "6"]);

    await paste(3, "Code: 654 321");
    assert.equal(latest, "654321");
    assert.equal(dom.window.document.activeElement, inputs()[5]);
    await paste(2, "a09b");
    assert.equal(latest, "650921");
    await paste(2, "letters only");
    assert.equal(latest, "650921");
    await key(3, "ArrowLeft");
    assert.equal(dom.window.document.activeElement, inputs()[2]);
    await key(2, "ArrowRight");
    assert.equal(dom.window.document.activeElement, inputs()[3]);
    await key(3, "Home");
    assert.equal(dom.window.document.activeElement, inputs()[0]);
    await key(0, "End");
    assert.equal(dom.window.document.activeElement, inputs()[5]);

    // Mobile autofill can insert all six digits into the first actual input.
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(inputs()[0], "907856");
      inputs()[0].dispatchEvent(
        new dom.window.Event("input", { bubbles: true }),
      );
    });
    assert.equal(latest, "907856");
    assert.deepEqual(values(), ["9", "0", "7", "8", "5", "6"]);
    await act(async () => {
      setCode("");
    });
    assert.deepEqual(values(), ["", "", "", "", "", ""]);
    await act(async () => {
      root.render(createElement(Harness, { disabled: true }));
    });
    assert.ok(inputs().every((input) => input.disabled));
  } finally {
    await act(async () => {
      root.unmount();
    });
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});
