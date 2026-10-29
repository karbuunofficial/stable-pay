import { expect, test } from "./fixtures";

test.describe("phone layout", () => {
  test("shows the bottom bar with labels and hides the side nav", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Mobile" });
    await expect(bar).toBeVisible();
    for (const name of ["Home", "Explore", "Live", "Pay", "More"]) await expect(bar.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Main menu" })).toBeHidden();
  });

  test("every destination is reachable from the More sheet, which closes on navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet.getByRole("link")).toHaveCount(17);
    await sheet.getByRole("link", { name: "Bookmarks" }).click();
    await expect(page).toHaveURL(/\/bookmarks$/);
    await expect(sheet).toBeHidden();
    await expect(page).toHaveTitle("Bookmarks — AMIXOF");
  });

  test("the More sheet closes with Escape and gives focus back to the button", async ({ page }) => {
    await page.goto("/");
    const more = page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: /^More/ });
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await expect(more).toBeFocused();
  });

  test("bottom-bar items are comfortable to tap (at least 44px high)", async ({ page }) => {
    await page.goto("/");
    const items = page.getByRole("navigation", { name: "Mobile" }).locator("a, button");
    for (let i = 0; i < (await items.count()); i++) expect((await items.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  const ROUTES = ["/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/blog", "/blog/the-sample-economy", "/messages", "/notifications", "/bookmarks", "/dashboard", "/settings", "/wallet", "/profile/kaydence", "/post/p1"];
  for (const path of ROUTES) {
    test(`${path} has no horizontal scrolling`, async ({ page }) => {
      await page.goto(path);
      await page.locator("main").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("text fields are at least 16px so iOS doesn't zoom on focus", async ({ page }) => {
    await page.goto("/");
    const sizes = await page.locator("input:not([type=checkbox]):not([type=radio]), textarea").evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => parseFloat(getComputedStyle(e).fontSize)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
  });
});
