# Contributing to Drocsid

Thank you for helping make Drocsid better. Contributions can include bug reports, design feedback, documentation, tests, accessibility improvements, and code.

## Before you begin

- Search the existing [issues](https://github.com/xt42io/drocsid/issues) and pull requests before opening a duplicate.
- Open an issue before investing in a large feature, schema change, new dependency, or major interface redesign so the approach can be discussed.
- Keep security vulnerabilities private. Email `hello@drocsid.app` with reproduction details instead of opening a public issue.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in project spaces.

## Local setup

Drocsid requires Node.js 22.12 or newer, pnpm, and PostgreSQL.

1. Fork and clone the repository.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env` and configure the required local values. Never commit secrets.
4. Start PostgreSQL with `docker compose up -d postgres`, or use your own development database.
5. Run `pnpm db:migrate`.
6. Run `pnpm dev` and open `http://localhost:1515`.

See [README.md](README.md) for the full environment and architecture notes.

## Making a change

- Create a focused branch from the current default branch.
- Keep each pull request limited to one clear problem or feature.
- Use Tailwind v4 utilities directly in components. Keep global CSS for shared tokens, element defaults, and keyframes.
- Put shared application types in `src/types/` and validated network contracts in `src/lib/contracts.ts`.
- Enforce permissions and input validation on the server even when the interface hides an action.
- Add a Drizzle migration for every database change. Do not edit an already-released migration.
- Add meaningful tests for security boundaries, persistent behavior, and regressions. Avoid tests that only repeat implementation details.
- Preserve accessibility: keyboard use, visible focus, useful labels, semantic elements, and reduced-motion behavior.

## Checks

Run these before submitting a pull request:

```sh
pnpm typecheck
pnpm test
SENTRY_AUTH_TOKEN= pnpm build
```

If a change needs a database or external service, explain how you verified it and which configuration the reviewer needs.

## Pull requests

Describe the concrete problem and resulting behavior. Include screenshots or a short recording for visible interface changes, migration notes for schema changes, and the checks you ran. Link the relevant issue when one exists.

Maintainers may request changes, close work that does not fit the project, or ask to split an oversized pull request. Reviews focus on user impact, security, data access, maintainability, accessibility, and performance.

## License

By submitting a contribution, you agree that it may be distributed under the repository’s [GNU Affero General Public License version 3](LICENSE), identified by SPDX as `AGPL-3.0-only`. You confirm that you have the right to submit the contribution under that license.
