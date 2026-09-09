import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as httpRequest } from "node:http";
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
    if (new URL(request.url).pathname === "/page")
      return new Response("<h1>Drocsid</h1>", {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
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
    const page = await fetch(`${base}/page`);
    assert.equal(page.headers.get("cache-control"), "no-cache");
    assert.equal(await page.text(), "<h1>Drocsid</h1>");
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.equal((await fetch(`${base}/missing`)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true });
  }
});

test("short invite host exposes only valid invite redirects", async () => {
  const directory = await mkdtemp(join(tmpdir(), "drocsid-short-invites-"));
  await writeFile(join(directory, "app.css"), "private app asset");
  const seen: string[] = [];
  const server = createAppServer(
    async () => new Response("full application"),
    directory,
    {
      origin: "https://drocsid.cc",
      canonicalOrigin: "https://drocsid.app",
      resolve: async (code) => {
        seen.push(code);
        return code === "Good123" || code === "6F_70I_yzEwM";
      },
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const request = (
    path: string,
    method = "GET",
    host = "drocsid.cc",
  ) =>
    new Promise<{
      status: number;
      headers: typeof import("node:http").IncomingHttpHeaders;
      body: string;
    }>((resolve, reject) => {
      const call = httpRequest({
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: { host },
      });
      call.on("error", reject);
      call.on("response", (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      });
      call.end();
    });
  try {
    const invite = await request("/Good123");
    assert.equal(invite.status, 302);
    assert.equal(
      invite.headers.location,
      "https://drocsid.app/invite/Good123",
    );
    assert.equal((await request("/Miss123")).status, 404);
    const legacyInvite = await request("/6F_70I_yzEwM");
    assert.equal(legacyInvite.status, 302);
    assert.equal(
      legacyInvite.headers.location,
      "https://drocsid.app/invite/6F_70I_yzEwM",
    );
    assert.equal((await request("/Bad_123")).status, 404);
    assert.equal((await request("/Bad-123")).status, 404);
    assert.equal((await request("/app")).status, 404);
    assert.equal((await request("/api/session")).status, 404);
    assert.equal((await request("/app.css")).status, 404);
    assert.equal((await request("/app", "GET", "drocsid.cc:443")).status, 404);
    assert.equal((await request("/app", "GET", "drocsid.cc.")).status, 404);
    assert.equal((await request("/Good123", "POST")).status, 405);
    assert.deepEqual(seen, ["Good123", "Miss123", "6F_70I_yzEwM"]);

    const application = await request("/app.css", "GET", "drocsid.app");
    assert.equal(application.status, 200);
    assert.equal(application.body, "private app asset");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true });
  }
});
