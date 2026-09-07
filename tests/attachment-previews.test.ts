import assert from "node:assert/strict";
import { test } from "node:test";
import { AttachmentPreviews } from "../src/lib/attachment-previews";

test("a sent image survives acknowledgements and channel navigation until the stored image loads", () => {
  const revoked: string[] = [];
  const previews = new AttachmentPreviews((url) => revoked.push(url));
  previews.add("attachment", "blob:local-image");
  const release = previews.retain("attachment");
  // Server acknowledgements replace the message object, but keep its attachment ID.
  previews.prune(new Set(["attachment"]));
  assert.equal(previews.get("attachment"), "blob:local-image");
  release();
  assert.deepEqual(revoked, []);
  const releaseAfterNavigation = previews.retain("attachment");
  assert.equal(previews.get("attachment"), "blob:local-image");
  previews.loaded("attachment");
  assert.equal(previews.get("attachment"), undefined);
  assert.deepEqual(revoked, []);
  releaseAfterNavigation();
  assert.deepEqual(revoked, ["blob:local-image"]);
});

test("chat and image viewer can load independently without revoking each other's preview", () => {
  const revoked: string[] = [];
  const previews = new AttachmentPreviews((url) => revoked.push(url));
  previews.add("attachment", "blob:local-image");
  const chat = previews.retain("attachment"),
    viewer = previews.retain("attachment");
  previews.loaded("attachment");
  chat();
  chat();
  assert.deepEqual(revoked, []);
  viewer();
  assert.deepEqual(revoked, ["blob:local-image"]);
  previews.clear();
  assert.equal(revoked.length, 1);
});

test("failed image loads retain previews; removed messages and leaving the app release them", () => {
  const revoked: string[] = [];
  const previews = new AttachmentPreviews((url) => revoked.push(url));
  previews.add("failed", "blob:failed");
  previews.add("removed", "blob:removed");
  const release = previews.retain("failed");
  previews.prune(new Set(["failed"]));
  assert.deepEqual(revoked, ["blob:removed"]);
  assert.equal(previews.get("failed"), "blob:failed");
  previews.clear();
  release();
  assert.deepEqual(revoked, ["blob:removed", "blob:failed"]);
});
