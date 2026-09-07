import { test } from "node:test";
import assert from "node:assert/strict";

// Exercise the installed request wrapper, including H3's error conversion/logging.
const { requestHandler } = await import(
  new URL(
    "./request-response.js",
    import.meta.resolve("@tanstack/start-server-core"),
  ).href
);

test("disconnected requests finish quietly; unrelated failures still report 500", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const reset = Object.assign(new Error("aborted"), { code: "ECONNRESET" });
  const controller = new AbortController();
  const request = new Request("http://localhost:1515/api/events", {
    signal: controller.signal,
  });
  controller.abort(reset);
  const cancelled = await requestHandler(async (req: Request) => {
    req.signal.throwIfAborted();
  })(request);
  assert.equal(cancelled.status, 499);
  assert.equal(errors.mock.callCount(), 0);

  const pending = new AbortController();
  const result = requestHandler(
    (req: Request) =>
      new Promise((_resolve, reject) => {
        req.signal.addEventListener(
          "abort",
          () =>
            reject(
              new Error("Request cancelled", { cause: req.signal.reason }),
            ),
          { once: true },
        );
      }),
  )(new Request("http://localhost:1515/app", { signal: pending.signal }));
  pending.abort();
  assert.equal((await result).status, 499);
  assert.equal(errors.mock.callCount(), 0);

  const failure = new Error("Actual server failure");
  const failed = await requestHandler(async () => {
    throw failure;
  })(request);
  assert.equal(failed.status, 500);
  assert.equal(errors.mock.callCount(), 1);

  // An upstream connection reset is not a client disconnect.
  const upstream = await requestHandler(async () => {
    throw reset;
  })(new Request("http://localhost:1515/api/app"));
  assert.equal(upstream.status, 500);
  assert.equal(errors.mock.callCount(), 2);

  const success = await requestHandler(async () => new Response("ok"))(
    new Request("http://localhost:1515/"),
  );
  assert.equal(await success.text(), "ok");
});
