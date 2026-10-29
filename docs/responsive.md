# Responsive behaviour

Audited at 320, 375, 390, 768, 1024, 1440 and 1920 CSS px, plus landscape phones (667×375, 844×390). Mobile-first: phone layout is the base, everything wider is additive.

## Breakpoints and what changes
| Width | Shell | Discovery | Notes |
|---|---|---|---|
| < 768 | Top bar + **bottom bar** (Home, Explore, Live, Pay, More) | "Live now" strip above the feed (swipe) | Pay button and sidebar hidden; More sheet holds every destination |
| 768–1023 | Top bar + **72px icon rail** (no bottom bar) | Live now strip | Brand shows the "A" mark only (the rail slot is 72px) |
| 1024–1279 | Icon rail | **Rail returns** (340px: Live now, Trending); strip hides | Feed 600px, centred container ≤ 1264px |
| ≥ 1280 | **244px labelled sidebar** (collapsible to the icon rail) | Rail | Wordmark text shows; on social pages collapsing doesn't move the feed |
| 1920 | Same as 1280; container stays ≤ 1264px (social) / 1600px (wide pages) | | Space beyond is margin, not stretched content |

## Mobile behaviours
- **Safe areas:** bottom bar height is `3.5rem + env(safe-area-inset-bottom)` with left/right insets as padding; `main` reserves the same space so nothing hides behind it. `viewport-fit=cover` is set. The More sheet pads its end by the bottom inset. The top inset is not handled (only matters for installed/standalone PWAs).
- **Keyboard:** `useKeyboardOpen()` (shell.tsx) hides the bottom bar while a text field is focused and the visual viewport has shrunk by more than 120px, so the field gets the room. The viewport meta also sets `interactive-widget=resizes-content` (Chrome/Android resizes the layout viewport, so `dvh`-based panels follow the keyboard).
- **Sticky headers and focus:** `html` has `scroll-padding-top: 6.5rem` (56px top bar + 48px page header) and a bottom padding for the bar, so focused fields and anchors scroll clear of both. Stacked sticky bars use explicit offsets (top bar 0, page header `top-14`, community tabs `top-[6.5rem]`).
- **Scroll position:** TanStack Router `scrollRestoration` is on; going into a post and back returns to the same offset (tested).
- **Touch targets:** coarse pointers get an invisible 40×44px hit area on every button, link, tab, radio and switch (`::after` in `styles.css`) without changing visuals. Text inputs are ≥ 16px so iOS doesn't zoom.
- **Landscape phones ≤ 500px high:** the bottom bar drops to 48px. At ≥ 768px wide (large phones in landscape) the md layout applies: icon rail, scrolling on its own, no bottom bar.
- **Dialogs, sheets, menus:** dialogs and alert dialogs are `max-h: 100dvh − 1rem`, `max-w: 100vw − 1rem` and scroll inside; the bottom sheet is ≤ 90dvh, scrolls, and pads the bottom inset; dropdowns and popovers use 8px collision padding, are capped to the viewport width, and the popover caps its height to the available space.
- **Long content:** names, handles, emails and wallet strings truncate in `min-w-0` containers; post text and titles use `wrap-anywhere`; the post header keeps the time visible.

## Changes made in this pass
- Brand block no longer clips at 768–1279px (text hidden where the slot is 72px, including collapsed).
- Top bar at 320px: shorter search placeholder; theme toggle hidden below 400px while signed out (still in Settings and the account menu).
- Live now strip (new) so the rail's most useful content exists below 1024px.
- Keyboard-aware bottom bar; compact bar in short landscape; scroll-padding for sticky bars.
- Dialog / alert dialog / sheet / popover / dropdown bounds (above).
- Community tabs sat *under* the page header when scrolled; they now stick below it. They also fit at 320px (`px-2.5`).
- Long display names and usernames overflowed `/me`, the pay form, user search and the payment confirmation at 320–390px; they now truncate.
- Live room "Stage mode" label hidden below 640px so the toolbar doesn't wrap.

## How it is tested
- `e2e/responsive.spec.ts`: 25 routes × 7 widths (no horizontal scroll, no clipped elements, no text overflow, bottom bar never covers content); dialogs on 320×568, 667×375, 844×390; menus inside the viewport; landscape and rotation; rail and sidebar widths per breakpoint; touch (tap, hit areas ≥ 40×44, swipe strip, scroll restoration, focused field vs sticky bars); stacked sticky bars.
- `e2e/signedin.spec.ts`: the signed-in StablePay screens (`/pay`, `/pay?to=…`, `/wallet`, `/activity`, `/people`, `/me`, `/settings`) at all widths with a very long display name and username, plus the small-phone pay form and account menu. Runs against a second build with a fake, fully stubbed Supabase and session service (port 4190).
- `e2e/shell.spec.ts`, `e2e/mobile.spec.ts`, `e2e/typography.spec.ts`; unit tests for `useKeyboardOpen` with a mocked `visualViewport`.

## Unresolved edge cases
- **Real devices not tested.** Everything above ran in desktop Chrome with touch and viewport emulation. iOS Safari's keyboard and address-bar behaviour, notches and the home indicator, Android gesture navigation, and genuine multi-touch are unverified. The keyboard logic is unit-tested against a faked `visualViewport` only.
- **iOS keyboard + fixed elements:** without `interactive-widget` support (Safari ignores it) the visual viewport shrinks while the layout viewport doesn't; the bar hides, but `dvh`-sized panels (live chat) may sit partly under the keyboard.
- **Top safe area** (standalone PWA status bar) is not handled.
- **Clips** (full-screen vertical video) uses the same bars and hasn't been tuned for browser toolbars collapsing mid-scroll.
- **Multi-guest stage** at 320px shows nine tiles in a 2-column grid; tiles are small and overlay text is cramped.
- **Screens above 1920px** and browser zoom ≥ 200% weren't audited.
- The hit-area check measures the generated hit box; adjacent small controls (post reaction pills) have overlapping hit areas by design and may still mis-tap with large fingers.
- Community tabs scroll horizontally if a label grows (e.g. a long join-request count on Members).
