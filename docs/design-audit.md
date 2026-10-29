# AMIXOF × StablePay: design and engineering audit

Branch `amixof-layout`. Method: every screen was captured in a real browser (desktop 1280×800 dark, phone 390×844, light theme for a sample), then read against the source. Screenshots live in `docs/audit/`: `d-*` desktop before, `m-*` phone before, `l-*` light before, `a-*` after.

Signed-in payment screens (balance, send, confirm, activity with data) can't be driven by automation because login emails a code, so those were reviewed from source and earlier manual captures, not re-photographed for this audit.

**Severity:** *Critical* = the UI claims something untrue or mishandles money or identity. *High* = a visible hierarchy or usability defect on a main screen. *Medium* = inconsistency or polish that costs credibility. *Low* = backlog.

## Summary

The structure is sound: an X-style three-column shell, good dark theme, clear type scale, real data on the core feed. The biggest problems were not visual. Several controls pretended to work (a Gift button that toasted "sent", a Copy link that didn't copy, Follow buttons that forgot on reload), and several screens showed invented data to real users (sample payouts in the wallet, "Jordan Reyes" in settings, fake notifications and a hard-coded "3" badge). After those, the main design issues were chrome duplication in the top bar, control clutter in the live room, a crowded post action row, and inconsistent page widths.

## Findings

| ID | Sev | Finding | Where | Evidence | Fix | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| F1 | Critical | Wallet lists invented financial history (a "Payout · Bank ••4821", received tips and gifts) to every user, including signed-in ones with a real balance. | `src/routes/wallet.tsx` | `d-wallet.jpg` | Pure `buildWalletRows` (`src/lib/walletHistory.ts`): sample rows only when no backend is configured, each labelled "(sample)"; connected apps list only the user's own tips/gifts with an empty state. | No row without a user action when Supabase is configured; demo rows say "(sample)". | **Fixed** · `walletHistory.test.ts`, `polish.spec.ts` |
| F2 | Critical | Settings edits a hard-coded demo identity ("Jordan Reyes"); Save only toasts. Notification toggles forget on reload. | `src/routes/settings.tsx` | `d-settings.jpg` → `a-d-settings.jpg` | Binds to the signed-in user; Save writes `users.display_name` and the social profile name, then refreshes caches. Signed-out shows a sign-in prompt. Notification preferences persist locally and say so. | Signed-in user sees their own name; Save persists (verified in DB); signed-out sees a prompt, not someone else's name. | **Fixed** · `supabaseRepo.test.ts`, `polish.spec.ts` |
| F3 | Critical | Notifications are invented for everyone ("Chain Rhymes tipped you $5.00") and the bell always shows a hard-coded "3". | `src/routes/notifications.tsx`, `shell.tsx` | `d-notifications.jpg` → `a-d-notifications.jpg` | Real notifications from the database (new followers, reactions on your posts) via the social repository; sample data only in the no-backend demo. Bell shows an unread count only when something is newer than your last visit. | Real user sees only real events; badge disappears after opening the page; empty state when nothing happened. | **Fixed** · `supabaseRepo.test.ts`, `unread.test.ts`, `polish.spec.ts` |
| F4 | Critical | Post "Gift" toasted "Gift sent · Mic Drop $2.00" without sending or recording anything. | `src/components/amixof/post.tsx` | source | Opens the real gift dialog (the same tip service as everywhere else); receipt appears in the wallet. | Gift from a post creates a receipt; no success message without one. | **Fixed** · `post.test.tsx`, `polish.spec.ts` |
| F5 | Critical | "Copy link" toasted "Link copied" and "Share" toasted "Share sheet opened" without doing either. | `post.tsx` | source | `src/lib/share.ts`: real clipboard write with fallback, system share sheet when present, honest error toast on failure. | Clipboard contains `/post/<id>`; failure says so. | **Fixed** · `share.test.ts`, `post.test.tsx`, `polish.spec.ts` |
| F6 | High | Follow on Clips only toggled local state (lost on reload, unrelated to profile Follow). | `src/routes/clips.tsx` | source | Uses the shared `FollowButton` with the author's real profile. | Following from a clip is reflected everywhere and persists. | **Fixed** · `polish.spec.ts` |
| F7 | High | Top bar repeats the sidebar (Home/Live/Clips/Blog) and, signed out, shows two controls to the same place ("Sign in" and a generic avatar). Wordmark is a gradient. | `shell.tsx` | `d-home.jpg` → `a-d-home.jpg` | Removed the repeated links; one primary **Sign in** when signed out; Pay + avatar when signed in; flat wordmark. | One sign-in control; no navigation landmark in the header. | **Fixed** · `polish.spec.ts` |
| F8 | High | Explore shows the same Trending list twice (main column and right rail). | `explore.tsx`, `shell.tsx` | `d-explore.jpg` → `a-d-explore.jpg` | Rail takes `hideTrending`; Explore uses it. | One Trending heading on the page. | **Fixed** · `polish.spec.ts` |
| F9 | High | Live room stacks four rows of controls over the video, including a "Demo: view as Viewer/Host" switch and "Simulate network" that exist only to preview the demo. | `multiguest.tsx`, `live.$channel.tsx` | `d-live-room.jpg`, `m-live-room.jpg` → `a-d-live-room.jpg`, `a-d-live-demo-menu.jpg` | One stage toolbar (layout + stage mode); all demo-only controls in one labelled **Demo controls** menu. Behaviour unchanged. | No standalone demo controls on the stage; Solo ↔ Multi-guest still works. | **Fixed** · `polish.spec.ts` |
| F10 | High | Clip action counts ("18.4K", "612") are unreadable over bright footage on phones. | `clips.tsx` | `m-clips.jpg` → `a-m-clips.jpg` | Text shadow plus a dark edge scrim behind the rail on phones. | Counts legible over a near-white background (checked visually). | **Fixed** |
| F11 | High | Post action row has 11 controls (3 reactions, add, views, comments, repost, gift, link, bookmark, share). | `post.tsx` | `d-home.jpg` → `a-d-home-menu.jpg` | Comments, repost, bookmark and one **More** menu (gift, copy link, share). | Row shows ≤ 4 icon actions plus reactions; the rest in the menu. | **Fixed** · `polish.spec.ts` |
| F12 | Medium | Utility pages use different widths and spacing (wallet/pay/me 768px, settings 672px, others full width). | `routes/{wallet,pay,activity,people,me,settings}.tsx` | `d-settings.jpg` vs `d-wallet.jpg` | `PageContainer` (`src/components/amixof/page.tsx`): one 672px column, same gutters and spacing. | Settings and wallet render the same width (checked in e2e). | **Fixed** (pay/people/activity/me adopt it once signed in) |
| F13 | Medium | Notification rows are ~100px tall: icon, avatar, then text stacked. | `notifications.tsx` | `d-notifications.jpg` | One row: avatar with the type icon as a badge, text beside it. | Row ≤ 72px; icon not a separate column. | **Fixed** |
| F14 | Medium | Decorative effects: purple page glow behind the whole app, gradient wordmark. | `styles.css`, `shell.tsx`, `live.index.tsx` | `l-home.jpg` | Removed both. | `body` has no background image. | **Fixed** · `polish.spec.ts` |
| F15 | Medium | Disabled buttons are a faded violet with unreadable text (Post, Send Code). | `styles.css`, `post.tsx` | `d-pay-login.jpg` | Neutral surface + muted text, one rule for `.venmo-button` and the composer. | Disabled label contrast is legible. | **Fixed** |
| F16 | Medium | Theme options are two blank rectangles. | `settings.tsx` | `d-settings.jpg` | Mini preview of each theme. | Each option shows its colours. | **Fixed** |
| F17 | Medium | Dashboard chart shows bars with no values. | `dashboard.tsx` | `d-dashboard.jpg` → `a-d-dashboard.jpg` | Value above every bar; chart's accessible name now lists all values. | Values visible and announced. | **Fixed** |
| F18 | High | **Repost** only increments a local counter (not stored, not shared). | `post.tsx` | source | Needs a `reposts` table and policies, or removal of the control. | Reposts persist per user, or the control is gone. | **Open** |
| F19 | Medium | Replies, messages, communities, live broadcasts and the right rail's live/trending lists are demo content. | various | `d-messages` etc. | Move into the social repository like posts (comments first). Until then every demo surface is labelled. | Real users never see invented content on a screen that isn't labelled. | **Open** (documented in `TECH_STACK.md`) |
| F20 | Low | /live category tiles use unrelated random photos with mixed borders. | `live.index.tsx` | `d-live.jpg` | Uniform tiles keyed to the category. | Tiles look intentional. | **Open** |
| F21 | Low | Design-token drift: 29 one-off font sizes (`text-[10px]`, `[11px]`, `[15px]`), mixed radii (`rounded` 40×, `rounded-md` 70×, `rounded-lg` 39×) and control heights (h-7/8/9/10). | many | counts from source | Map to the type scale and a 3-step radius/height scale; enforce with lint. | No arbitrary font sizes outside the documented scale. | **Open** |
| F22 | Low | Sidebar has 14 items plus channel lists; Settings sits below the fold at 800px. | `shell.tsx` | `d-home.jpg` | Collapse payments/account into sections, or pin Settings. | All primary items visible at 800px or a clear scroll cue. | **Open** |

## What changed, in reviewable batches

1. **Truthful behaviour** (F1–F6, F11): wallet rows, real settings, real notifications and unread badge, real gift/copy/share, real Follow on Clips, compact post actions. New: `lib/share.ts`, `lib/walletHistory.ts`, `lib/unread.ts`; repository gained `listNotifications` and `updateProfile`.
2. **Shell hierarchy** (F7, F8, F14, F15): single sign-in control, no repeated navigation, flat wordmark, no page glow, Explore without duplicate Trending, legible disabled buttons.
3. **Screen polish** (F9, F10, F12, F13, F16, F17): live-room toolbar, Clips scrim, `PageContainer`, notification rows, theme previews, dashboard values.

Routing, authentication, payment behaviour and data integrations were preserved. Nothing was replaced with a mock; where a screen showed invented data to real users, that data is now limited to the demo build and labelled.

## Verification

| Check | Result |
|---|---|
| `npm run build` | passes |
| `npm run lint` | 0 errors, 14 warnings: 13 are `react-refresh/only-export-components` (shadcn files and route files that export variants or `Route` beside components) and 1 is an `exhaustive-deps` note in `components/amixof/tip.tsx` (the `list` array). None come from this work. |
| `npm run typecheck` | passes |
| `npm test` (Vitest) | 343 tests pass |
| `npm run test:e2e` (Playwright, desktop + phone) | 154 tests pass |

New tests added by this work: `share`, `walletHistory`, `unread`, repository notifications and `updateProfile`, the post More menu, and `e2e/polish.spec.ts` (top bar, honest wallet and settings, real gift and copy, live room toolbar, container width, no page glow).

## Remaining risks

- Visual review of signed-in payment screens was done from source and earlier captures, not re-photographed.
- Light theme was only re-checked on the home screen.
- Real-device and screen-reader testing are still outstanding (see `TECH_STACK.md`, Testing).
