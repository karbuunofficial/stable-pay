import { expect, test } from "./fixtures";

test.describe("home feed", () => {
  test("loads the sample posts with a title and a single h1", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Home — AMIXOF");
    await expect(page.getByRole("article")).toHaveCount(7);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("article").first()).toContainText("Kaydence");
  });

  test("skip link is the first Tab stop and moves focus to the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("unknown URLs show a friendly 404 with a way home", async ({ page }) => {
    await page.goto("/no/such/page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Go home" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("navigation", () => {
  test("clicking a nav link changes the page, the title, and moves focus to the new content", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page).toHaveTitle("Notifications — AMIXOF");
    await expect(page.locator("main#main")).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: "Notifications — AMIXOF" })).toBeAttached(); // announced to screen readers
  });

  test("marks the current page in the side nav", async ({ page }) => {
    await page.goto("/explore");
    const nav = page.getByRole("complementary", { name: "Main menu" });
    await expect(nav.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  });

  test("top-bar search goes to Explore and filters posts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("search").getByRole("searchbox").fill("soul sample");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/explore\?q=soul(%20|\+)sample/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("1974 soul sample");
  });

  test("tabs work with arrow keys and only the selected tab is a Tab stop", async ({ page }) => {
    await page.goto("/notifications");
    const all = page.getByRole("tab", { name: "all" });
    const mentions = page.getByRole("tab", { name: "mentions" });
    await expect(all).toHaveAttribute("tabindex", "0");
    await expect(mentions).toHaveAttribute("tabindex", "-1");
    await all.focus();
    await page.keyboard.press("ArrowRight");
    await expect(mentions).toBeFocused();
    await expect(mentions).toHaveAttribute("aria-selected", "true");
    await expect(all).toHaveAttribute("aria-selected", "false");
  });
});
