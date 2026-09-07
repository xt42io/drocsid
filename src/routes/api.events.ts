import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { events, profiles } from "../server/db/schema";
import { endpoint, requireUser } from "../server/http";
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () => {
          const viewer = await requireUser(request);
          const db = getDb();
          await db
            .update(profiles)
            .set({ lastSeenAt: new Date() })
            .where(eq(profiles.userId, viewer.id));
          let stop = () => {};
          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              let stopped = false;
              let previous = "";
              let busy = false;
              let timer: ReturnType<typeof setInterval>;
              let expiry: ReturnType<typeof setTimeout>;
              stop = () => {
                if (stopped) return;
                stopped = true;
                clearInterval(timer);
                clearTimeout(expiry);
                request.signal.removeEventListener("abort", stop);
                try {
                  controller.close();
                } catch {
                  /* Already cancelled by the client. */
                }
              };
              const tick = async () => {
                if (busy || stopped) return;
                busy = true;
                try {
                  const [latest] = await db
                    .select()
                    .from(events)
                    .where(eq(events.userId, viewer.id))
                    .orderBy(desc(events.createdAt), desc(events.id))
                    .limit(1);
                  if (stopped) return;
                  const revision = latest?.id || "initial";
                  controller.enqueue(
                    encoder.encode(
                      previous !== revision
                        ? `data: ${JSON.stringify({ revision })}\n\n`
                        : ": heartbeat\n\n",
                    ),
                  );
                  previous = revision;
                } catch {
                  stop();
                } finally {
                  busy = false;
                }
              };
              timer = setInterval(() => {
                void tick();
              }, 2000);
              // Reconnects recheck the session and permissions regularly, including revoked sessions.
              expiry = setTimeout(stop, 25_000);
              request.signal.addEventListener("abort", stop, { once: true });
              // Authentication/database work above may finish after the browser
              // has already disconnected; abort events are not replayed.
              if (request.signal.aborted) stop();
              void tick();
            },
            cancel() {
              stop();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-store",
              "X-Accel-Buffering": "no",
            },
          });
        }),
    },
  },
});
