import { expect, test } from "./fixtures";

const SIZES = { desktop: { width: 1440, height: 900 }, laptop: { width: 1100, height: 800 }, tablet: { width: 820, height: 1100 }, phone: { width: 390, height: 844 } };

for (const [name, viewport] of Object.entries(SIZES)) {
  test.describe(`shell @ ${name}`, () => {
    test.use({ viewport });

    for (const path of ["/", "/wallet", "/live"]) {
      test(`${path}: no horizontal scroll, top bar is sticky and stays put while scrolling`, async ({ page }) => {
        await page.goto(path);
        await page.locator("main").waitFor();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const header = page.locator("header").first();
        const before = await header.boundingBox();
        await page.evaluate(() => window.scrollTo(0, 400));
        const after = await header.boundingBox();
        expect(before!.y).toBe(0);
        expect(after!.y).toBe(0);
        expect(before!.height).toBe(56);
      });
    }

    test("the current route is marked with aria-current and a non-colour indicator", async ({ page }) => {
      await page.goto("/explore");
      const nav = name === "phone" ? page.getByRole("navigation", { name: "Mobile" }) : page.getByRole("complementary", { name: "Main menu" });
      const current = nav.locator('a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAccessibleName(/Explore|Explore$/);
      await expect(current.locator("span[aria-hidden].bg-brand")).toHaveCount(1);
      expect(await current.evaluate((e) => Number(getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(600);
    });
  });
}

test.describe("shell layout (desktop)", () => {
  test.use({ viewport: SIZES.desktop });

  test("top bar, sidebar and feed share the same left edges", async ({ page }) => {
    await page.goto("/");
    const brand = await page.getByRole("link", { name: "AMIXOF home" }).boundingBox();
    const firstNav = await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Home" }).locator("svg").first().boundingBox();
    expect(Math.abs(brand!.x - firstNav!.x)).toBeLessThanOrEqual(1);
    const feedEdge = (await page.locator("main > div > div").first().boundingBox())!.x;
    const aside = await page.getByRole("complementary", { name: "Main menu" }).boundingBox();
    expect(feedEdge).toBeGreaterThanOrEqual(aside!.x + aside!.width - 1);
  });

  test("collapsing the menu doesn't move the feed or the rail on social pages", async ({ page }) => {
    await page.goto("/");
    const feed = page.locator("main > div > div").first();
    const rail = page.getByRole("complementary", { name: "Discover" });
    const home = page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Home" });
    const before = { feed: (await feed.boundingBox())!.x, rail: (await rail.boundingBox())!.x, homeY: (await home.boundingBox())!.y };
    await page.getByRole("button", { name: "Collapse menu" }).click();
    await expect(page.getByRole("button", { name: "Expand menu" })).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(300);
    const after = { feed: (await feed.boundingBox())!.x, rail: (await rail.boundingBox())!.x, homeY: (await home.boundingBox())!.y };
    expect(after).toEqual(before);
    await page.getByRole("button", { name: "Expand menu" }).click();
  });

  test("nav icons are one size", async ({ page }) => {
    await page.goto("/");
    const sizes = await page.getByRole("complementary", { name: "Main menu" }).locator("a svg:first-child").evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().width)))]);
    expect(sizes).toEqual([20]);
  });

  test("signed-out top bar offers Sign in and the notifications bell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Notifications/ }).first()).toBeVisible();
  });

  test("keyboard: tabbing from the top reaches the skip link, then the brand, with a visible focus ring", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "AMIXOF home" })).toBeFocused();
    const ring = await page.getByRole("link", { name: "AMIXOF home" }).evaluate((e) => getComputedStyle(e).outlineStyle);
    expect(ring).not.toBe("none");
  });
});

test.describe("shell layout (phone)", () => {
  test.use({ viewport: SIZES.phone });

  test("the bottom bar never covers the end of the page", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.locator("main").waitFor();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bar = (await page.getByRole("navigation", { name: "Mobile" }).boundingBox())!;
    const lastBottom = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const kids = [...main.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().height > 0);
      return Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
    });
    expect(lastBottom).toBeLessThanOrEqual(bar.y + 1);
  });

  test("the bar reserves the safe-area inset and the page leaves room for it", async ({ page }) => {
    await page.goto("/");
    const css = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Mobile"]') as HTMLElement;
      const main = document.querySelector("main") as HTMLElement;
      return { nav: nav.className, main: main.className };
    });
    expect(css.nav).toContain("env(safe-area-inset-bottom)");
    expect(css.main).toContain("env(safe-area-inset-bottom)");
  });

  test("navigation isn't duplicated: no desktop sidebar or Pay button at phone width", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("complementary", { name: "Main menu" })).toBeHidden();
    await expect(page.locator("header").getByRole("link", { name: "Pay" })).toBeHidden();
  });
});
