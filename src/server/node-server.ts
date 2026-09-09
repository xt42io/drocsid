import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { getRequestListener } from "@hono/node-server";
import sirv from "sirv";

export type ShortInviteOptions = {
  origin: string;
  canonicalOrigin: string;
  resolve: (code: string) => Promise<boolean>;
};

function hostname(value: string) {
  try {
    return new URL(value.includes("://") ? value : `http://${value}`)
      .hostname.toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return "";
  }
}

function sendPlain(
  res: ServerResponse,
  status: number,
  body: string,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

async function handleShortInvite(
  req: IncomingMessage,
  res: ServerResponse,
  options: ShortInviteOptions,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    sendPlain(res, 405, "Method not allowed");
    return;
  }
  const pathname = new URL(req.url || "/", options.origin).pathname;
  const match = pathname.match(
    /^\/([A-Za-z0-9]{7}|[A-Za-z0-9_-]{10,24})$/,
  );
  if (!match || !(await options.resolve(match[1]))) {
    sendPlain(res, 404, "Invite not found");
    return;
  }
  const destination = new URL(
    `/invite/${encodeURIComponent(match[1])}`,
    options.canonicalOrigin,
  );
  res.statusCode = 302;
  res.setHeader("Location", destination.toString());
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

export function createAppServer(
  fetch: (request: Request) => Promise<Response>,
  assetDirectory = "dist/client",
  shortInvites?: ShortInviteOptions,
) {
  const handler = getRequestListener(fetch, { overrideGlobalObjects: false });
  const assets = sirv(assetDirectory, {
    etag: true,
    gzip: true,
    brotli: true,
    dotfiles: false,
  });
  return createServer((req, res) => {
    if (
      shortInvites &&
      hostname(req.headers.host || "") === hostname(shortInvites.origin)
    ) {
      void handleShortInvite(req, res, shortInvites).catch(() =>
        sendPlain(res, 500, "Could not open this invite"),
      );
      return;
    }
    if (req.method === "GET" || req.method === "HEAD")
      assets(req, res, () => {
        void handler(req, res);
      });
    else void handler(req, res);
  });
}
