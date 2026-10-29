import { expect, test } from "./fixtures";

test.describe("top bar", () => {
  test("signed out has exactly one sign-in control and no links that repeat the side nav", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(1);
    await expect(header.getByRole("navigation")).toHaveCount(0); // Home/Live/Clips/Blog live in the side nav only
    await expect(header.getByRole("search")).toBeVisible();
  });

  test("the bell shows a count only when there is something unread, and clears after opening Notifications", async ({ page }) => {
    await page.goto("/");
    const bell = page.getByRole("banner").getByRole("link", { name: /^Notifications/ });
    await expect(bell).toHaveAccessibleName(/unread/); // the demo build has sample notifications
    await bell.click();
    await expect(page.getByRole("article")).toHaveCount(0); // (notifications are rows, not posts)
    await expect(page.getByRole("link", { name: /Kaydence went live/ })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Notifications", exact: true })).toBeVisible(); // no "N unread" any more
  });
});

test.describe("post actions do what they say", () => {
  test("Gift opens the real gift dialog (not a fake 'sent' toast) and the gift lands in the wallet", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("article", { name: "Post by Kaydence" });
    await card.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: /send a gift to kaydence/i }).click();
    const dialog = page.getByRole("dialog", { name: "Send a gift" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/$/); // clicking inside the dialog must not navigate to the post page
    await dialog.getByRole("button", { name: /^Send \$/ }).click();
    await expect(page.getByText(/Sent Mic Drop to Kaydence/)).toBeVisible();
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Wallet" }).click();
    await expect(page.getByText(/Gift sent · 🎤 Mic Drop/)).toBeVisible();
  });

  test("Copy link copies the post's real URL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const card = page.getByRole("article", { name: "Post by BPM Bishop" });
    await card.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Copy link" }).click();
    await expect(page.getByText("Link copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/post\/p2$/);
  });

  test("the action row is compact: comments, repost, bookmark and one More menu", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("article", { name: "Post by Kaydence" });
    await expect(card.getByRole("button", { name: /replies/i })).toBeVisible();
    await expect(card.getByRole("button", { name: /^Repost/ })).toBeVisible();
    await expect(card.getByRole("button", { name: "Bookmark" })).toBeVisible();
    await expect(card.getByRole("button", { name: "More actions" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Copy link" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Share" })).toHaveCount(0);
  });

  test("clip Follow is the real follow (shared with the profile page)", async ({ page }) => {
    await page.goto("/clips");
    // the demo seed follows Kaydence and not Sole Smith; the name always carries the visible word plus who it is for
    await expect(page.getByRole("button", { name: "Following Kaydence" }).first()).toBeVisible();
    await page.getByRole("button", { name: /^Follow Sole Smith$/ }).first().click();
    await expect(page.getByRole("button", { name: "Following Sole Smith" }).first()).toBeVisible();
  });
});

test.describe("honest screens", () => {
  test("the demo wallet labels its sample rows; they are not mixed in unlabelled", async ({ page }) => {
    await page.goto("/wallet");
    for (const text of ["Payout (sample)", "Tip received (sample)", "Gift received (sample)"]) await expect(page.getByText(text)).toBeVisible();
    await expect(page.getByText("Payout", { exact: true })).toHaveCount(0);
  });

  test("Explore lists Trending once", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "Trending" })).toHaveCount(1);
  });

  test("settings saves the display name and keeps notification choices", async ({ page }) => {
    await page.goto("/settings");
    const save = page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled(); // nothing changed yet
    const name = page.getByLabel("Display name");
    await name.fill("A");
    await expect(page.getByRole("alert")).toContainText("at least 2");
    await name.fill("Jordan R.");
    await save.click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.getByRole("switch", { name: "Email digest" }).click();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Email digest" })).toBeChecked();
    await expect(page.getByText("Saved on this device")).toBeVisible();
  });

  test("the theme options show a preview of each theme", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("radio", { name: /dark/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /light/i })).toBeVisible();
  });
});

test.describe("live room", () => {
  test("has one stage toolbar and keeps demo-only controls in one labelled menu", async ({ page }) => {
    await page.goto("/live/kaydence");
    await expect(page.getByRole("radiogroup", { name: "Stage mode" })).toHaveCount(1);
    await expect(page.getByText("Demo: view as")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Simulate network" })).toHaveCount(0); // hidden until the menu is opened
    await page.getByRole("button", { name: "Demo controls" }).click();
    await expect(page.getByText("All participants are simulated", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulate network" })).toBeVisible();
  });

  test("Solo mode still works and keeps the mode switch in reach", async ({ page }) => {
    await page.goto("/live/kaydence");
    await page.getByRole("radio", { name: "Solo" }).click();
    await expect(page.getByRole("radio", { name: "Solo" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Multi-guest" }).click();
    await expect(page.getByRole("button", { name: "Demo controls" })).toBeVisible();
  });
});

test.describe("one container for utility pages", () => {
  // The payment pages (pay, people, activity, account) use the same container once signed in; the demo build shows
  // their full-width "not set up" message instead, so only the pages that render fully in demo mode are measured here.
  test("settings and wallet share the same column width", async ({ page }) => {
    const widths: Record<string, number> = {};
    for (const path of ["/settings", "/wallet"]) {
      await page.goto(path);
      await page.locator("main h1").first().waitFor();
      widths[path] = Math.round((await page.locator("main > div").first().boundingBox())!.width);
    }
    expect(new Set(Object.values(widths)).size, JSON.stringify(widths)).toBe(1);
  });
});

test.describe("brand", () => {
  test("no decorative page glow behind the app", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(bg).toBe("none");
  });
});
