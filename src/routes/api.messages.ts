import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { messagePage, searchMessages } from "../server/queries";
import {
  endpoint,
  HttpError,
  json,
  requireUser,
  requireOrigin,
  readJson,
} from "../server/http";
import { actionSchema } from "../lib/contracts";
import { sendMessage } from "../server/send-message";
import { getPostHogClient } from "../lib/posthog-server";
export const Route = createFileRoute("/api/messages")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const input = actionSchema.parse(await readJson(request));
          if (input.type !== "message.send")
            throw new HttpError(400, "Expected a message.");
          const start = performance.now();
          const viewer = await requireUser(request);
          const authenticated = performance.now();
          const result = await sendMessage(getDb(), viewer.id, input);
          const response = json(result);
          response.headers.set(
            "Server-Timing",
            `auth;dur=${(authenticated - start).toFixed(1)}, write;dur=${(performance.now() - authenticated).toFixed(1)}`,
          );
          const posthog = getPostHogClient();
          if (posthog) {
            const sessionId = request.headers.get("X-PostHog-Session-Id");
            const conversationType = input.conversation.startsWith("dm:")
              ? "dm"
              : "channel";
            posthog.capture({
              distinctId: viewer.id,
              event: "message_sent",
              properties: {
                $session_id: sessionId || undefined,
                conversation_type: conversationType,
                has_attachments: input.attachments.length > 0,
                attachment_count: input.attachments.length,
                is_thread_reply: !!input.threadOf,
                text_length: input.text.length,
              },
            });
            await posthog.flush();
          }
          return response;
        }),
      GET: ({ request }) =>
        endpoint(async () => {
          const viewer = await requireUser(request);
          const params = new URL(request.url).searchParams;
          const q = params.get("q");
          if (q !== null)
            return json({
              messages: await searchMessages(
                getDb(),
                viewer.id,
                q.slice(0, 200),
              ),
            });
          const conversation = params.get("conversation");
          if (!conversation || conversation.length > 350)
            throw new HttpError(400, "Choose a conversation.");
          return json(
            await messagePage(
              getDb(),
              viewer.id,
              conversation,
              params.get("before") || undefined,
              params.get("target") || undefined,
            ),
          );
        }),
    },
  },
});
