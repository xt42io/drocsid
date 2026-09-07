import type { Action } from "./contracts";
import { ApiError } from "./api-client";
import {
  roomKey,
  TYPING_INTERVAL,
  type Room,
  type ServerFrame,
} from "./realtime-protocol";
import type { Message } from "../types/app";

export class RealtimeClient {
  private socket?: WebSocket;
  private stopped = false;
  private connected = false;
  private attempts = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;
  private rooms = new Map<string, { room: Room; count: number }>();
  private typing = new Map<
    string,
    { room: Room; sent: number; activeUntil: number }
  >();
  private pending = new Map<
    string,
    {
      resolve: (value: { message: Message | null }) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(
    private onFrame: (frame: ServerFrame) => void,
    private onConnection: (connected: boolean) => void,
  ) {}
  start() {
    this.connect();
  }
  get isConnected() {
    return this.connected;
  }
  private write(frame: unknown) {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN)
      return false;
    this.socket.send(JSON.stringify(frame));
    return true;
  }
  private connect() {
    if (this.stopped) return;
    const url = new URL("/api/ws", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.socket = socket;
    this.timeout = setTimeout(() => socket.close(), 12000);
    socket.onmessage = (event) => {
      if (this.socket !== socket || this.stopped) return;
      let frame: ServerFrame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        socket.close();
        return;
      }
      if (frame.type === "ready") {
        clearTimeout(this.timeout);
        this.connected = true;
        this.attempts = 0;
        this.onConnection(true);
        this.watch();
      } else if (frame.type === "access") {
        this.watch();
        this.onFrame(frame);
      } else if (frame.type === "watched") {
        for (const value of this.typing.values())
          if (value.activeUntil > Date.now())
            this.write({ type: "typing", ...value.room, active: true });
      } else if (
        frame.type === "ack" ||
        (frame.type === "error" && frame.requestId)
      ) {
        const request = this.pending.get(frame.requestId!);
        if (request) {
          clearTimeout(request.timer);
          this.pending.delete(frame.requestId!);
          if (frame.type === "ack") request.resolve({ message: frame.message });
          else request.reject(new ApiError(frame.status, frame.error));
        }
      }
      this.onFrame(frame);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      clearTimeout(this.timeout);
      this.connected = false;
      this.onConnection(false);
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new ApiError(0, "Connection interrupted."));
      }
      this.pending.clear();
      if (this.stopped) return;
      if (event.code === 4401) {
        window.location.assign(
          `/sign-in?next=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }
      const delay =
        Math.min(10000, 500 * 2 ** this.attempts++) + Math.random() * 300;
      this.retry = setTimeout(() => this.connect(), delay);
    };
    socket.onerror = () => {
      /* onclose owns retry and pending requests. */
    };
  }
  private watch() {
    this.write({
      type: "watch",
      rooms: [...this.rooms.values()].map((v) => v.room),
    });
  }
  observe(room: Room) {
    const key = roomKey(room);
    const entry = this.rooms.get(key);
    this.rooms.set(key, { room, count: (entry?.count ?? 0) + 1 });
    this.watch();
    return () => {
      const entry = this.rooms.get(key);
      if (entry && entry.count > 1) entry.count--;
      else {
        this.setTyping(room, false);
        this.rooms.delete(key);
        this.watch();
      }
    };
  }
  setTyping(room: Room, active: boolean) {
    const key = roomKey(room);
    const previous = this.typing.get(key);
    const now = Date.now();
    if (!active) {
      this.typing.delete(key);
      if (previous) this.write({ type: "typing", ...room, active: false });
      return;
    }
    if (previous && now - previous.sent < TYPING_INTERVAL) {
      previous.activeUntil = now + 3000;
      return;
    }
    this.typing.set(key, { room, sent: now, activeUntil: now + 3000 });
    this.write({ type: "typing", ...room, active: true });
  }
  send(
    action: Extract<Action, { type: "message.send" }>,
  ): Promise<{ message: Message | null }> {
    if (!this.connected)
      return Promise.reject(new ApiError(0, "Not connected."));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new ApiError(0, "Confirmation timed out."));
        this.socket?.close();
      }, 20000);
      this.pending.set(requestId, { resolve, reject, timer });
      if (!this.write({ type: "send", requestId, action })) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(new ApiError(0, "Connection interrupted."));
      }
    });
  }
  close() {
    this.stopped = true;
    clearTimeout(this.retry);
    clearTimeout(this.timeout);
    this.socket?.close();
  }
}
