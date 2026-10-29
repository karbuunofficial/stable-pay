import { expect, test } from "./fixtures";

const post = (page: import("@playwright/test").Page, who: string) => page.getByRole("article", { name: `Post by ${who}` });

test.describe("social actions (demo data)", () => {
  test("reacting toggles the count and the pressed state, and switching kinds moves the count", async ({ page }) => {
    await page.goto("/");
    const p = post(page, "Kaydence");
    const fire = p.getByRole("button", { name: /^Fire, \d+/ });
    const start = Number((await fire.getAttribute("aria-label"))!.match(/\d+/)![0]);
    await fire.click();
    await expect(p.getByRole("button", { name: `Fire, ${start + 1}` })).toHaveAttribute("aria-pressed", "true");
    await p.getByRole("button", { name: /^Love, \d+/ }).click();
    await expect(p.getByRole("button", { name: `Fire, ${start}` })).toHaveAttribute("aria-pressed", "false");
    await p.getByRole("button", { name: /^Love, \d+/ }).click();
    await expect(p.getByRole("button", { name: /^Love, \d+/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("a bookmarked post shows up on the Bookmarks page and can be removed", async ({ page }) => {
    await page.goto("/");
    await post(page, "BPM Bishop").getByRole("button", { name: "Bookmark" }).click();
    await expect(page.getByText("Saved to bookmarks")).toBeVisible();
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Bookmarks" }).click();
    await expect(page.getByRole("article", { name: "Post by BPM Bishop" })).toBeVisible();
    await page.getByRole("article", { name: "Post by BPM Bishop" }).getByRole("button", { name: "Bookmark" }).click();
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
  });

  test("following a creator adds their posts to the Following tab", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("button", { name: "Follow Sole Smith" }).click();
    await expect(page.getByRole("button", { name: "Following Sole Smith" })).toBeVisible();
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Home" }).click();
    await page.getByRole("tab", { name: "Following" }).click();
    await expect(post(page, "Sole Smith")).toBeVisible();
  });

  test("publishing a post puts it first, counts characters, and clears the box", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("textbox", { name: "Write a post" });
    const postButton = page.getByRole("button", { name: "Post", exact: true });
    await expect(postButton).toBeDisabled();
    await box.fill("Testing the end-to-end flow 🎤");
    await expect(postButton).toBeEnabled();
    await postButton.click();
    await expect(page.getByRole("article").first()).toContainText("Testing the end-to-end flow");
    await expect(box).toHaveValue("");
    await expect(page.getByRole("article")).toHaveCount(8);
  });

  test("a post over 500 characters is blocked with a message", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Write a post" }).fill("a".repeat(501));
    await expect(page.getByRole("alert")).toContainText("1 characters over the 500 limit");
    await expect(page.getByRole("button", { name: "Post", exact: true })).toBeDisabled();
  });

  test("a post page shows the post and a way back", async ({ page }) => {
    await page.goto("/post/p2");
    await expect(page.getByRole("article")).toContainText("1974 soul sample");
    await expect(page).toHaveTitle("Post — AMIXOF");
    await page.goto("/post/does-not-exist");
    await expect(page.getByText("Post not found")).toBeVisible();
  });
});

test.describe("profiles and tipping (demo money)", () => {
  test("profile shows the creator, their posts, and a follower count that follows the Follow button", async ({ page }) => {
    await page.goto("/profile/kaydence");
    await expect(page.getByRole("heading", { name: "Kaydence" }).first()).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
    // the demo seed already follows Kaydence: the button says so, and toggling flips it
    await page.getByRole("button", { name: "Following Kaydence" }).click();
    await expect(page.getByRole("button", { name: /^Follow Kaydence$/ })).toBeVisible();
  });

  test("an unknown profile says so", async ({ page }) => {
    await page.goto("/profile/nobody-here");
    await expect(page.getByText("Profile not found")).toBeVisible();
  });

  test("tipping: validates the amount, sends, records it in the wallet history, and says no money moved", async ({ page }) => {
    await page.goto("/profile/kaydence");
    await page.getByRole("button", { name: "Tip", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Send a tip" });
    await expect(dialog).toContainText("no money moves");
    await dialog.getByLabel("Custom amount").fill("0.5");
    await expect(dialog.getByRole("alert")).toContainText("at least $1");
    await expect(dialog.getByRole("button", { name: /^Send \$/ })).toBeDisabled();
    await dialog.getByRole("button", { name: "$10" }).click();
    await dialog.getByRole("button", { name: "Send $10 to Kaydence" }).click();
    await expect(page.getByText("Tipped Kaydence $10")).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Wallet" }).click();
    await expect(page.getByText("Tip sent").first()).toBeVisible();
    await expect(page.getByText("−$10.00").first()).toBeVisible();
  });

  test("the tip dialog traps focus, closes on Escape, and returns focus to the button that opened it", async ({ page }) => {
    await page.goto("/profile/kaydence");
    const tip = page.getByRole("button", { name: "Tip", exact: true });
    await tip.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Send a tip" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true); // never leaves the dialog
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(tip).toBeFocused();
  });
});

test.describe("payments pages without a backend", () => {
  for (const path of ["/pay", "/activity", "/people", "/me"]) {
    test(`${path} explains that StablePay isn't set up instead of crashing or showing a login`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText("StablePay isn't set up yet")).toBeVisible();
      await expect(page.getByLabel(/email/i)).toHaveCount(0);
    });
  }

  test("the rest of the site keeps working", async ({ page }) => {
    await page.goto("/pay");
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Explore" }).click();
    await expect(page.getByRole("heading", { name: "Explore" }).first()).toBeVisible();
  });
});

test("theme toggle switches and remembers the choice", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: /switch to light theme/i }).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});
