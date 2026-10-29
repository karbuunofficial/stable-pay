import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Layout at the seven widths the product supports, plus the awkward situations: dialogs on short screens,
// landscape phones, touch input, menus near the edge. See docs/responsive.md.
const SIZES = [320, 375, 390, 768, 1024, 1440, 1920];
const ROUTES = [
  "/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/communities/atlhiphop", "/blog", "/blog/the-sample-economy", "/messages", "/messages/c1",
  "/notifications", "/bookmarks", "/dashboard", "/admin", "/admin/media", "/settings", "/wallet", "/pay", "/activity", "/people", "/me", "/profile/kaydence", "/post/p1",
];

const problems = (page: Page) =>
  page.evaluate(() => {
    const vis = (e: Element) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 1 && b.height > 1 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const inScroller = (e: Element) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true; } return false; };
    const out: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth) out.push(`h-scroll +${document.documentElement.scrollWidth - innerWidth}`);
    for (const e of document.querySelectorAll("main *, header *, nav *")) {
      if (!vis(e) || e.closest(".sr-only") || e.closest("[aria-hidden=true]")) continue;
      const b = e.getBoundingClientRect();
      if ((b.right > innerWidth + 1 || b.left < -1) && !inScroller(e)) out.push(`clipped ${e.tagName}.${String(e.className).slice(0, 40)} [${Math.round(b.left)},${Math.round(b.right)}]`);
      const cs = getComputedStyle(e);
      if (e.children.length === 0 && (e.textContent ?? "").trim() && e.scrollWidth > e.clientWidth + 1 && cs.overflowX === "visible" && cs.display !== "inline") out.push(`text overflows ${e.tagName}.${String(e.className).slice(0, 40)}`);
    }
    return out;
  });

for (const width of SIZES) {
  test.describe(`all routes @ ${width}px`, () => {
    test.use({ viewport: { width, height: width < 500 ? 740 : 900 }, hasTouch: width <= 768 });
    for (const path of ROUTES) {
      test(`${path}: no horizontal scroll, clipping or text overflow; bottom bar doesn't cover content`, async ({ page }) => {
        await page.goto(path);
        await page.locator("main").waitFor();
        expect(await problems(page)).toEqual([]);
        const nav = page.getByRole("navigation", { name: "Mobile" });
        if (await nav.isVisible()) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          const top = (await nav.boundingBox())!.y;
          const last = await page.evaluate(() => {
            const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.height > 1 && b.width > 1; };
            // fixed/sticky things are allowed to overlap; only the document flow must clear the bar
            return Math.max(0, ...[...document.querySelectorAll("main *")].filter((e) => vis(e) && !["fixed", "sticky"].includes(getComputedStyle(e).position)).map((e) => e.getBoundingClientRect().bottom));
          });
          const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight);
          if (scrolls) expect(last).toBeLessThanOrEqual(top + 1);
        }
      });
    }
  });
}

test.describe("dialogs and sheets on short screens", () => {
  for (const vp of [{ width: 320, height: 568 }, { width: 667, height: 375 }, { width: 844, height: 390 }]) {
    test(`tip dialog fits and can be closed at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/profile/kaydence");
      await page.getByRole("button", { name: /^tip/i }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const b = (await dialog.boundingBox())!;
      expect(b.height).toBeLessThanOrEqual(vp.height);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1);
      // the primary action is reachable by scrolling the dialog, never hidden behind the viewport edge
      const send = dialog.getByRole("button", { name: /^send/i });
      await send.scrollIntoViewIfNeeded();
      const s = (await send.boundingBox())!;
      expect(s.y + s.height).toBeLessThanOrEqual(vp.height);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  }

  test("the More sheet is at most 90% of a landscape phone and scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();
    const b = (await sheet.boundingBox())!;
    expect(b.height).toBeLessThanOrEqual(375 * 0.9 + 1);
    expect(b.y).toBeGreaterThanOrEqual(375 * 0.1 - 1);
    expect(await sheet.evaluate((e) => getComputedStyle(e).overflowY)).toBe("auto");
  });
});

test.describe("menus stay on screen", () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true });
  test("a post's More menu opens inside the viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "More actions" }).first().click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const b = (await menu.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(320);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(568);
  });
});

test.describe("landscape phone", () => {
  test("667x375 (phone, bottom bar): bars leave room for content and nothing overflows", async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto("/");
    await page.locator("main").waitFor();
    expect(await problems(page)).toEqual([]);
    const nav = (await page.getByRole("navigation", { name: "Mobile" }).boundingBox())!;
    const header = (await page.locator("header").first().boundingBox())!;
    // top bar 56 + bottom bar 48 (compact in short landscape) leaves most of the screen
    expect(header.height).toBe(56);
    expect(nav.height).toBeLessThanOrEqual(48);
    expect(375 - header.height - nav.height).toBeGreaterThanOrEqual(260);
  });

  test("844x390 (large phone, md layout): icon rail instead of the bottom bar, nothing overflows", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await page.locator("main").waitFor();
    expect(await problems(page)).toEqual([]);
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
    const rail = (await page.getByRole("complementary", { name: "Main menu" }).boundingBox())!;
    expect(rail.height).toBeLessThanOrEqual(390 - 56);
    expect(await page.getByRole("complementary", { name: "Main menu" }).evaluate((e) => getComputedStyle(e).overflowY)).toBe("auto"); // the rail scrolls on its own
  });

  test("rotating from portrait to landscape and back keeps the layout intact", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/explore");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await problems(page)).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await problems(page)).toEqual([]);
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  });
});

test.describe("responsive discovery", () => {
  test("below 1024px the Live now strip replaces the rail; at 1024px+ the rail returns and the strip hides", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Live now" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Discover" })).toBeHidden();
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(page.getByRole("region", { name: "Live now" })).toBeHidden();
    await expect(page.getByRole("complementary", { name: "Discover" })).toBeVisible();
  });

  test("side navigation: hidden on phones, icon rail at tablet and laptop, full labels from 1280px", async ({ page }) => {
    const nav = page.getByRole("complementary", { name: "Main menu" });
    await page.setViewportSize({ width: 390, height: 800 }); await page.goto("/"); await expect(nav).toBeHidden();
    await page.setViewportSize({ width: 820, height: 800 }); expect((await nav.boundingBox())!.width).toBe(72);
    await page.setViewportSize({ width: 1100, height: 800 }); expect((await nav.boundingBox())!.width).toBe(72);
    await page.setViewportSize({ width: 1440, height: 900 }); expect((await nav.boundingBox())!.width).toBe(244);
    await page.setViewportSize({ width: 1920, height: 1080 }); expect((await nav.boundingBox())!.width).toBe(244);
  });
});

test.describe("stacked sticky bars", () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test("community tabs stick below the page header instead of sliding under it", async ({ page }) => {
    await page.goto("/communities/atlhiphop");
    await page.evaluate(() => window.scrollTo(0, 900));
    const header = (await page.locator("main .sticky").first().boundingBox())!;
    const tabs = (await page.getByRole("tablist").boundingBox())!;
    expect(tabs.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(tabs.y).toBeLessThan(120);
  });
});

test.describe("touch", () => {
  test.use({ viewport: { width: 412, height: 839 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });

  test("every control in the feed has a tap area of at least 40x44 (visible box or its invisible hit area)", async ({ page }) => {
    await page.goto("/");
    await page.locator("article").first().waitFor();
    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const e of document.querySelectorAll("main button, main a, main [role=tab], main [role=radio], header a, header button, nav a, nav button")) {
        const b = e.getBoundingClientRect();
        if (b.width < 1 || b.height < 1 || e.closest(".sr-only")) continue;
        const after = getComputedStyle(e, "::after");
        const w = Math.max(b.width, parseFloat(after.width) || 0);
        const h = Math.max(b.height, parseFloat(after.height) || 0);
        // inline text links inside a sentence are exempt: they have no box of their own to grow
        if ((w < 40 || h < 44) && getComputedStyle(e).display !== "inline") out.push(`${e.tagName} ${e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 20)} ${Math.round(w)}x${Math.round(h)}`);
      }
      return out;
    });
    expect(small).toEqual([]);
  });

  test("tapping works: open the More sheet, navigate, and the sheet closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ }).tap();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Bookmarks" }).tap();
    await expect(page).toHaveURL(/\/bookmarks$/);
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
  });

  test("the Live now strip scrolls sideways without scrolling the page", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("region", { name: "Live now" }).locator("ul");
    const [scrollable, pageScrollable] = await Promise.all([list.evaluate((e) => e.scrollWidth > e.clientWidth), page.evaluate(() => document.documentElement.scrollWidth > innerWidth)]);
    expect(scrollable).toBe(true);
    expect(pageScrollable).toBe(false);
  });

  test("scroll position survives going into a post and back", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 900));
    const before = await page.evaluate(() => window.scrollY);
    await page.locator("article").nth(3).evaluate((e) => (e as HTMLElement).click()); // no auto-scroll, so the offset we saved is the one we restore
    await expect(page).toHaveURL(/\/post\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForTimeout(300);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(60);
  });

  test("a focused field scrolls clear of the sticky bars", async ({ page }) => {
    await page.goto("/");
    const field = page.getByPlaceholder(/word in the culture/i);
    await field.focus();
    await field.evaluate((e) => e.scrollIntoView({ block: "start" }));
    const top = (await field.boundingBox())!.y;
    const stickyBottom = await page.evaluate(() => Math.max(...[...document.querySelectorAll("header, [role=tablist]")].filter((e) => getComputedStyle(e).position === "sticky").map((e) => e.getBoundingClientRect().bottom)));
    expect(top).toBeGreaterThanOrEqual(stickyBottom - 1);
  });
});
