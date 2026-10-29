# StablePay × AMIXOF — Tech Stack & UI

Branch `amixof-layout`. A Vite single-page app: the AMIXOF social layout (ported from the Lovable project `hustlebignet/snapshot-site-atelier`) wrapped around the StablePay stablecoin payment features.

## Tech stack

| Area | Choice | Version |
|---|---|---|
| Language | TypeScript | ~5.8 |
| UI library | React | 19.1 |
| Build tool | Vite (+ `@vitejs/plugin-react`) | 7.1 / 5.0 |
| Routing | TanStack Router, file-based (`@tanstack/router-plugin`), client-side only | 1.170 |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, `tw-animate-css` | 4.3 |
| Components | shadcn/ui (new-york style) on Radix UI primitives | Radix 1.x–2.x |
| Icons | `lucide-react` (also `@heroicons/react` in older payment screens) | 0.575 / 2.2 |
| Toasts | `sonner` | 2.0 |
| Forms / validation | `react-hook-form`, `zod`, `@hookform/resolvers` | 7.9 / 3.25 / 5.9 |
| Charts | `recharts` | 2.15 |
| Other UI libs | `cmdk`, `vaul` (drawer), `embla-carousel-react`, `react-day-picker`, `input-otp`, `react-resizable-panels`, `date-fns` | — |
| Variant helpers | `class-variance-authority`, `clsx`, `tailwind-merge` (`cn()` in `src/lib/utils.ts`) | — |
| Database | Supabase (Postgres, RLS) via `@supabase/supabase-js` | 2.56 |
| Data fetching | TanStack Query (cache, optimistic updates) over the social repository in `src/lib/social/` | 5.x |
| Blockchain | thirdweb API v1 (REST, called from `src/utils/thirdwebAPI.ts`) | — |
| Auth | thirdweb email + 6-digit code. A server step (`supabase/functions/thirdweb-session`, Deno) verifies the thirdweb token and mints a 1-hour Supabase JWT; Postgres RLS keys off `auth.uid()` | — |
| Chains / tokens | Base (default, USDC), Ethereum (USDC/USDT), Polygon (USDC/USDT) | — |
| Lint | ESLint 9, `typescript-eslint`, react-hooks, react-refresh | 9.33 |
| Unit / component tests | Vitest 4 + jsdom + Testing Library (+ user-event) | 4.1 |
| End-to-end tests | Playwright (system Chrome locally, Chromium in CI) | 1.56 |
| CI | GitHub Actions: lint, typecheck, unit tests with coverage, build, e2e | — |
| Container | Docker multi-stage build, nginx 1.27 for production, Vite dev server for dev | Node 22 |
| Local backend | Supabase CLI local stack (Postgres, REST, auth, realtime) in Docker | — |

### Commands
```bash
npm run check       # lint + typecheck + unit tests (run before every commit)
npm test            # unit and component tests (Vitest)
npm run test:coverage
npm run test:e2e    # browser tests (Playwright); builds the app in demo mode itself
npm run test:rls    # database access rules; needs the local Supabase stack
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint
docker compose up -d --build app            # production image, http://localhost:${APP_PORT:-8080}
docker compose --profile dev up dev         # dev container with hot reload, :5173
npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,mailpit
```

### Environment (`.env`, see `env.example`)
`VITE_THIRDWEB_CLIENT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, per-chain USDC addresses and chain IDs, `VITE_DEFAULT_CHAIN_ID`, `VITE_AUTH_EXCHANGE_URL`, server-side `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` (used only by the session service), optional `VITE_TIPPING_MODE=mock|live` (default `mock`) and `VITE_SOCIAL_SOURCE=mock` (force the in-memory demo even when Supabase is configured). Vite inlines `VITE_*` values at build time, so the Docker image needs a rebuild after any change.

## Architecture

```
src/
├── routes/                 TanStack file routes (routeTree.gen.ts is generated, do not edit)
├── components/
│   ├── amixof/             shell (top bar, side nav, mobile bar), post, chat, tip dialog, multi-guest stage
│   ├── stablepay/          RequireAuth gate
│   ├── ui/                 shadcn components (+ TokenChainSelector)
│   ├── auth/ payments/ users/ transactions/   original StablePay screens
├── lib/                    tipping service, views, communities, multiguest reducer, composer, theme, utils
├── data/mock.ts            all AMIXOF demo content (no backend)
├── context/AuthContext.tsx auth state + localStorage persistence
└── utils/                  supabase.ts, thirdwebAPI.ts, contracts.ts
```

- **Real vs demo.** Real means stored in Supabase and shared between users; demo means sample content from `src/data/mock.ts` that resets on reload.

  | Area | Status |
  |---|---|
  | Login, wallet balance, payments, transaction history, user search | Real (thirdweb + Supabase) |
  | Profiles, **posts**, **reactions**, **bookmarks**, **follows**, post search | **Real** (tables `profiles`, `posts`, `reactions`, `bookmarks`, `follows`) |
  | Tips and gifts | Mock service by design (see Tipping); receipts kept in localStorage |
  | Reply threads and comment/repost counts | Demo: replies aren't saved (counts on sample posts are seeded numbers) |
  | Notifications (new followers, reactions on your posts), display name | **Real** (`listNotifications`, `users.display_name`); sample notifications only in the no-backend demo |
  | Communities, messages, blog, live rooms and stage, clips media, creator dashboard, admin, trending, categories, media library, reposts | Demo (`mock.ts`) or UI-only |
  | Video/audio playback, live streaming, view counts | Not real: images stand in for media, viewer numbers are simulated |

- **Social data layer** (`src/lib/social/`): components never touch Supabase for social data. They use hooks (`useFeed`, `usePost`, `useProfile`, `useCreators`, `useReact`, `useBookmark`, `useFollow`, `useCreatePost`, `useActor` in `hooks.ts`) over a `SocialRepo` interface with two implementations: `supabaseRepo.ts` (real) and `mockRepo.ts` (in-memory). `index.ts` picks Supabase when it's configured, the demo otherwise (or with `VITE_SOCIAL_SOURCE=mock`). Writes are optimistic and roll back by refetching on error. A signed-in StablePay user gets a `profiles` row on first use (handle from their username); signed-out visitors can read everything but get a "Sign in to …" prompt on any write.
- **Seed content:** `supabase/seed.sql` inserts the 7 sample creators and 7 sample posts (idempotent, flagged `is_demo`). Their follower and reaction totals are stored as baselines; real follows and reactions add on top. Apply with `npx supabase migration up` then `psql < supabase/seed.sql`, or `npx supabase db reset` on a fresh database (which also wipes users and transactions).
- **Access control** (migration `20251029010000_auth_rls.sql`, tested by `supabase/tests/rls-check.sh`): the database knows who is calling.
  - **Login flow:** the browser gets a thirdweb token, sends it to the `thirdweb-session` service (header `x-thirdweb-token`), which asks thirdweb (`GET /v1/wallets/me`) whether it is valid and who it belongs to, creates or finds the `users` row for that wallet with the service role, and returns a 1-hour Supabase JWT (`sub` = `users.id`) plus the caller's own user row. The client sends that JWT on every Supabase request and renews it before expiry. Nothing stored in the browser is trusted for identity: a forged token or a hand-edited `wallet_address` is rejected and cleared.
  - **Rules:** anyone can read posts, profiles, follows, reactions and the public user columns. `users.email` is private (column privilege). Only the sender and recipient can read a transaction, and only the sender can create or update it. You can only create, edit or delete your own posts, reactions, bookmarks and follows, and edit your own profile and username. Bookmarks are readable only by their owner. Users, `verified`, follower/reaction baselines and wallet addresses cannot be written by the client; sample creators cannot be edited by anyone through the API.
  - **Residual risks:** (1) transaction rows are reported by the sender's browser; nothing checks them against the chain or thirdweb, so a malicious sender could record a fake "confirmed" payment. Reconcile server-side before relying on history for anything financial. (2) The thirdweb token (about 30 days) lives in `localStorage`, so an XSS bug would expose it; there is no server-side logout or revocation. (3) The session service creates a user for any valid thirdweb login and allows any origin by default; set `ALLOWED_ORIGIN` in production and add rate limiting. (4) Hosted Supabase: the function signs with the project's legacy HS256 JWT secret; if the project uses asymmetric signing keys, minting needs updating.
  - **Run it:** locally the function runs as the `session` service in `docker-compose.yml` (`docker compose up -d session`, port 54330, `VITE_AUTH_EXCHANGE_URL`), because `supabase functions serve` failed to start its container on this machine. For hosted Supabase deploy the same file: `supabase functions deploy thirdweb-session`, `supabase secrets set THIRDWEB_CLIENT_ID=… JWT_SECRET=…`, and point `VITE_AUTH_EXCHANGE_URL` at `https://<project>.supabase.co/functions/v1/thirdweb-session`.
- **Tipping:** everything goes through `getTipService()` in `src/lib/tipping.ts`. The mock service stores receipts in localStorage. `createLiveTipService()` is a stub, so real tips are not implemented yet.

## Empty, loading and error states

Every screen that fetches or lists data handles all three cases with the shared components in `src/components/amixof/states.tsx`. Don't hand-write `<p>No …</p>` blocks or red error boxes.

| Case | Component | Rules |
|---|---|---|
| Nothing to show yet | `EmptyState` | Icon, one-line title, one sentence on what will appear or what to do. Add an `action` when there is an obvious next step (e.g. "Send a payment"). Empty is not an error: no red. |
| Loading a list | `SkeletonRows` | Placeholder rows shaped like the final rows, so the layout doesn't jump. `role="status"`, `aria-busy`, hidden "Loading…" label. |
| Loading a whole region | `LoadingState` | Spinner + label, `role="status"`. Used for session check and as the router's pending component (shows only after 400ms). |
| Failed to load | `ErrorState` | `role="alert"`, plain-language title ("Couldn't load your activity"), one reassuring sentence, and a **Try again** button wired to the real refetch. Never show raw status codes or stack traces. |
| Failed action (tip, payment, form submit) | toast or inline message next to the control | Say whether money moved ("Nothing was charged"). Keep the user's input. |
| Missing setup | `EmptyState` from `RequireAuth` | If `supabaseConfigured` is false (placeholder `.env`), payment pages show "StablePay isn't set up yet" and the rest of the site keeps working. Before this, an invalid Supabase URL crashed the whole app to a blank page. |
| Route crash / unknown URL | root `errorComponent` / `notFoundComponent` | "This page didn't load" with Try again and Go home; 404 page. |

Where they apply: Activity (skeleton, empty with "Send a payment", error with retry), Balance (skeleton, error with retry, no balances), User search (idle, no results, error with retry), session check, Home Following tab, Explore search, Bookmarks, Notifications (incl. Mentions), Messages, profile posts and community feed. Verified by hand: empty Activity, forced backend outage with recovery through Try again, and a build with empty Supabase variables.

## Routes

| Route | Page | Data | Auth |
|---|---|---|---|
| `/` | Home feed (For You / Following), composer | Supabase | reading no, writing yes |
| `/explore` | Search posts, creators to follow; trending and topics are demo | Supabase + mock | reading no, writing yes |
| `/bookmarks` | Saved posts | Supabase | yes |
| `/notifications` | New followers and reactions on your posts (real); sample alerts only in the no-backend demo | Supabase + demo fallback | yes |
| `/post/$id` | Post detail (replies not saved) | Supabase | reading no, writing yes |
| `/profile/$handle` | Profile, posts, follow, Tip button; streams tab is demo | Supabase + mock | reading no, writing yes |
| `/live`, `/live/$channel` | Live index and room (chat, tip, gift, multi-guest stage) | mock | no |
| `/clips` | Vertical video clips | mock | no |
| `/communities`, `/communities/$handle` | Communities and community chat | mock | no |
| `/blog`, `/blog/$slug` | Articles with discussion | mock | no |
| `/messages`, `/messages/$id` | DMs | mock | no |
| `/dashboard`, `/admin`, `/admin/media`, `/settings` | Creator dashboard, admin, settings | mock | no |
| `/wallet` | StablePay balance + tips & gifts history | real balance, tips from service | balance needs sign-in |
| `/pay` (`?to=username`) | Search → amount → confirm payment | Supabase + thirdweb | yes |
| `/activity` | Transaction history (realtime) | Supabase | yes |
| `/people` | User search | Supabase | yes |
| `/me` | Account, wallet address, sign out | Supabase | yes |

## UI

### Layout
- **Truthful UI rule:** a control may only claim success if it did the thing, and real users must never see invented data. Sample content exists only in the no-backend demo build and is labelled (e.g. wallet rows end with "(sample)"). Copy link copies, Gift records a tip receipt, Follow is the real follow. See `docs/design-audit.md`.
- **App shell** (`components/amixof/shell.tsx`): sticky 56px top bar (wordmark, search, notifications bell with a real unread count, theme toggle, then **Sign in** when signed out or Pay + account avatar when signed in; no links that repeat the side nav), collapsible left side nav on desktop (icon-only with tooltips from `md`, labels from `xl`, collapsed state remembered in localStorage), fixed bottom bar on mobile (Home, Explore, Live, Pay, More) where **More** opens a sheet with every destination.
- **Navigation rules:** `navGroups` in `shell.tsx` is the single nav config. Top bar, side nav, mobile bar and the More sheet all read it (`top` / `mobile` flags choose what shows where). Add a page there, not in each surface. Active state uses TanStack Link's `activeProps` (`aria-current="page"`, exact match only for `/`). The top-bar search submits to `/explore?q=`.
- **Widths:** wide pages are capped at 1600px. Social pages (feed, post, explore, notifications, bookmarks, profile, communities) are capped at 1264px, with a feed column of at most 600px and a 340px discovery rail from the `lg` breakpoint up.
- **Breakpoints:** Tailwind defaults. Side nav from `md` (768px, icon-only until `xl`), discovery rail from `lg` (1024px), mobile bottom bar below `md`. Below `lg` the 600px feed column is centered, not left-aligned.
- **Touch rules** (in `src/styles.css`, `pointer: coarse` only): every `a`, `button`, tab, radio, switch and checkbox gets an invisible hit area of at least 40×44px via `::after`, so dense controls (post actions, chips, switches) keep their look but are easy to tap. Text fields are forced to 16px so iOS Safari doesn't zoom on focus. Controls use `touch-action: manipulation` (no double-tap-zoom delay). The viewport meta has `viewport-fit=cover`, and the mobile bar and `main` add `env(safe-area-inset-bottom)` so the bar clears the iPhone home indicator. Don't set `position` or `::after` on controls in a way that fights these.
- **Verified:** no horizontal page overflow on 15 routes at 360px and 768px; all 344 interactive elements on 10 routes meet the 40×44px target with the touch rules on. Not verified on physical devices (see Known gaps).
- **Pages** use `SocialLayout` / `PageHeader` from the shell. StablePay pages use a centered `max-w-xl` or `max-w-3xl` container.

### Theme
- Dark by default. A boot script in `index.html` sets the `dark` class before first paint, and the choice is stored under the localStorage key `amixof-theme`.
- Colors are semantic tokens defined in `src/styles.css` (oklch) and mapped through `@theme inline`: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar-*`, `chart-1…5`, plus app tokens `surface`, `surface-2`, `brand`, `brand-strong`, `support`, `live`, `online`.
- Brand/primary is violet (hue ~293). `live` is red, `online` is green.
- Base radius is `0.5rem`.
- Fonts: **Manrope** 400–700 (body, UI, small labels) and **Space Grotesk** 700 (display), loaded from Google Fonts in `index.html`. Only those weights are requested, so don't use `font-semibold` or `font-medium` on an `h1`/`h2` (the display face has no 500/600).
- **Type scale** (validated by measuring computed styles on every route):

  | Role | Size / weight | Face | Where |
  |---|---|---|---|
  | Article title | 36px bold | display | `/blog/$slug` h1 |
  | Page title (wide pages) | 24px bold | display | `h1` on wallet, pay, activity, me, settings, dashboard, blog, live |
  | Social page bar title | 20px bold | display | `PageHeader` h1 (sticky bar on feed-style pages) |
  | Featured item title | 20px bold | display | blog lead, community name banner |
  | Section heading (social) | 18px bold | display | explore, live, blog list |
  | Section/card heading (wide pages), rail heading | 16px bold | display | settings, wallet, dashboard, pay, discovery rail |
  | Post title / body | 15px regular | body | feed posts |
  | Label heading (`h3`, overlines, chat titles) | 12–14px, medium/bold | body (`font-sans`) | not display face |
  | Meta / caption | 12px | body | timestamps, counts |

  Base layer sets `h1, h2` to the display face with `-0.01em` tracking; `h3` and small label headings stay in the body face. Money and counts use `tabular-nums`. Each page has exactly one `h1` (visually hidden with `sr-only` on Home, Clips and the live room).
- Use tokens in new UI (`bg-card`, `text-muted-foreground`, `border-brand`) rather than raw palette colors.

### Components
- shadcn components live in `src/components/ui/` and follow `components.json` (new-york, slate base, CSS variables, lucide icons).
- Tips and gifts use one shared `TipDialog` (`components/amixof/tip.tsx`). Gifts are Mic Drop $2, Fire $5, Crown $10, Rocket $25. Tips accept $1–$500, with $2/$5/$10/$25 presets.
- `ChatPanel` (`components/amixof/chat.tsx`) is the single chat used by live rooms, stages, blog, clips and communities.
- **StablePay screens:** use the shared primitives (`Button`, `Input`, `Card`/`cardVariants`, `Badge`, `Alert`, `ProfileAvatar`). The legacy `venmo-*` classes were removed. Status colours use the status token families (`success`, `warning`, `info`, `destructive`, each with `-subtle` and `-text`). Full reference: `docs/design-system.md`.
- **Shared conventions** (social and StablePay pages alike): utility pages (wallet, pay, activity, people, account, settings) use `PageContainer` (`src/components/amixof/page.tsx`: one 672px column) with an `h1.text-2xl.font-bold` title; one `h1` per page; section headings `font-bold`; flat cards `rounded-lg border bg-card p-5` (`cardVariants()`, no shadows); buttons and inputs from the control-height scale (`Button`, `Input`); `lucide-react` icons; hover state `hover:bg-surface-hover`.

### Accessibility

**Built in**
- **Page structure:** one `h1` per page, one `main`, every `nav`/`aside` labelled, `lang="en"`, a skip-to-content link that is the first Tab stop. Each route sets its own `<title>` (root route has the fallback), so titles are unique per page.
- **Route changes:** after navigation the new page title is announced through a polite live region and focus moves to `<main>` (`AppShell` in `shell.tsx`), so keyboard and screen-reader users start at the new content instead of staying on the link they clicked.
- **Keyboard widgets:** `src/lib/a11y.ts` gives every `role="tab"` and `role="radio"` control the standard pattern: arrow keys, Home/End, roving tabindex (only the selected item is a Tab stop). New tablists and radiogroups get it automatically; just use the roles.
- **Dialogs and sheets:** Radix traps focus, closes on Escape and hides the background. `useRestoreFocus` (in `a11y.ts`, used by `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`) returns focus to the button that opened them; Radix only does this for a `DialogTrigger`, and we open from state.
- **Focus ring:** one global `:focus-visible` 2px ring in the `--ring` token, on both themes. Don't remove outlines without replacing them.
- **Names and labels:** icon-only buttons have `aria-label`s; inputs have a `label` or `aria-label`; `aria-pressed` on toggles; form errors use `role="alert"`; chat is `role="log"` (not announced while the demo simulates traffic).
- **Contrast:** text meets WCAG AA (4.5:1, 3:1 for large text) in both themes on all 21 routes by the measured check below. Red used as text is the `live-text` token, not `live` (the badge background). Chart/accent colors are darker in the light theme.
- **Motion:** `prefers-reduced-motion` disables animations and transitions globally.
- **Touch:** see Touch rules under Layout.

**How it was verified (this is not a full audit)**
- A script of plain DOM checks run on 21 routes in dark and light: accessible names on links/buttons/inputs, labelled landmarks, one `h1` and one `<title>`, and text contrast computed from each element's resolved colors. Result: no findings. Limits: elements over gradients or images are skipped; large/bold thresholds are approximated; it can't judge meaning (alt text quality, label wording).
- Real key presses in Chrome: skip link, Tab order, arrow-key tabs, dialog focus trap, Escape, focus return to the opener, focus ring, and focus plus announcement on route change.

**Not verified: do these before calling the app accessible**
- Screen readers: VoiceOver (macOS and iOS Safari) and NVDA or JAWS with Chrome or Firefox. Check heading and landmark navigation, the route-change announcement, tabs, dialogs, the chat log, toasts, and the payment flow end to end.
- An automated engine such as axe-core or Lighthouse on every route (the plain-DOM script above is not a substitute; the project doesn't depend on one yet).
- Zoom to 200% and 400% (reflow), text-only zoom, Windows High Contrast / forced colors, and voice control.
- Video: `/clips` and the live room autoplay muted video with no captions or pause control. No captions exist for the demo media.
- Drag, swipe or pointer-only interactions, if any are added later, need keyboard alternatives.
- Real devices (TalkBack, iOS VoiceOver gestures, on-screen keyboard overlap).

## Testing

**Status when this was written:** 343 unit and component tests (about 3 seconds), 154 end-to-end tests (about 4 minutes), 36 database access checks. Line coverage 70% of `src/lib`, `src/utils`, `src/context`, auth, shell and shared components (reported by `npm run test:coverage`, not enforced). Everything passes.

Four layers, each catching a different kind of mistake. `.github/workflows/ci.yml` runs the first three on every push and pull request.

| Layer | Command | What it covers |
|---|---|---|
| Unit + component (Vitest, jsdom) | `npm test` | Pure logic and components in isolation, with the network and Supabase mocked. Fast (a few seconds). Files sit next to the code as `*.test.ts(x)`; shared setup in `src/test/`. |
| Browser end-to-end (Playwright) | `npm run test:e2e` | The real app in Chrome against a production build in **demo mode** (Supabase deliberately unconfigured: in-memory social data, payment pages show the setup message). Desktop and phone projects, plus a `signed-in` project that runs against a second build with a fake, fully stubbed Supabase so the signed-in StablePay screens can be tested. Responsive coverage and known gaps: `docs/responsive.md`. Accessibility: axe-core (WCAG 2.2 AA tags) on every route in both themes plus keyboard, focus, dialog, target-size and reduced-motion checks (`e2e/wcag.spec.ts`); conventions, manual verification steps and known gaps in `docs/accessibility.md`. No backend, accounts or secrets needed. External image hosts are blocked, so runs are hermetic and work offline. |
| Database access rules | `npm run test:rls` | Attacks the local Supabase API as one user against another, as an anonymous visitor, and with an expired token; every "CANNOT" must be rejected. Run after any policy or grant change. In CI it is a manual job (Actions > CI > Run workflow) and has not been run on GitHub yet. |
| Source guards | part of `npm test` (`src/test/privacy.test.ts`) | Fails the build if code selects `*` from `users` (would leak `email`), puts the thirdweb token in a URL, or reads identity from the browser-stored wallet address. |

**What the unit tests cover:** tipping rules and the mock service; token amount math (`formatTokenAmount`/`parseTokenAmount`, round-trips, precision); the thirdweb API client (URLs, headers, request bodies, 402 insufficient funds, status mapping, partial failures when refreshing pending payments); the session exchange and `AuthContext` (restore, forged token, spoofed wallet address, transient failure vs rejection, login, logout, token renewal and retry); the login and username forms (including a bug the tests found: stale username-availability answers overwriting the current one); `RequireAuth` states; the social repository (the real Supabase one against a fake client, and the in-memory demo one); the data-layer hooks (optimistic updates, signed-out write guard, failed writes); the keyboard module and focus restoration; `PostCard`, `ReactionBar`, `Composer`, `TipDialog`, `FollowButton`, the shared empty/error/loading components; the navigation config; and that every route resolves.

**What the end-to-end tests cover:** feed, skip link, navigation, titles, focus and announcement on route change, search, tabs with arrow keys, react/bookmark/follow/post, tipping and its wallet history, dialog focus trap and focus return, the payment-pages setup state, theme persistence, the phone layout (bottom bar, More sheet, tap sizes, no horizontal scroll on 16 pages, 16px inputs), and structural accessibility checks (one `h1` and `main`, one unique `<title>`, labelled landmarks, named controls, alt text, no duplicate ids) on 23 pages in dark and light.

**Writing tests here**
- Mock at the module boundary (`vi.mock("@/utils/supabase")`, `vi.stubGlobal("fetch", …)`); use `vi.hoisted` for anything the mock factory references. `src/test/fakeSupabase.ts` is a chainable fake client that records calls and answers from per-table queues.
- Prefer queries by role and accessible name (`getByRole("button", { name: … })`): they test what users and assistive tech see, and double as accessibility checks.
- Reset module state between tests when a module keeps singletons (`vi.resetModules()`, as in `mockRepo.test.ts`).
- When fixing a bug, write the test first and watch it fail (red), then fix it (green).
- A guard that never fails is worthless: when adding one, plant a violation once and confirm it goes red.

**What is not tested (be careful relying on this suite for these)**
- Real login and real payments end to end: thirdweb emails a code and moving funds needs a funded wallet, so neither can run unattended. The pieces around them (API client, session exchange, auth state, forms, policies) are covered; the live integration is not. Test it by hand before releases.
- The session service itself (`supabase/functions/thirdweb-session`) has no automated test of its own; it was checked by hand against the real thirdweb API and its rejection paths.
- Components with little or no coverage: the live stage (`multiguest.tsx`, ~2%), live chat (`chat.tsx`), `UsernameSetup` rendering details, and the route pages themselves (covered only through the e2e flows above, not in isolation).
- No visual regression, load, or cross-browser tests (only Chrome/Chromium; no Safari or Firefox), and no real-device testing.
- No screen-reader or axe-core run; the accessibility checks are structural only.
- Coverage is reported (`npm run test:coverage`) but not enforced; there is no minimum threshold yet.

## Known gaps
- Comments/replies, reposts, communities, messages and notifications are not stored yet; they are the next candidates to move into the social repository.
- Posts support text only. Image, video and audio attachments need file storage (Supabase Storage) and a media player; live video needs a streaming provider.
- Follower counts are computed by counting follow rows in the client, which is fine for a demo but should become a SQL count or view at scale. The feed is not paginated (latest 50).
- Live tipping is not implemented; `VITE_TIPPING_MODE=live` currently throws.
- Responsive checks used fixed-width frames and simulated touch rules in desktop Chrome. Real iOS Safari / Android Chrome (safe-area insets, keyboard overlap, rotation, pinch-zoom) has not been tested.
- Changes made in Lovable do not sync back; they must be ported manually.
