import type { IncomingMessage } from "node:http";
import type { EventEmitter } from "node:events";
import type { Duplex } from "node:stream";
import * as Sentry from "@sentry/tanstackstart-react";
import { WebSocket, WebSocketServer } from "ws";
import {
  clientFrameSchema,
  roomKey,
  TYPING_TTL,
  type Room,
  type ServerFrame,
  type TypingPerson,
} from "../../lib/realtime-protocol";
import type { Presence } from "../../types/app";
import type { Identity, realtimeData } from "./data";
import type { BusEvent, LiveBus } from "./bus";

type Peer = {
  ws: WebSocket;
  identity: Identity;
  id: string;
  alive: boolean;
  rooms: Map<string, Room & { id: string }>;
  watchVersion: number;
  frames: number;
  frameWindow: number;
  sends: number;
  typingSent: Map<string, number>;
};
type Lease = Extract<BusEvent, { type: "lease" }>;
type Typing = Extract<BusEvent, { type: "typing" }>;

export function attachRealtime(
  server: EventEmitter,
  data: typeof realtimeData,
  bus: LiveBus,
  origin: string,
) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32_000,
    perMessageDeflate: false,
  });
  const peers = new Set<Peer>();
  const leases = new Map<string, Lease>();
  const presence = new Map<string, Presence>();
  const typing = new Map<string, Typing>();
  const jobs = new Map<
    string,
    {
      running: boolean;
      ids: Map<string, Extract<BusEvent, { type: "message" }>>;
    }
  >();
  let ready = false;
  let closed = false;
  let validating = false;
  let accessRevision = 0;

  function send(peer: Peer, frame: ServerFrame) {
    if (peer.ws.readyState !== WebSocket.OPEN) return;
    if (peer.ws.bufferedAmount > 1_000_000) {
      peer.ws.close(1013, "Reconnect to catch up");
      return;
    }
    peer.ws.send(JSON.stringify(frame));
  }
  function updatePresence(userId: string) {
    const live = [...leases.values()].filter(
      (l) => l.userId === userId && l.expiresAt > Date.now(),
    );
    const status = live.some((l) => l.status === "online")
      ? "online"
      : live.some((l) => l.status === "away")
        ? "away"
        : "offline";
    if (presence.get(userId) === status) return;
    presence.set(userId, status);
    for (const p of peers)
      send(p, {
        type: "presence",
        userId: userId === p.identity.userId ? "you" : userId,
        status,
      });
    if (!live.length) presence.delete(userId);
  }
  function sendTyping(peer: Peer) {
    const people = new Map<string, TypingPerson>();
    for (const value of typing.values()) {
      if (
        value.userId === peer.identity.userId ||
        value.expiresAt <= Date.now()
      )
        continue;
      for (const room of peer.rooms.values()) {
        if (
          room.id === value.conversationId &&
          room.threadOf === value.threadOf
        ) {
          const person = {
            conversation: room.conversation,
            threadOf: room.threadOf,
            userId: value.userId,
            name: value.name,
            expiresAt: value.expiresAt,
          };
          people.set(`${roomKey(room)}:${value.userId}`, person);
        }
      }
    }
    send(peer, { type: "typing", people: [...people.values()] });
  }
  function stopTyping(peer: Peer) {
    for (const value of [...typing.values()])
      if (value.connectionId === peer.id)
        bus.publish({ ...value, expiresAt: 0 });
    peer.typingSent.clear();
  }
  function lease(peer: Peer, expiresAt = Date.now() + 65_000) {
    bus.publish({
      type: "lease",
      connectionId: peer.id,
      userId: peer.identity.userId,
      status: peer.identity.status,
      expiresAt,
    });
  }
  function enqueue(
    conversationId: string,
    event: Extract<BusEvent, { type: "message" }>,
  ) {
    let job = jobs.get(conversationId);
    if (!job) {
      job = { running: false, ids: new Map() };
      jobs.set(conversationId, job);
    }
    job.ids.set(event.id, event);
    if (job.ids.size > 500) {
      for (const peer of peers)
        if ([...peer.rooms.values()].some((room) => room.id === conversationId))
          peer.ws.close(1013, "Reconnect to catch up");
      job.ids.clear();
    }
    if (job.running) return;
    job.running = true;
    const task = job;
    void (async () => {
      try {
        while (task.ids.size && !closed) {
          const [id, next] = task.ids.entries().next().value!;
          task.ids.delete(id);
          const revision = accessRevision;
          const users = [
            ...new Set([...peers].map((peer) => peer.identity.userId)),
          ];
          // PostgreSQL filters recipients and projects their personalized frames
          // together: one query per event, not one per connected account.
          const updates = await data.messages(users, next.conversationId, id);
          if (revision !== accessRevision) {
            task.ids.set(id, next);
            continue;
          }
          const byUser = new Map(
            updates.map((update) => [update.userId, update.frame]),
          );
          for (const peer of peers) {
            const frame = byUser.get(peer.identity.userId);
            if (frame) send(peer, frame);
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "realtime",
            operation: "message_projection",
          },
        });
        for (const peer of peers)
          if (
            [...peer.rooms.values()].some((room) => room.id === conversationId)
          )
            peer.ws.close(1012, "Reconnect to catch up");
      } finally {
        jobs.delete(conversationId);
      }
    })();
  }
  function receive(event: BusEvent) {
    if (closed) return;
    if (event.type === "message") {
      if (peers.size) enqueue(event.conversationId, event);
    } else if (event.type === "invalidate") {
      for (const peer of peers)
        if (peer.identity.userId === event.userId)
          send(peer, { type: "invalidate" });
    } else if (event.type === "read") {
      for (const peer of peers)
        if (peer.identity.userId === event.userId)
          send(peer, {
            type: "read",
            conversation: event.conversation,
            through: event.through,
          });
    } else if (event.type === "access") {
      accessRevision++;
      // Clear cached typing from every gateway, including remote connections.
      // Fresh watch/typing frames will restore only currently allowed rooms.
      let removedTyping = false;
      for (const [key, value] of typing) {
        const affected = event.userIds
          ? event.userIds.includes(value.userId)
          : event.conversationId
            ? value.conversationId === event.conversationId
            : event.communityId
              ? value.conversationId.startsWith(`${event.communityId}:`)
              : true;
        if (affected) {
          typing.delete(key);
          removedTyping = true;
        }
      }
      for (const peer of peers) {
        const affected = event.userIds
          ? event.userIds.includes(peer.identity.userId)
          : [...peer.rooms.values()].some((room) =>
              event.conversationId
                ? room.id === event.conversationId
                : event.communityId
                  ? room.id.startsWith(`${event.communityId}:`)
                  : true,
            );
        if (!affected) continue;
        // Revoke cached typing permissions immediately, including in-flight watches.
        // The client re-watches its desired rooms on the same authenticated socket.
        stopTyping(peer);
        peer.rooms.clear();
        peer.watchVersion++;
        sendTyping(peer);
        send(peer, { type: "access" });
      }
      if (removedTyping) for (const peer of peers) sendTyping(peer);
    } else if (event.type === "session") {
      for (const peer of peers)
        if (peer.identity.sessionId === event.id)
          peer.ws.close(4401, "Session ended");
    } else if (event.type === "identity") {
      for (const peer of peers)
        if (peer.identity.userId === event.userId) {
          stopTyping(peer);
          peer.ws.close(1012, "Status changed");
        }
    } else if (event.type === "lease") {
      if (event.expiresAt > Date.now()) leases.set(event.connectionId, event);
      else leases.delete(event.connectionId);
      updatePresence(event.userId);
    } else if (event.type === "typing") {
      const key = `${event.connectionId}:${event.conversationId}:${event.threadOf ?? ""}`;
      if (event.expiresAt > Date.now()) typing.set(key, event);
      else typing.delete(key);
      for (const peer of peers)
        if (
          [...peer.rooms.values()].some(
            (r) =>
              r.id === event.conversationId && r.threadOf === event.threadOf,
          )
        )
          sendTyping(peer);
    }
  }
  bus.start(receive, (available) => {
    ready = available;
    if (!available)
      for (const peer of peers) peer.ws.close(1012, "Reconnecting to database");
  });

  async function frame(peer: Peer, raw: string) {
    let requestId: string | undefined;
    try {
      if (Date.now() >= peer.identity.expiresAt) {
        peer.ws.close(4401, "Session expired");
        return;
      }
      if (Date.now() - peer.frameWindow > 10_000) {
        peer.frameWindow = Date.now();
        peer.frames = 0;
      }
      if (++peer.frames > 60) {
        peer.ws.close(1008, "Too many requests");
        return;
      }
      const input = clientFrameSchema.parse(JSON.parse(raw));
      if (input.type === "watch") {
        const version = ++peer.watchVersion;
        stopTyping(peer);
        peer.rooms.clear();
        const rooms = new Map<string, Room & { id: string }>();
        for (const room of input.rooms)
          rooms.set(roomKey(room), {
            ...room,
            id: await data.authorize(peer.identity.userId, room),
          });
        if (
          version !== peer.watchVersion ||
          peer.ws.readyState !== WebSocket.OPEN
        )
          return;
        peer.rooms = rooms;
        sendTyping(peer);
        send(peer, { type: "watched" });
      } else if (input.type === "typing") {
        const key = roomKey(input);
        const room = peer.rooms.get(key);
        if (!room || (input.active && peer.identity.status === "offline"))
          return;
        const now = Date.now();
        if (input.active && now - (peer.typingSent.get(key) ?? 0) < 1000)
          return;
        peer.typingSent.set(key, now);
        bus.publish({
          type: "typing",
          connectionId: peer.id,
          userId: peer.identity.userId,
          name: peer.identity.name,
          conversationId: room.id,
          threadOf: room.threadOf,
          expiresAt: input.active ? now + TYPING_TTL : 0,
        });
      } else {
        requestId = input.requestId;
        if (input.action.type !== "message.send")
          throw Object.assign(new Error("Expected a message."), {
            status: 400,
          });
        if (peer.sends >= 8)
          throw Object.assign(
            new Error("Too many messages at once. Please retry."),
            { status: 429 },
          );
        peer.sends++;
        stopTyping(peer);
        try {
          const result = await data.send(peer.identity.userId, input.action);
          send(peer, { type: "ack", requestId, message: result.message });
        } finally {
          peer.sends--;
        }
      }
    } catch (error) {
      const status = (error as { status?: number }).status ?? 400;
      if (status >= 500)
        Sentry.captureException(error, {
          tags: {
            area: "realtime",
            operation: "client_frame",
          },
        });
      send(peer, {
        type: "error",
        requestId,
        status,
        error:
          status < 500 && (error as { status?: number }).status
            ? (error as Error).message
            : "Could not complete this request. Please retry.",
      });
    }
  }
  const upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url?.split("?")[0] !== "/api/ws") return;
    const reject = (status: number) => {
      if (!socket.destroyed)
        socket.end(
          `HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
        );
    };
    if (request.headers.origin !== origin) {
      reject(403);
      return;
    }
    if (!ready || closed) {
      reject(503);
      return;
    }
    const onError = () => socket.destroy();
    socket.on("error", onError);
    const timeout = setTimeout(() => socket.destroy(), 10_000);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join("; ") : value);
    void data
      .authenticate(headers)
      .then((identity) => {
        if (!identity || identity.expiresAt <= Date.now()) {
          reject(401);
          return;
        }
        if (socket.destroyed || !ready || closed) {
          reject(503);
          return;
        }
        if (
          [...peers].filter((p) => p.identity.userId === identity.userId)
            .length >= 8
        ) {
          reject(429);
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          const peer: Peer = {
            ws,
            identity,
            id: crypto.randomUUID(),
            alive: true,
            rooms: new Map(),
            watchVersion: 0,
            frames: 0,
            frameWindow: Date.now(),
            sends: 0,
            typingSent: new Map(),
          };
          peers.add(peer);
          ws.on("error", () => {});
          ws.on("pong", () => {
            peer.alive = true;
          });
          ws.on("message", (raw, binary) => {
            if (binary) ws.close(1003, "JSON only");
            else void frame(peer, raw.toString());
          });
          ws.on("close", () => {
            peers.delete(peer);
            peer.watchVersion++;
            stopTyping(peer);
            lease(peer, 0);
          });
          send(peer, { type: "ready" });
          for (const [userId, status] of presence)
            send(peer, {
              type: "presence",
              userId: userId === identity.userId ? "you" : userId,
              status,
            });
          lease(peer);
        });
      })
      .catch(() => reject(503))
      .finally(() => {
        clearTimeout(timeout);
        socket.off("error", onError);
      });
  };
  server.on("upgrade", upgrade);
  const expiry = setInterval(() => {
    let changed = false;
    for (const [key, value] of typing)
      if (value.expiresAt <= Date.now()) {
        typing.delete(key);
        changed = true;
      }
    if (changed) for (const peer of peers) sendTyping(peer);
    for (const [key, value] of leases)
      if (value.expiresAt <= Date.now()) {
        leases.delete(key);
        updatePresence(value.userId);
      }
    for (const peer of peers)
      if (peer.identity.expiresAt <= Date.now())
        peer.ws.close(4401, "Session expired");
  }, 1000);
  const heartbeat = setInterval(() => {
    for (const peer of peers) {
      if (!peer.alive) {
        peer.ws.terminate();
        continue;
      }
      peer.alive = false;
      peer.ws.ping();
    }
    if (validating || !peers.size) return;
    validating = true;
    void data
      .sessions([...new Set([...peers].map((p) => p.identity.sessionId))])
      .then((sessions) => {
        for (const peer of peers) {
          const identity = sessions.find(
            (s) => s.sessionId === peer.identity.sessionId,
          );
          if (!identity) peer.ws.close(4401, "Session ended");
          else {
            peer.identity = identity;
            if (identity.status === "offline") stopTyping(peer);
            lease(peer);
          }
        }
      })
      .catch(() => {
        for (const peer of peers)
          peer.ws.close(1012, "Reconnect to validate session");
      })
      .finally(() => {
        validating = false;
      });
  }, 25_000);
  return async () => {
    if (closed) return;
    closed = true;
    ready = false;
    clearInterval(expiry);
    clearInterval(heartbeat);
    server.off("upgrade", upgrade);
    for (const peer of peers) {
      stopTyping(peer);
      lease(peer, 0);
      peer.ws.terminate();
    }
    wss.close();
    await bus.close();
  };
}
