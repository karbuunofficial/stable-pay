# AMIXOF design system

Violet brand, dark-first, Manrope for text and Space Grotesk for display. Tokens live in `src/styles.css`; components in `src/components/ui/`. The living reference is the public route **`/design-system`** (toggle light/dark there). Screenshots of both themes: `docs/design-system/{dark,light}-*.jpg`.

Guard rails: `src/test/tokens.test.ts` (token completeness and WCAG AA contrast, both themes), `src/test/design-system.guard.test.ts` (no raw palette, arbitrary sizes, `venmo-*`, hand-sized avatars, stray shadows), `src/components/ui/primitives.test.tsx` (component contracts).

## Principles
1. **Semantic tokens only.** Components use `bg-card`, `text-muted-foreground`, never `bg-zinc-900` or `#fff`.
2. **Depth from tone, not shadow.** Layers are page `background` < `card`/`surface` < `surface-2` (raised/inputs) < `surface-hover` < `surface-active`. Shadows only on floating layers (menus, dialogs, toasts).
3. **Restrained colour.** Violet is for the primary action, active state and links. Status colours appear as a quiet tint plus a readable text token. No gradients or glows.
4. **One signal is never colour alone.** Active tabs have an indicator bar and heavier weight; status badges carry icons or text.

## Token reference
Values are `oklch`. Light / Dark.

### Surfaces and borders
| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | .985 0 0 | .141 .004 286 | Page |
| `card` / `surface` / `popover` | 1 0 0 | .21 .006 286 | Cards, panels, menus |
| `surface-2` | .967 .001 286 | .274 .005 286 | Inputs, chips, skeletons, secondary buttons |
| `surface-hover` | .955 .002 286 | .25 .005 286 | Hover on rows, ghost buttons, menu items |
| `surface-active` | .93 .003 286 | .3 .006 286 | Pressed |
| `border` / `input` | .871 .005 286 | .37 .012 286 | Dividers, control outlines |
| `overlay` | ink 50% | black 60% | Dialog / sheet scrim |
| `ring` | .491 .241 293 | .709 .159 293 | Focus ring (≥3:1 on all surfaces) |

### Text hierarchy
| Token | Role |
|---|---|
| `foreground` | Primary text, headings |
| `support` | Highest-emphasis text on `surface-2` in dark (inverse tone) |
| `muted-foreground` | Secondary text, metadata, placeholders (AA on card and surface-2) |
| `brand` | Links, selected labels (light .491, dark .76 for contrast) |
| `primary-foreground` | Text on `primary` |

### Brand
`primary` (.541 .247 293, same in both themes, fills buttons), `brand` (text/links), `brand-strong` (hover), `brand-subtle` (8–9% tint behind selected items).

### Status
Each family has four tokens: solid fill, `-foreground` on the fill, `-subtle` tint background, `-text` for text on the tint or page.
| Family | Light fill | Dark fill |
|---|---|---|
| `success` | .52 .14 150 | .72 .17 150 |
| `warning` | .78 .16 75 | .82 .15 80 |
| `info` | .52 .17 250 | .72 .14 245 |
| `destructive` | .577 .245 27 | .577 .23 25 |
Also `live` (LIVE badge, with `live-foreground`, `live-text`) and `online` (presence dot).
**Rule:** `text-destructive` is never used for text; use `text-destructive-text`.

### Elevation
`shadow-xs/sm/md/lg` map to `--elevation-*` (light: soft ink; dark: heavier black). Use `shadow-md` for menus and popovers, `shadow-lg` for dialogs. Everything else is flat.

### Radii
Base `--radius: .5rem`. Roles: `rounded-control` (buttons, inputs, menu items), `rounded-card` (cards, panels), `rounded-overlay` (dialogs, sheets), `rounded-full` (avatars, pills, badges).

### Spacing
Tailwind's 4px scale, with these conventions: card padding `p-4`; page gutters `px-4` (mobile) / `px-6`; stack gaps `space-y-3` in lists, `space-y-6` between sections; inline icon gap `gap-2`.

### Control heights
`h-control-xs` 24 · `sm` 32 · `md` 36 (default) · `lg` 40 · `xl` 48 px. Coarse pointers get a 44px hit area through global hit-slop without changing the visual size. Mobile text inputs are ≥16px so iOS doesn't zoom.

### Avatar sizes
`size-avatar-xs` 24 · `sm` 32 · `md` 40 (default) · `lg` 56 · `xl` 80 px. Use `ProfileAvatar` (image, falls back to a bold initial scaled to the size).

### Typography roles
Manrope carries all interface and content text. Space Grotesk (700) is reserved for page titles, section headings and big numbers (`type-display/stat/title/heading` and the wordmark). Weights: 700 only on display roles and tiny badges, 600 on names and card titles, 500 on controls, 400 on reading text and metadata. `th`, `b` and `strong` default to 600.

| Utility | px / weight | Use |
|---|---|---|
| `type-display` | 30 / 700 display | Article title, sign-in hero (one per page, never in feeds) |
| `type-stat` | 24 / 700 display, tabular | Dashboard stats, balances |
| `type-title` | 20 / 700 display | Page title (`h1`), sticky bar title, profile and community name |
| `type-heading` | 16 / 700 display | Section heading (`h2`) |
| `type-subheading` | 15 / 600 | Card title, post title, list item title |
| `type-author` | 15 / 600 | Author and person names in posts and lists |
| `type-body` | 15 / 400, 24px leading | Post, comment and article text |
| `type-ui` | 14 / 500 | Buttons, form labels, menu items |
| `type-meta` | 13 / 400 muted | `@username`, timestamps, secondary lines |
| `type-caption` | 12 / 400 muted | Counts, helper text, table headers |
| `type-overline` | 12 / 600 caps muted | Group labels |
Helpers: `measure` (65ch cap for long-form), `wrap-anywhere` (user content: long URLs and unbroken strings wrap instead of overflowing). Only these sizes may appear on screen (10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 30px); `e2e/typography.spec.ts` checks every page at 320 and 1280px. Don't combine a `type-*` role that sets a colour (`type-meta`, `type-caption`, `type-overline`) with another `text-<colour>` class on the same element: use `text-xs text-muted-foreground` plus the state colour instead.

**Identity row (posts, comments, lists):** `[name type-author, truncates at 60%] [badge] [@handle type-meta, truncates] · [time type-meta, never wraps]`. Usernames and names always sit in `min-w-0` containers with `truncate`.

### Vertical rhythm
4px grid. Page column (`PageContainer`): `px-4 py-5`, sections `space-y-5`. Cards `p-4`, card sections `space-y-3`/`space-y-4`. Form: label `type-ui mb-1.5`, fields `space-y-4`, helper text `mt-1 type-caption`. Feed posts `px-4 py-3`; list rows `px-4 py-3`; sticky bars `h-12`. Dialogs keep `p-4`/`p-5`.

### Density
Default density is comfortable (md controls, card padding `p-4`). Dense contexts (tables, chat rows, toolbars) use `sm` controls and `xs/sm` avatars. Never mix sizes within one row.

## Components and examples
```tsx
<Button>Save</Button>                              {/* primary */}
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive" loading={busy}>Delete</Button>
<Button asChild><Link to="/pay">Pay</Link></Button>
<Button size="icon" aria-label="Close"><X /></Button>
<Button shape="pill" size="sm">Follow</Button>
```
Variants `default | secondary | outline | ghost | subtle | destructive | link`; sizes `xs | sm | default | lg | xl | icon-sm | icon | icon-lg`. `loading` disables the button, sets `aria-busy`, and shows a spinner.

```tsx
<Input aria-label="Name" size="lg" aria-invalid={!!error} />
<Card className="p-4">…</Card>                      {/* or cn(cardVariants({ interactive: true }), "p-4") */}
<Badge variant="success">Confirmed</Badge>          {/* default brand secondary outline success warning info destructive live */}
<Alert variant="destructive"><AlertCircle aria-hidden /><AlertDescription>…</AlertDescription></Alert>
<Skeleton className="h-4 w-1/2" />
<TabBar label="Feed" tabs={tabs} value={v} onChange={setV} sticky />   {/* variant="pill" for filters */}
<ProfileAvatar src={url} name="Kay" size="lg" />
```
Menus (`dropdown-menu`, `context-menu`, `menubar`, `select`, `popover`, `command`), dialogs (`dialog`, `alert-dialog`, `sheet`, `drawer`) and `tooltip` share the popover surface, `rounded-card`/`rounded-overlay`, `bg-overlay` scrim and `focus:bg-surface-hover` items. Errors use `Alert` with `role="alert"`; all other alerts are `role="status"`.

## Inventory of migrated components
**Primitives rewritten:** button, input, textarea, card, badge, alert, skeleton, tooltip, avatar, tabs; new `tab-bar`. **Flattened/retokened:** dropdown-menu, context-menu, menubar, select, popover, hover-card, command, navigation-menu, dialog, alert-dialog, sheet, drawer, checkbox, radio-group, input-otp, toggle, slider, switch, form, TokenChainSelector.
**App code migrated:**
- Payments: SendPayment, BalanceDisplay, PaymentConfirm (funding modal now a `Dialog`, errors are `Alert`s), TransactionHistory (status `Badge`s), UserSearch.
- Auth: LoginForm, UsernameSetup.
- AMIXOF: shell, post, follow-button, profile-avatar (17 hand-sized avatars → `ProfileAvatar`), multiguest, chat.
- Routes: index, notifications, profile, post.$id, admin.media, settings, pay, people, bookmarks, me, tip, wallet, messages, communities, explore, live, clips, blog, `__root`.
**Removed:** all `venmo-button/card/input/avatar` CSS and usages (45), page glow and wordmark gradients, body background image, hand-sized avatars (6 patterns), arbitrary font sizes (29), `hover:bg-accent` (70 → `hover:bg-surface-hover`), `text-destructive` text (25 → `text-destructive-text`).
**Added:** status/elevation/control/avatar tokens, type-role utilities, `/design-system` route, 3 test suites.

## Deferred (known deviations)
- Multiguest helper buttons and the blog play-overlay button keep custom styling (drawn over media).
- Clips uses white text and a dark scrim over video; this is intentional.
- Tip dialog amount/gift preset toggles are still bespoke.
- Settings theme previews use fixed swatches by design.
