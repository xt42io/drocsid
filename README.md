# drocsid

An open-source community chat app built with TanStack Start, React, Tailwind, Hugeicons, PostgreSQL, Drizzle, Better Auth, and Byteship.

## Local setup

Requires Node.js 22.12+ and pnpm.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `BYTESHIP_API_KEY`. Generate the auth secret with `openssl rand -hex 32`.
3. Use your existing PostgreSQL server, or start the supplied local database with `docker compose up -d postgres`.
4. Run `pnpm db:migrate`.
5. Run `pnpm dev` from your terminal and open http://localhost:1515.

The server uses port 1515 and exits if it is occupied. After changing dependencies or environment variables, restart your terminal server.

Create your own account at `/sign-up`, finish your profile, then create a community from the sidebar. A new database starts empty. The landing page retains its illustrative conversation; authenticated pages use real server data.

Optional development fixtures: supply `SEED_EMAIL` and `SEED_PASSWORD` and run `pnpm db:seed`. This creates one account and a community; it never runs automatically.

## Connected features

- Email/password registration, login, sessions, logout, and a password reset flow.
- Profiles, unique usernames, appearance settings, notification preferences, activity visibility, and incoming-DM preferences.
- Public communities, public invitation links, memberships, categories, channels, member roles, and removal.
- Private-channel access is enforced on the server. Owners/admins can access private channels and grant explicit membership through the `channel.access` command.
- Channel messages and DMs, edits, soft deletion, threads, reactions, pins, personal saves, read state, mentions, and search.
- Cursor-based message history and links to search results.
- SSE invalidations refresh clients after committed changes, with reconnects and a polling fallback.
- Optional community selection during onboarding, with skip and create-your-own paths.
- Byteship profile photos in onboarding and settings, shown throughout chat, mentions, friends, and member lists.
- Private Byteship message attachments, file picker, drag/drop, clipboard images, progress, retry/cancel, image viewing, and downloads.

The browser's former `drocsid-design-preview-v1` data is no longer loaded or synchronized. Unsent drafts live only in the current tab. Existing UI state edits are translated into validated resource commands; the server never accepts arbitrary client state, membership, roles, or authorship.

## Authentication configuration

Better Auth stores its users, sessions, accounts, and verification records in Postgres. Every app endpoint checks the session. Mutations also enforce same-origin requests and validate input.

- `BETTER_AUTH_URL`: public origin, locally `http://localhost:1515`.
- `BETTER_AUTH_SECRET`: random secret, at least 32 characters.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: optional GitHub login. Register the callback at `/api/auth/callback/github`.
- `SMTP_URL` / `SMTP_FROM`: optional SMTP transport for password recovery. Without these, recovery returns an explicit unavailable error rather than pretending to send email.

Email verification is not required in this initial release. Before a public launch, configure your trusted reverse proxy/IP handling for auth rate limiting, TLS, email delivery, and backups. No email is sent by the test suite.

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

Run `pnpm uploads:cleanup` periodically on the server. It removes abandoned uploads older than an hour, files belonging to deleted messages, replaced/removed profile photos, and expired event/rate-limit records. Failed storage deletions remain queued for retry. This command is supplied but no OS scheduler is installed automatically.

## Permissions and current limits

Community roles are scoped to each community. Owners/admins manage channels, categories, pins, and membership. Moderators can delete other members' messages. The owner cannot leave; ownership transfer is not implemented yet. Public communities can be rejoined after removal; persistent bans and private-community invitations are future work.

Individual mentions are resolved from current membership. `@everyone` and `@admin` require an owner/admin, and notifications only reach users who can read the channel. Blocks prevent direct messages and suppress mention notifications. Existing DMs remain available when the incoming-DM preference is switched off; that preference controls new conversations.

This is an initial connected release. SSE uses Postgres-backed, payload-free invalidation events and re-fetches authorized state rather than a dedicated realtime broker. Presence uses a recent connection heartbeat; typing indicators and push/email message notifications are not implemented. Search returns up to 100 matching messages. The bootstrap loads 500 recent messages and can expand to 5,000 while browsing history; very large communities will need dedicated per-conversation caches. File quotas and signature checks are implemented; antivirus scanning, video processing, and uploaded community icons are not.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
```

Tests use an isolated PGlite PostgreSQL engine and apply the committed migrations. They cover real Better Auth sessions, ownership/role checks, private-channel isolation, messages, reactions, saves, threads, mentions, blocks, pagination, CSRF, limits, attachment binding, avatar lifecycle, and optional onboarding. Byteship is mocked in the automated suite.

For an explicit integration check against the configured database and Byteship project, build first and run:

```sh
pnpm exec tsx --env-file=.env scripts/smoke.ts
```

The smoke script calls the production route handlers without starting a server. It creates a disposable account/community/file, checks authorization and delivery, then removes its fixtures. It does not send emails. Run only against an environment where you want this check performed.

## Source layout

- `src/server/db/` and `drizzle/`: schema, connection, and migrations.
- `src/server/auth.ts`: Better Auth and optional email/OAuth configuration.
- `src/server/access.ts`, `actions.ts`, and `queries.ts`: permissions, mutations, and authorized reads.
- `src/server/uploads.ts`: private Byteship upload and delivery lifecycle.
- `src/routes/api.*`: authenticated HTTP and SSE handlers.
- `src/lib/contracts.ts`: validated command contracts.
- `src/lib/app-state.tsx` and `state-actions.ts`: connected UI state and command adapter.
- `src/components/app/`: workspace, conversations, uploads, settings, and dialogs.
- `scripts/`: opt-in seeding, storage cleanup, and live smoke check.

TanStack generates `src/routeTree.gen.ts`; do not edit it manually. The public repository URL and project license have not been chosen yet.

### Request cancellation compatibility

The pinned TanStack Start request wrapper is patched in `patches/` to handle confirmed browser disconnects before H3 logs them as unhandled 500 errors. It returns an empty 499 response only when the failure (or its cause) is the incoming request's abort reason; other server and upstream connection errors retain normal handling. `pnpm install` applies the patch through `pnpm-workspace.yaml`. Both `npm run dev` and `pnpm dev` work after installation. `tests/request-abort.test.ts` covers this behavior.
