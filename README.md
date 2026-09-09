# drocsid

An open-source community chat app built with TanStack Start, React, Tailwind, Hugeicons, PostgreSQL, Drizzle, Better Auth, and Byteship.

## Local setup

Requires Node.js 22.12+ and pnpm.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INVITE_SHORT_URL`, `BYTESHIP_API_KEY`, `SENDBYTE_API_KEY`, and `SENDBYTE_FROM`. Generate the auth secret with `openssl rand -hex 32`.
3. Use your existing PostgreSQL server, or start the supplied local database with `docker compose up -d postgres`.
4. Run `pnpm db:migrate`.
5. Run `pnpm dev` from your terminal and open http://localhost:1515.

The server uses port 1515 and exits if it is occupied. After changing dependencies or environment variables, restart your terminal server.

Create your own account at `/sign-up`, finish your profile, then create a community from the sidebar. A new database starts empty. The landing page retains its illustrative conversation; authenticated pages use real server data.

Optional development fixtures: supply `SEED_EMAIL` and run `pnpm db:seed`. This creates one account and a community; it never runs automatically. The seed account must verify its email when signing in, so use an inbox you control.

## UI styling

Use Tailwind v4 utilities directly in components, including responsive and state variants. `src/styles.css` contains font imports, theme tokens, base element defaults, and animation keyframes. Keep complete utility names in source so Tailwind can discover them; use `data-ui` attributes for component and state selectors. Floating UI supplies the calculated inline positions for popovers. The emoji picker's scoped important utilities override its third-party stylesheet.

## Connected features

- Passwordless email-code registration and login through Sendbyte, plus optional GitHub login, sessions, and logout.
- Profiles, unique usernames, appearance settings, notification preferences, activity visibility, and incoming-DM preferences.
- Public communities, revocable short invitation links, memberships, categories, channels, member roles, and removal.
- Private-channel access is enforced on the server. Owners/admins can access private channels and grant explicit membership through the `channel.access` command.
- Channel messages and DMs, edits, soft deletion, threads, reactions, pins, personal saves, read state, mentions, and search. Messages render immediately with a faded pending state and clear the composer for the next message. Confirmation restores their normal color; failed messages remain in the list with a retry button.
- Cursor-based message history and links to search results.
- WebSocket message delivery, typing indicators in channels/DMs/threads, connection presence, and automatic reconnect recovery.
- Message requests for non-friend DMs, with preview, accept, decline, and block actions. Pending requests stay out of the regular DM list and suppress read and typing activity until accepted.
- Optional community selection during onboarding, with skip and create-your-own paths.
- Byteship profile photos in onboarding and settings, shown throughout chat, mentions, friends, and member lists.
- Private Byteship message attachments, file picker, drag/drop, clipboard images, progress, retry/cancel, image viewing, and downloads. Sent images keep their local preview until the stored image has loaded; other images show a loading placeholder, with retry on failure.

The browser's former `drocsid-design-preview-v1` data is no longer loaded or synchronized. Unsent drafts live only in the current tab. Existing UI state edits are translated into validated resource commands; the server never accepts arbitrary client state, membership, roles, or authorship.

## Realtime and production server

Run `pnpm db:migrate` after pulling these changes. Restart your terminal dev server with `npm run dev` (or `pnpm dev`) to load the WebSocket gateway on the same port, **1515**, at `/api/ws`. No separate chat server or Redis setup is needed.

Messages use the socket while connected and the authenticated HTTP endpoint during reconnects. A lost acknowledgement retries the same message ID, so it cannot create duplicates. Database triggers notify only after commit; each recipient gets a fresh permission-checked message projection, including edits, reactions, attachments and deletions. There is no interval polling for messages or full snapshot fetch after every send. Bootstrap, reconnects and changes to communities/profiles still fetch authorized state. Reconnect recovery covers the loaded history window.

Typing is temporary: scoped to the selected channel or thread, throttled to one update per two seconds and expired after five seconds. It clears on send, blur, leaving a room or disconnect. Invisible users do not announce typing. Presence uses expiring connection leases, so closing one of several tabs does not mark someone offline. Heartbeats check socket health and sessions every 25 seconds; they do not poll messages. Permission changes force subscriptions to reauthorize.

`LISTEN/NOTIFY` uses a dedicated Postgres connection. If `DATABASE_URL` goes through a transaction-mode pooler, set `DATABASE_LISTEN_URL` to the direct database URL (or a session-mode pooler). The listener reconnects after database interruptions and clients recover missed messages from Postgres. Notifications also carry ephemeral typing/presence between Node processes; no typing text is stored.

For a production Node deployment:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

The runner serves built assets, TanStack HTTP routes and WebSocket upgrades together. Set `BETTER_AUTH_URL` to your public HTTPS origin; forward HTTP/1.1 WebSocket upgrades for `/api/ws` through your reverse proxy and use an idle timeout over 60 seconds. Use a persistent Node host; a static host or a request-only serverless deployment will not run this gateway. `PORT` optionally overrides the production port.

Set `INVITE_SHORT_URL=https://drocsid.cc` and attach `drocsid.cc` to the same service as the main app. The production runner accepts only `/{invite-code}` on that host and redirects valid codes to the canonical invite page on `BETTER_AUTH_URL`. Every other `.cc` path returns 404 before assets or application routes are served. Invite creation, preview, acceptance, and revocation are backed by Postgres; accepting a revoked, expired, exhausted, or unknown code is rejected by the server.

To check the already-running server against the configured database:

```sh
node --env-file=.env --import tsx scripts/smoke-realtime.ts
```

This creates two disposable users and a community, verifies real socket delivery/typing and reconnect history, reports latency, then removes its fixtures. It never starts or stops your dev server.

## Authentication configuration

Better Auth stores its users, sessions, accounts, and verification records in Postgres. Every app endpoint checks the session. WebSocket upgrades check the same Better Auth cookie and exact origin, with session expiry, revocation and periodic validation. Mutations also enforce same-origin requests and validate input.

- `BETTER_AUTH_URL`: public origin, locally `http://localhost:1515`.
- `INVITE_SHORT_URL`: origin used for short invite links, normally `https://drocsid.cc`.
- `BETTER_AUTH_SECRET`: random secret, at least 32 characters.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: optional GitHub login. Register the callback at `/api/auth/callback/github`.
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`: optional Discord login. Register the callback at `/api/auth/callback/discord`.
- `SENDBYTE_API_KEY`: server-only Sendbyte key with email sending permission.
- `SENDBYTE_FROM`: sender on your verified domain, for example `Drocsid <hello@your-domain.com>`.

Signup and login start with only an email address, then a six-digit email code. The account and initial profile are created only after verification. Welcome collects a username (with a debounced availability check), profile name, and optional avatar before the optional community selection step. Username uniqueness is enforced when saving, so an availability check does not reserve a name. Existing accounts use the same code flow. Password login, password registration, password changes, and all password reset endpoints are disabled on the backend. Old recovery URLs redirect to sign-in. Existing accounts and chat history are preserved; no password data migration is needed.

Codes are hashed in Postgres, expire in five minutes, allow five failed attempts, and are consumed once. Resends share one database-backed budget per normalized email (one request per minute), in addition to Better Auth’s IP limits. New codes replace previous ones. Both new and existing addresses receive a sign-in code; requesting a code alone does not create an account.

Configure Sendbyte at [app.sendbyte.africa](https://app.sendbyte.africa/), verify your sender domain’s DNS, and use a live key (`sk_live_`) for inbox delivery. Sandbox keys (`sk_test_`) simulate delivery only. See the [Sendbyte setup guide](https://docs.sendbyte.africa/quickstart). Missing configuration and provider failures return an explicit error. The server uses the official SDK with bounded request attempts and idempotency keys; it never exposes the key or logs email bodies/codes. SMTP is no longer used. No new database migration is required for OTPs.

Before a public launch, configure trusted reverse proxy/IP handling for auth rate limiting, TLS, and backups. The automated suite mocks Sendbyte; smoke/benchmark scripts create disposable `example.test` accounts through the real verification flow with in-memory email capture. They never deliver email. Test live delivery manually with your own inbox after configuring Sendbyte.

## Byteship

The server holds the Byteship project key, with `files:read`, `files:write`, and `files:delete` scopes. The project must support private files.

For each attachment the server checks conversation access, reserves a unique path, and creates one private upload session. The browser receives only that session's signed PUT URL and headers, then uploads the file directly. Completion is performed server-side, verifies storage metadata and actual size, and checks image signatures before allowing inline previews. This uses `@byteship/js`; the UI uses XHR for progress and cancellation.

Message creation accepts only ready attachments owned by the sender and reserved for the same conversation. Text may be empty when attachments are present. Downloads recheck conversation permissions and stream from Byteship with controlled response headers. Raw HTML and SVG are never displayed inline.

Defaults:

- 25 MB per file, configurable downward with `BYTESHIP_MAX_UPLOAD_BYTES`.
- 10 files per message.
- 1 GB retained storage per user, configurable with `BYTESHIP_USER_QUOTA_BYTES`.
- 30 unattached files per user; upload endpoints are also rate limited.

Profile photos accept PNG, JPEG, WebP, or GIF up to 5 MB. Uploads use private Byteship paths; authenticated photo routes serve only the current photo. Replacing/removing a photo invalidates profile snapshots across the app and queues the old file for cleanup.

Avatars request 40, 80, or 160 px WebP crops through Byteship's media transformation API. Chat previews fit within 420×320 or 840×640 px without enlarging small originals; `srcSet` selects the appropriate density. The app authorizes each request before transforming a signed private URL. Originals remain available for the image viewer and downloads. Animation is preserved, local upload previews and loading placeholders remain visible until delivery completes, and failed transformations fall back to the original. Only these fixed variants are accepted; API keys and signed delivery tokens stay server-side.

Run `pnpm uploads:cleanup` periodically on the server. It removes abandoned uploads older than an hour, files belonging to deleted messages, replaced/removed profile photos, and expired verification/event/rate-limit records. Failed storage deletions remain queued for retry. This command is supplied but no OS scheduler is installed automatically.

## Error monitoring

Sentry captures browser and server errors, TanStack Router navigation traces, server route and server-function spans, and masked session replays. Chat text, form text, media, cookies, request bodies, query parameters, database values, and automatic user information are excluded from collection.

The project DSN is configured as a public fallback and documented in `.env.example`. Set `SENTRY_DSN` and `VITE_SENTRY_DSN` to override it. Set the server-only `SENTRY_AUTH_TOKEN` in local and deployment environments to upload production source maps during `pnpm build`; builds remain functional without the token. Both `pnpm dev` and `pnpm start` preload the server instrumentation before application modules.

## Permissions and current limits

Community roles are scoped to each community. Owners/admins manage channels, categories, pins, and membership. Moderators can delete other members' messages. The owner cannot leave; ownership transfer is not implemented yet. Public communities can be rejoined after removal; persistent bans and private-community invitations are future work.

Individual mentions are resolved from current membership. `@everyone` and `@admin` require an owner/admin, and notifications only reach users who can read the channel. Blocks prevent direct messages and suppress mention notifications. Existing DMs remain available when the incoming-DM preference is switched off; that preference controls new conversations.

Non-friends who share a community can send a message request if the recipient allows them. Only the recipient can accept or decline it, and accepting does not create a friendship. Declining prevents further messages and hides the request; becoming friends is an explicit way to allow that conversation again. Migration `0005` moves existing unanswered non-friend DMs into requests, while keeping reciprocal conversations and friend DMs accepted.

Blocking keeps existing DM history, threads, and attachments readable for both participants. The conversation stays in its existing DM or message-request list, with no message or thread composer. The backend rejects new messages, uploads, reactions, and typing in either direction until all blocks between the participants are removed. Unblocking does not restore the friendship or accept a pending message request.

This is an initial connected release. Push/email message notifications are not implemented. Search returns up to 100 matching messages. The bootstrap loads 500 recent messages and can expand to 5,000 while browsing history; very large communities will need dedicated per-conversation caches. File quotas and signature checks are implemented; antivirus scanning, video processing, and uploaded community icons are not.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
```

Tests use an isolated PGlite PostgreSQL engine and apply the committed migrations. They cover real Better Auth sessions, ownership/role checks, private-channel isolation, messages, reactions, saves, threads, mentions, blocks, pagination, CSRF, limits, attachment binding, avatar lifecycle, optional onboarding, commit-only notifications, authorized realtime projections, WebSocket authentication, typing isolation/expiry, presence and revocation. Byteship is mocked in the automated suite.

For an explicit integration check against the configured database and Byteship project, build first and run:

```sh
pnpm exec tsx --env-file=.env scripts/smoke.ts
```

The smoke script calls the production route handlers without starting a server. It creates a disposable account/community/file, checks authorization and delivery, then removes its fixtures. It does not send emails. Run only against an environment where you want this check performed.

To measure message latency against the configured database, run `pnpm exec tsx --env-file=.env scripts/benchmark-messages.ts` after a build. This uses a disposable account and community, prints three send timings and a snapshot timing, and removes its fixtures. The send endpoint exposes `auth` and `write` timings in the `Server-Timing` response header. Plain messages commit permissions, rate limits, persistence and commit notifications in one database statement; mentions, replies and attachments use the full transactional path.

Reactions use `/api/reactions` with an explicit `active` selection, so repeating a request cannot toggle it back. Permissions, quota, and the write run in one database statement; existing triggers publish updates over WebSockets. The UI updates immediately, coalesces rapid clicks per emoji, preserves live counts while requests are pending, and restores server state on failure. Reactions do not wait behind the general action queue. After building, run `pnpm exec tsx --env-file=.env scripts/benchmark-reactions.ts` to compare the old and new handlers using disposable fixtures and inspect `auth`/`write` timings.

Single `channel.put` actions use one database statement for manager permissions, rate limits, category/channel persistence, and notifications scoped to the community's members. The creation dialog applies the confirmed channel immediately and refreshes other app data in the background; it does not wait behind the general action queue. Repeated submits are disabled and retries reuse the channel ID. Run `pnpm exec tsx --env-file=.env scripts/benchmark-channels.ts` after building to measure three channel creations with disposable fixtures and `Server-Timing` details.

## Source layout

- `src/server/db/` and `drizzle/`: schema, connection, and migrations.
- `src/server/auth.ts`: Better Auth and optional email/OAuth configuration.
- `src/server/access.ts`, `actions.ts`, and `queries.ts`: permissions, mutations, and authorized reads.
- `src/server/uploads.ts`: private Byteship upload and delivery lifecycle.
- `src/routes/api.*`: authenticated HTTP handlers.
- `src/server/realtime/`: WebSocket gateway, Postgres notification bus, authorized message projections and Vite integration.
- `src/lib/realtime-client.ts`: browser connection, acknowledgement handling, subscriptions and reconnects.
- `src/types/app.ts`: shared application types used by the UI and server.
- `src/lib/contracts.ts`: validated command contracts.
- `src/lib/app-state.tsx` and `state-actions.ts`: connected UI state and command adapter.
- `src/components/app/`: workspace, conversations, uploads, settings, and dialogs.
- `scripts/`: opt-in seeding, storage cleanup, and live smoke check.

TanStack generates `src/routeTree.gen.ts`; do not edit it manually. The public repository URL and project license have not been chosen yet.

### Request cancellation compatibility

The pinned TanStack Start request wrapper is patched in `patches/` to handle confirmed browser disconnects before H3 logs them as unhandled 500 errors. It returns an empty 499 response only when the failure (or its cause) is the incoming request's abort reason; other server and upstream connection errors retain normal handling. `pnpm install` applies the patch through `pnpm-workspace.yaml`. Both `npm run dev` and `pnpm dev` work after installation. `tests/request-abort.test.ts` covers this behavior.
