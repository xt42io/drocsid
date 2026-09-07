import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../src/server/node-server";

test("production Node runner serves assets and forwards authenticated Fetch requests", async () => {
  const directory = await mkdtemp(join(tmpdir(), "drocsid-assets-"));
  await writeFile(join(directory, "app.css"), "body{color:black}");
  const server = createAppServer(async (request) => {
    if (new URL(request.url).pathname === "/api/check")
      return Response.json({
        method: request.method,
        cookie: request.headers.get("cookie"),
        body: await request.text(),
      });
    return new Response("not found", { status: 404 });
  }, directory);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const css = await fetch(`${base}/app.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type")!, /text\/css/);
    assert.equal(await css.text(), "body{color:black}");
    const response = await fetch(`${base}/api/check`, {
      method: "POST",
      headers: { cookie: "session=test" },
      body: "payload",
    });
    assert.deepEqual(await response.json(), {
      method: "POST",
      cookie: "session=test",
      body: "payload",
    });
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.equal((await fetch(`${base}/missing`)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true });
  }
});
