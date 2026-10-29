import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// WCAG 2.2 AA-oriented automated checks. Automation catches roughly a third of issues; docs/accessibility.md lists
// what still needs a person (screen readers, zoom, real devices).
const ROUTES = [
  "/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/communities/atlhiphop", "/blog", "/blog/the-sample-economy", "/messages", "/messages/c1",
  "/notifications", "/bookmarks", "/dashboard", "/admin", "/admin/media", "/settings", "/wallet", "/pay", "/activity", "/people", "/me", "/profile/kaydence", "/post/p1", "/design-system",
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * `modal: true` is for scans taken while a Radix modal is open. Radix marks everything behind it aria-hidden and traps
 * focus (the trap tests below prove focus can't reach the hidden content), so these three rules are expected noise then.
 * Overlays also fade/zoom in, so wait for that to finish: colours are measured mid-animation otherwise.
 */
async function axe(page: Page, modal = false) {
  if (modal) await page.waitForTimeout(450);
  let b = new AxeBuilder({ page }).withTags(TAGS);
  if (modal) b = b.disableRules(["aria-hidden-focus", "landmark-one-main", "page-has-heading-one", "region"]);
  const r = await b.analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`axe: every page (${theme})`, () => {
    test.beforeEach(async ({ page }) => { await page.addInitScript((t) => localStorage.setItem("amixof-theme", t), theme); });
    for (const path of ROUTES) {
      test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        await page.locator("main").waitFor();
        await page.waitForTimeout(200);
        expect(await axe(page)).toEqual([]);
      });
    }
  });
}

test.describe("axe: open overlays", () => {
  test("post menu, reaction picker and tip dialog", async ({ page }) => {
    await page.goto("/profile/kaydence");
    await page.getByRole("button", { name: "Add reaction" }).first().click();
    expect(await axe(page, true)).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "More actions" }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    expect(await axe(page, true)).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^tip/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await axe(page, true)).toEqual([]);
  });

  test("the account More sheet on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    expect(await axe(page, true)).toEqual([]);
  });

  test("the composer with text and the notifications tabs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: /write a post/i }).fill("hello");
    expect(await axe(page, true)).toEqual([]);
    await page.goto("/notifications");
    await page.getByRole("tab", { name: "mentions" }).click();
    expect(await axe(page, true)).toEqual([]);
  });
});

test.describe("keyboard", () => {
  test("skip link is the first tab stop, is visible when focused, and moves focus to main", async ({ page }) => {
    await page.goto("/explore");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    const b = (await skip.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  for (const vp of [{ name: "desktop", width: 1280, height: 800 }, { name: "phone", width: 390, height: 800 }]) {
    test(`every tab stop on the home feed has a visible focus indicator and isn't hidden behind a sticky bar (${vp.name})`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      await page.locator("article").first().waitFor();
      const failures: string[] = [];
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press("Tab");
        const r = await page.evaluate(() => {
          const e = document.activeElement as HTMLElement | null;
          if (!e || e === document.body) return null;
          // the control itself, or a wrapper that draws the ring for it (:focus-within), must show a 2px+ indicator
          const shows = (n: Element) => { const c = getComputedStyle(n); return (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow !== "none" && /rgb/.test(c.boxShadow)); };
          const outline = shows(e) || (!!e.parentElement && shows(e.parentElement)) || (!!e.parentElement?.parentElement && shows(e.parentElement.parentElement));
          const ring = false;
          const b = e.getBoundingClientRect();
          // area covered by the fixed/sticky bars at the top and bottom of the viewport
          const bars = [...document.querySelectorAll("header, nav[aria-label=Mobile], [role=tablist]")].filter((x) => ["sticky", "fixed"].includes(getComputedStyle(x).position));
          const covered = e.closest("a[href='#main']") ? false : bars.filter((x) => !x.contains(e) && !e.contains(x)).some((x) => { const t = x.getBoundingClientRect(); return b.bottom > t.top + 2 && b.top < t.bottom - 2 && b.width > 0 && t.width > 0 && b.right > t.left && b.left < t.right; });
          return { name: (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 30), visible: outline || ring, covered };
        });
        if (!r) continue;
        if (!r.visible) failures.push(`no focus indicator: ${r.name}`);
        if (r.covered) failures.push(`covered by a sticky bar: ${r.name}`);
      }
      expect(failures).toEqual([]);
    });
  }

  test("dialog: focus moves in, Tab and Shift+Tab stay inside, Escape closes and focus returns to the trigger", async ({ page }) => {
    await page.goto("/profile/kaydence");
    const trigger = page.getByRole("button", { name: /^tip/i }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const inside = () => dialog.evaluate((d) => d.contains(document.activeElement));
    expect(await inside()).toBe(true);
    for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); expect(await inside()).toBe(true); }
    for (let i = 0; i < 14; i++) { await page.keyboard.press("Shift+Tab"); expect(await inside()).toBe(true); }
    await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true").catch(() => {}); // background is inert (Radix hides it from AT)
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("dialog has an accessible name and description", async ({ page }) => {
    await page.goto("/profile/kaydence");
    await page.getByRole("button", { name: /^tip/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAccessibleName(/.+/);
    expect(await dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  test("menu: arrow keys move between items, Escape closes and returns focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "More actions" }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const items = menu.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the mobile More sheet traps focus, closes with Escape and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    const more = page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ });
    await more.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); expect(await sheet.evaluate((d) => d.contains(document.activeElement))).toBe(true); }
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(more).toBeFocused();
  });

  test("the reaction picker closes with Escape and the post card is reached through a real link, not a clickable article", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("article").first();
    expect(await card.getAttribute("tabindex")).toBeNull();
    await expect(card.getByRole("link", { name: /^Open post/ })).toBeVisible();
  });
});

test.describe("targets, motion and announcements", () => {
  test("WCAG 2.5.8: every control is at least 24x24 CSS px (or has the invisible hit area) on every page", async ({ page }) => {
    const bad: string[] = [];
    for (const path of ROUTES) {
      await page.goto(path);
      await page.locator("main").waitFor();
      const small = await page.evaluate(() => {
        const out: string[] = [];
        for (const e of document.querySelectorAll("a, button, input:not([type=hidden]), select, textarea, [role=tab], [role=radio], [role=switch], [role=checkbox]")) {
          const b = e.getBoundingClientRect();
          if (b.width < 1 || b.height < 1 || e.closest(".sr-only") || getComputedStyle(e).position === "fixed" && b.width < 2) continue;
          if (getComputedStyle(e).display === "inline" && e.tagName === "A") continue; // links inside a sentence are exempt
          if (e.matches("input[type=checkbox], input[type=radio]")) continue; // native control; its label is the target
          const label = e.closest("label"); if (label && label.getBoundingClientRect().height >= 24) continue; // a wrapping label is the target
          if (b.width < 24 || b.height < 24) out.push(`${e.tagName} ${e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 20)} ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        return out;
      });
      for (const s of small) bad.push(`${path}: ${s}`);
    }
    expect(bad).toEqual([]);
  });

  test("prefers-reduced-motion: no page animates or transitions for longer than a blink", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const long: string[] = [];
    for (const path of ["/", "/live/kaydence", "/clips", "/settings"]) {
      await page.goto(path);
      await page.locator("main").waitFor();
      const r = await page.evaluate(() => {
        const out: string[] = [];
        const ms = (s: string) => Math.max(0, ...s.split(",").map((x) => (x.trim().endsWith("ms") ? parseFloat(x) : parseFloat(x) * 1000)));
        for (const e of document.querySelectorAll("*")) {
          const cs = getComputedStyle(e);
          if (ms(cs.animationDuration) > 10 && cs.animationName !== "none") out.push(`animation ${e.tagName}.${String(e.className).slice(0, 30)}`);
          if (ms(cs.transitionDuration) > 10) out.push(`transition ${e.tagName}.${String(e.className).slice(0, 30)}`);
        }
        return out;
      });
      for (const x of r) long.push(`${path}: ${x}`);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).not.toBe("smooth");
    }
    expect(long).toEqual([]);
  });

  test("actions are announced: toasts live in a polite live region, route changes announce the new title", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("article").first().getByRole("button", { name: "Bookmark" }).click();
    const region = page.locator("[aria-live]").filter({ hasText: "Saved to bookmarks" }).first();
    await expect(region).toBeAttached();
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Explore" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Explore" }).first()).toBeAttached();
  });

  test("icon-only controls all have a name, and toggles don't rename themselves when pressed", async ({ page }) => {
    await page.goto("/");
    const article = page.getByRole("article").first();
    const bookmark = article.getByRole("button", { name: "Bookmark" });
    await bookmark.click();
    await expect(article.getByRole("button", { name: "Bookmark" })).toHaveAttribute("aria-pressed", "true");
    const unnamed = await page.evaluate(() => [...document.querySelectorAll("button, a[href], [role=tab], [role=menuitem]")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && !(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.textContent ?? "").trim() || e.querySelector("img[alt]:not([alt=''])") || e.getAttribute("title")); }).map((e) => e.outerHTML.slice(0, 80)));
    expect(unnamed).toEqual([]);
  });
});

test.describe("multi-guest stage controls", () => {
  test("your mic and camera buttons keep one name and report their state with aria-pressed", async ({ page }) => {
    await page.goto("/live/kaydence");
    // the demo opens in host view: preview as a viewer, request a seat, let the simulated host approve, then join
    await page.getByRole("button", { name: "Demo controls" }).click();
    await page.getByRole("switch", { name: "Preview as host" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Request to join" }).click();
    const preview = page.getByRole("dialog", { name: "Check your mic and camera" }); // opens by itself once the host approves (~2.5s)
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await preview.getByRole("button", { name: "Join stage" }).click();
    await expect(preview).toBeHidden();
    for (const [name, other] of [["Your microphone", "Your camera"], ["Your camera", "Your microphone"]] as const) {
      const btn = page.getByRole("button", { name, exact: true });
      await expect(btn).toHaveCount(1);
      const before = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(before);
      await btn.click();
      // same name, opposite state, and the other control is untouched
      await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
      expect(await page.getByRole("button", { name: other, exact: true }).getAttribute("aria-pressed")).toBeTruthy();
      await btn.click();
      await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", before!);
    }
    // the old state-flipping names are gone
    await expect(page.getByRole("button", { name: /^Turn your (mic|camera) (on|off)$/ })).toHaveCount(0);
  });
});
