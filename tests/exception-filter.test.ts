import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isInjectedException,
  isOwnAppFrame,
} from "../src/lib/exception-filter";

const APP_ORIGIN = "https://drocsid.app";

test("a served-document frame from an injected script is not our asset", () => {
  assert.equal(isOwnAppFrame("https://drocsid.app/", APP_ORIGIN), false);
  assert.equal(isOwnAppFrame("https://drocsid.app/sign-up", APP_ORIGIN), false);
});

test("a JavaScript file served from our origin is our asset", () => {
  assert.equal(
    isOwnAppFrame("https://drocsid.app/_build/assets/client-abc123.js", APP_ORIGIN),
    true,
  );
  assert.equal(isOwnAppFrame("/_build/assets/entry.mjs", APP_ORIGIN), true);
});

test("a JavaScript file from another origin is not our asset", () => {
  assert.equal(
    isOwnAppFrame("https://cdn.example.com/inject.js", APP_ORIGIN),
    false,
  );
});

test("without a known origin, any real script file counts as our asset", () => {
  assert.equal(isOwnAppFrame("https://drocsid.app/_build/x.js", null), true);
  assert.equal(isOwnAppFrame("https://drocsid.app/", null), false);
});

test("drops the injected in-app-browser exception from the report", () => {
  // ReferenceError: Can't find variable: CONFIG — both frames anchored to the document.
  const dropped = isInjectedException(
    true,
    ["https://drocsid.app/", "https://drocsid.app/"],
    APP_ORIGIN,
  );
  assert.equal(dropped, true);
});

test("keeps an unhandled exception that has a frame in our own bundle", () => {
  const dropped = isInjectedException(
    true,
    ["https://drocsid.app/", "https://drocsid.app/_build/assets/app.js"],
    APP_ORIGIN,
  );
  assert.equal(dropped, false);
});

test("keeps handled exceptions and exceptions with no frames", () => {
  assert.equal(
    isInjectedException(false, ["https://drocsid.app/"], APP_ORIGIN),
    false,
  );
  assert.equal(isInjectedException(true, [], APP_ORIGIN), false);
});
