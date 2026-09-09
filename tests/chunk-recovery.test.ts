import test from "node:test";
import assert from "node:assert/strict";
import { isChunkLoadError } from "../src/lib/chunk-recovery";

test("deployment chunk failures are distinguished from application errors", () => {
  for (const message of [
    "Failed to fetch dynamically imported module: /assets/app-old.js",
    "Importing a module script failed.",
    "ChunkLoadError: Loading chunk 42 failed",
    "Unable to preload CSS for /assets/old.css",
  ]) assert.equal(isChunkLoadError(new Error(message)), true, message);

  assert.equal(isChunkLoadError(new Error("Cannot read properties of null")), false);
});
