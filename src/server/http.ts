import { ZodError } from "zod";
import { getAuth } from "./auth.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  if (!session.user.emailVerified)
    throw new HttpError(401, "Please verify your email to continue.");
  return session.user;
}
export function requireOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:1515",
  ).origin;
  if (origin !== expected)
    throw new HttpError(403, "This request must come from Drocsid.");
}
export async function readJson(request: Request, maxBytes = 128_000) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Expected JSON.");
  // Stream the body with a hard bound, including chunked requests.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function endpoint(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json({ error: error.issues[0]?.message || "Invalid input." }, 400);
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (
      cause?.code === "23505" ||
      (error as { code?: string })?.code === "23505"
    )
      return json({ error: "That name or record already exists." }, 409);
    // Never return database errors, SQL parameters, credentials, or provider internals.
    console.error(
      "[Drocsid API] request failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return json(
      {
        error:
          "The server could not complete this request. Check server configuration and try again.",
      },
      500,
    );
  }
}
