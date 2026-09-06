# drocsid

An open-source Discord alternative, starting with thoughtful text chat.

The frontend includes a landing page, authentication screens, onboarding, and a complete connected app preview. It keeps the approved warm-paper, green, and orange design throughout the experience.

## Run locally

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open `http://localhost:1515/app` for the workspace, or `/` for the website. Vite exits if port 1515 is occupied instead of choosing another port.

```sh
pnpm typecheck
pnpm build
```

## Pages

| Route                                      | Experience                                                         |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `/`                                        | Landing page and interactive chat preview                          |
| `/sign-in`, `/sign-up`, `/forgot-password` | Authentication UI with local validation                            |
| `/app`                                     | Opens your first joined community                                  |
| `/app/community/:communityId/:channelId`   | Text channels, members, pins, and reply threads                    |
| `/app/community/:communityId/settings`     | Community details, channels, and members                           |
| `/app/dm/:personId`                        | Direct conversations and profiles                                  |
| `/app/friends`                             | All/online friends, incoming/outgoing requests, and blocked people |
| `/app/inbox`                               | Mentions, replies, and unread filters                              |
| `/app/saved`                               | Saved messages and links back to their conversations               |
| `/app/search?q=...`                        | Search messages, people, and channels                              |
| `/app/discover`                            | Browse, filter, and join sample communities                        |
| `/app/settings?section=profile`            | Profile, appearance, notifications, privacy, and preview data      |
| `/app/welcome`                             | Two-step profile and community onboarding                          |
| `/app/invite/:communityId`                 | Local invitation and joining flow                                  |

## Working local interactions

- Create communities, categories, and channels; update community details and channel topics; delete channels with confirmation. Create categories from the community menu, the channel sidebar, or Community settings → Channels. Empty categories stay visible, and new channels can be placed in any category.
- Compose messages, insert emoji or formatted text, edit/delete your messages, react, and pin or save messages.
- Open reply threads, send replies, search messages, and jump to individual results.
- Pick from five quick reactions, then use the More button for the full searchable emoji panel with categories, skin tones, and recently used emoji. The message composer opens the full panel directly.
- Type `@` to find people by username or display name; use arrow keys and Enter/Tab to choose, or Escape to dismiss. Hover, focus, or tap a message mention for a profile preview. Community channels and threads also support `@everyone` (all members) and `@admin` (owners and admins).
- Type `#` in a community message to search its channels. Selected channel mentions become links, with a channel preview on hover or focus. Unmatched `@` and `#` searches close quietly so you can keep typing normally.
- Start direct conversations, accept/decline/cancel friend requests, remove friends, and block/unblock people.
- Mark inbox items read or unread; filter friends, communities, and search results.
- Edit your profile, status, and avatar color. Switch between daylight and after-hours themes, change density and message size, and save notification/privacy preferences.
- Copy a preview invitation, complete onboarding, export local preview data, or reset to the original sample data.

`Enter` sends a message; `Shift + Enter` inserts a line break. `Cmd/Ctrl + K` opens search. Menus and native dialogs support Escape. Navigation collapses to a drawer on small screens; member lists and threads become side panels.

## Frontend-only scope

This is a local design preview, not a connected service. All people and initial conversations are fictional sample data. Messages, friendships, membership, drafts, and preferences are saved under `drocsid-design-preview-v1` in this browser’s local storage. Changes do not synchronize between browsers or reach other people.

Authentication forms validate locally and show explicit preview completion states. They do not store credentials, create accounts, sign in, or send emails. Sign-up can continue to onboarding; sign-in can enter the workspace preview. GitHub sign-in is not connected.

Notification and incoming-DM preferences are saved for review; they do not register notification permissions, produce browser/email alerts, or enforce real access controls. Invitation links open a local preview and cannot grant real community access.

Postgres and Better Auth remain reserved for the backend phase. No environment variables, external fonts, images, uploads, voice, or video are required for this phase.

## Source layout

- `src/routes/` — TanStack file routes, metadata, URL parameters, and search validation
- `src/lib/demo-data.ts` — typed sample people, communities, messages, and initial preferences
- `src/lib/app-state.tsx` — local preview state, persistence, and shared actions
- `src/components/app/` — workspace shell, conversations, pages, dialogs, and shared UI primitives
- `src/components/auth-screen.tsx` — shared authentication presentation
- `src/components/chat-preview.tsx` — the small landing-page preview
- `src/styles.css` — shared Tailwind theme, landing page, and auth styles
- `src/app.css` — responsive workspace and theme styles

Built with TanStack Start, TanStack Router, React, TypeScript, Tailwind CSS v4, and Hugeicons. DM Sans and DM Mono are bundled locally. TanStack Start generates `src/routeTree.gen.ts`; do not edit it by hand.

The public repository, release process, and project license will be decided before publication. No repository URL or project license has been invented for the preview.
