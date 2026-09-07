import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import sirv from "sirv";

export function createAppServer(
  fetch: (request: Request) => Promise<Response>,
  assetDirectory = "dist/client",
) {
  const handler = getRequestListener(fetch, { overrideGlobalObjects: false });
  const assets = sirv(assetDirectory, {
    etag: true,
    gzip: true,
    brotli: true,
    dotfiles: false,
  });
  return createServer((req, res) => {
    if (req.method === "GET" || req.method === "HEAD")
      assets(req, res, () => {
        void handler(req, res);
      });
    else void handler(req, res);
  });
}
