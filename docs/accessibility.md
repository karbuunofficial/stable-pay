# Accessibility (WCAG 2.2 AA)

Target: WCAG 2.2 level AA. Automated checks run in CI; the manual checklist below covers what automation can't (it finds roughly a third of real issues).

## Automated coverage
| Check | Where |
|---|---|
| axe-core (WCAG 2.0/2.1/2.2 A + AA + best practice) on all 25 routes in dark and light, plus open overlays (reaction picker, post menu, tip dialog, mobile More sheet, composer with text, tab states) | `e2e/wcag.spec.ts` |
| Skip link first in tab order, visible, moves focus to `main` | `e2e/wcag.spec.ts`, `e2e/home.spec.ts` |
| Every tab stop on the feed has a ≥2px focus indicator (on the control or the wrapper that draws it) and isn't hidden behind the sticky top/bottom bars (2.4.7, 2.4.11), desktop and phone | `e2e/wcag.spec.ts` |
| Dialog: focus moves in, Tab/Shift+Tab never leave, Escape closes, focus returns to the trigger, has a name and description | `e2e/wcag.spec.ts` |
| Menu: Radix menu semantics, ArrowUp/Down/End, Escape returns focus | `e2e/wcag.spec.ts` |
| Mobile More sheet: trap, Escape, focus restore | `e2e/wcag.spec.ts`, `e2e/mobile.spec.ts` |
| No clickable article: posts are opened through a real link | `e2e/wcag.spec.ts` |
| Target size 2.5.8: every control ≥ 24×24 CSS px on every page; touch devices get a 40×44 hit area | `e2e/wcag.spec.ts`, `e2e/responsive.spec.ts` |
| Reduced motion: no animation or transition > 10ms, no smooth scrolling | `e2e/wcag.spec.ts`, `e2e/a11y.spec.ts` |
| Announcements: toasts in a polite live region, route changes announce the page title | `e2e/wcag.spec.ts` |
| Icon-only controls named; toggles keep one name while pressed | `e2e/wcag.spec.ts` |
| Landmarks, one `h1`, unique titles, names on controls | `e2e/a11y.spec.ts` |
| Colour contrast of every token pair, both themes; focus ring ≥ 3:1 | `src/test/tokens.test.ts` (plus axe on rendered pages) |
| Validation semantics on the sign-in and username forms (`aria-invalid`, `role="alert"` errors) | `src/components/auth/*.test.tsx` |

Run: `npx playwright test e2e/wcag.spec.ts --project=desktop`.

## Conventions (what the code does)
- **Names.** Icon-only controls carry `aria-label`. Where a control shows text or a count, its name contains that text (WCAG 2.5.3): `Repost, 61`, `Like, 1.2K`, `Following Kaydence`, `Notifications` + sr-only `, 7 unread`. No `aria-label` on a link whose visible text differs; use sr-only text instead.
- **Toggles don't rename.** Bookmark, Repost, Like, Save keep one label and set `aria-pressed`. Follow shows its state as text (`Follow` / `Following`).
- **Real controls.** No clickable `div`s. A post card's click-anywhere behaviour is a pointer shortcut; the keyboard and screen-reader route is the timestamp link (`Open post, 4m`).
- **Focus.** One global `:focus-visible` ring (2px, offset 2). Fields with a bordered wrapper use `field-shell` (`:focus-within` ring). Never `outline-none` without a replacement ring. Route changes move focus to `main` and announce the title.
- **Overlays** are Radix (Dialog, Sheet, DropdownMenu, Popover, Tooltip): focus trap, Escape, focus return, `aria-modal`, labelled. Dialog/sheet content is height-bounded and scrolls so the close button and primary action stay reachable.
- **Forms.** Every field has a visible label or `aria-label`; errors are `role="alert"` inside an `Alert`, fields get `aria-invalid`, helper/count text is linked with `aria-describedby`.
- **Motion.** A global `prefers-reduced-motion` rule removes animation and smooth scrolling.
- **Targets.** ≥ 24px real size everywhere (2.5.8); on coarse pointers an invisible 40×44 hit area. Switches are 44×24.
- **Contrast.** Text and status tokens are tested for AA in both themes. Text over media (Clips) uses a scrim and shadow, and is the documented exception.

## Interaction states (one vocabulary)
| State | Treatment | Notes |
|---|---|---|
| Hover | `hover:bg-surface-hover` (filled: `hover:bg-primary/90`) | Only for pointer; never the sole signal |
| Pressed (while held) | `active:bg-surface-active` (filled: `/80`) | All buttons and rows |
| Pressed (toggle on) | `aria-pressed="true"` + brand tint/fill; name unchanged | Reactions, bookmark, repost, like |
| Selected | `aria-selected` / `aria-current="page"` + weight + indicator bar | Tabs, nav (not colour only) |
| Focus | 2px ring, offset 2 | Global |
| Disabled | `disabled` attr, flat muted colours, `cursor: not-allowed` | Never just opacity on filled buttons |
| Pending | `Button loading` → `aria-busy`, spinner, disabled; `cursor: progress` | Label stays |
| Success | `Alert variant="success"` (`role="status"`) or toast | Icon + text |
| Error | `Alert variant="destructive"` (`role="alert"`) + `aria-invalid` on the field | Icon + text, `destructive-text` colour |

## Manual verification (do these before a release)
1. **Keyboard only, every page.** Unplug the mouse. Tab through each route: order matches the visual order, every control has a visible focus ring, nothing is skipped or trapped, nothing is unreachable (menus, picker, composer actions, tabs with arrow keys). Space/Enter activate; Escape closes everything that opens.
2. **Screen readers.** VoiceOver + Safari (macOS and iOS), NVDA + Firefox/Chrome, TalkBack + Chrome. For Home, a post, Profile, Live room, Pay form, Settings: landmarks list, headings list, form fields announce label + errors, buttons announce name + state (Bookmark pressed), the route change announces the new title, toasts are spoken once, the unread badge is spoken.
3. **Modals.** Open the tip dialog, More sheet, post menu with a screen reader: it announces as a dialog/menu with a name, background content is not reachable, closing returns focus to the trigger.
4. **Zoom and reflow.** 200% and 400% browser zoom at 1280px wide (= 320 CSS px): no horizontal scrolling, nothing clipped, sticky bars don't consume the screen. Text-only zoom 200%: no overlap.
5. **Text spacing** (WCAG 1.4.12 bookmarklet): line height 1.5, paragraph 2×, letter 0.12em, word 0.16em — no clipped text.
6. **Contrast spot-checks.** In both themes: placeholder text, disabled controls (exempt but readable), text over images/video (Clips, live tiles), focus ring on every surface, hover states.
7. **Reduced motion and forced colors.** Enable "Reduce motion": no sliding/zooming. Enable Windows High Contrast / `forced-colors`: borders, focus rings and active-route indicators remain visible.
8. **Touch.** On a phone: every control is comfortably tappable (no mis-taps on reaction pills), pinch zoom isn't disabled, orientation works, the bottom bar doesn't cover content, the keyboard doesn't hide the field you're typing in.
9. **Voice control.** Dragon/Voice Control: say "tap Bookmark", "tap Follow Kaydence": visible text matches the spoken name (2.5.3).
10. **Time and motion.** Auto-updating content (live viewer counts, chat) doesn't steal focus; nothing flashes more than 3 times a second.

## Known gaps
- Automated tests ran in Chromium only; no screen reader or real-device sessions were possible in this pass, so items 2, 3, 7 and 8 above are unverified.
- Dragging (2.5.7) has no features that need it today; the Clips pager has next/previous buttons.
- Live chat messages are not announced as they arrive (to avoid flooding screen readers); a user-controlled "announce new messages" toggle would be the next step.
- Clips and live tiles overlay text on video; contrast depends on the media.
- Authentication (thirdweb email code) can't be automated; the form's semantics are unit-tested.
- Charts (dashboard earnings) expose values as visible text labels, not as an accessible data table.
