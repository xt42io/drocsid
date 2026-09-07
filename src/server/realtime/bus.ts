import { Client } from "pg";
import type { Presence } from "../../types/app";

export type BusEvent =
  | { type: "message"; id: string; conversationId: string }
  | { type: "invalidate"; userId: string }
  | { type: "access" }
  | { type: "session"; id: string }
  | { type: "read"; userId: string; conversation: string; through: string }
  | { type: "identity"; userId: string }
  | {
      type: "lease";
      connectionId: string;
      userId: string;
      status: Presence;
      expiresAt: number;
    }
  | {
      type: "typing";
      connectionId: string;
      userId: string;
      name: string;
      conversationId: string;
      threadOf?: string;
      expiresAt: number;
    };
export interface LiveBus {
  start(
    receive: (event: BusEvent) => void,
    available: (ready: boolean) => void,
  ): void;
  publish(event: BusEvent): void;
  close(): Promise<void>;
}

// A dedicated, session-persistent connection is necessary for LISTEN. A transaction
// pooler URL can still be used for normal queries; give this connection a direct URL.
export function postgresBus(): LiveBus {
  let client: Client | undefined;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let receive: (event: BusEvent) => void;
  let available: (ready: boolean) => void;
  const origin = crypto.randomUUID();
  function failed(connection: Client) {
    if (connection !== client) return;
    client = undefined;
    available(false);
    void connection.end().catch(() => {});
    if (!stopped) retry = setTimeout(connect, 2000);
  }
  function connect() {
    if (stopped) return;
    const connection = new Client({
      connectionString:
        process.env.DATABASE_LISTEN_URL || process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });
    client = connection;
    connection.on("error", () => failed(connection));
    connection.on("end", () => failed(connection));
    connection.on("notification", ({ payload }) => {
      if (!payload) return;
      try {
        const event = JSON.parse(payload);
        if (event.origin !== origin) receive(event);
      } catch {
        /* Only JSON notifications from our channel are relevant. */
      }
    });
    void connection
      .connect()
      .then(() => connection.query("LISTEN drocsid_live"))
      .then(() => {
        if (client === connection && !stopped) available(true);
      })
      .catch(() => failed(connection));
  }
  return {
    start(onEvent, onAvailable) {
      receive = onEvent;
      available = onAvailable;
      connect();
    },
    publish(event) {
      receive(event);
      const connection = client;
      if (!connection) return;
      void connection
        .query("select pg_notify('drocsid_live', $1)", [
          JSON.stringify({ ...event, origin }),
        ])
        .catch(() => failed(connection));
    },
    async close() {
      stopped = true;
      clearTimeout(retry);
      const connection = client;
      client = undefined;
      if (connection) await connection.end().catch(() => {});
    },
  };
}
