# AGENTS.md

TanStack Start (React 19) + Drizzle/Postgres + Better Auth + Tailwind v4 chat app. Port `1515` (`strictPort` — server exits if occupied).

## Commands

- Setup: `pnpm install`, copy `.env.example` → `.env`, `docker compose up -d postgres`, `pnpm db:migrate`, `pnpm dev` (open http://localhost:1515).
- Verify before PR: `pnpm typecheck`, `pnpm test`, `SENTRY_AUTH_TOKEN= pnpm build`.
- Prod flow: `pnpm install --frozen-lockfile && pnpm db:migrate && pnpm build && pnpm start`.
- DB: `pnpm db:generate` (new migration per schema change — never edit released migration), `pnpm db:migrate`. Seed (opt-in only, needs `SEED_EMAIL` + real inbox): `pnpm db:seed`.
- Tests: `pnpm test` = `tsx --test tests/*.test.ts` on isolated PGlite (applies committed migrations; Byteship mocked). Single file: `pnpm exec tsx --test tests/<name>.test.ts`.
- Live checks (require build + real `.env`, create disposable fixtures then clean up): `node --env-file=.env --import tsx scripts/smoke-realtime.ts` (running dev server + DB); `pnpm exec tsx --env-file=.env scripts/smoke.ts` / `scripts/benchmark-*.ts` (no server start).

## Gotchas

- Restart dev server after dep/env changes. `npm run dev` and `pnpm dev` both work post-install (patch applied via `pnpm-workspace.yaml`).
- `DATABASE_LISTEN_URL`: set to direct/session-mode URL when `DATABASE_URL` is a transaction-mode pooler, else LISTEN/NOTIFY breaks.
- WS gateway shares port 1515 at `/api/ws`; no separate server/Redis. Needs HTTP/1.1 upgrade passthrough + idle timeout >60s in prod; static/serverless hosts won't work.
- Auth: passwordless email-code only (Sendbyte, `sk_live_` for real delivery). Password endpoints disabled. `BETTER_AUTH_URL` must be the public origin; GitHub/Discord callbacks at `/api/auth/callback/<provider>`.
- `src/routeTree.gen.ts` is generated — never edit. `patches/` (TanStack abort/499 handling) applies on install — don't remove.
- Uploads: server-minted Byteship sessions only; `pnpm uploads:cleanup` is manual (no scheduler). OG: `pnpm og:generate` after logo changes.

## Conventions

- Tailwind v4 utilities inline in components; full class names only (no dynamic construction); global CSS (`src/styles.css`) for tokens/defaults/keyframes only; `data-ui` attributes for state selectors.
- Server is authoritative: validate input + enforce permissions in `src/server/access.ts|actions.ts|queries.ts`, contracts in `src/lib/contracts.ts`, shared types in `src/types/`. Never trust client state/roles/authorship.
- Layout: `src/server/db/` + `drizzle/` (schema/migrations), `src/server/auth.ts`, `src/server/uploads.ts`, `src/routes/api.*` (handlers), `src/server/realtime/` + `src/lib/realtime-client.ts`, `src/components/app/`, `scripts/`.
- Tests for security boundaries/regressions; include screenshots for UI PRs, migration notes for schema PRs.
