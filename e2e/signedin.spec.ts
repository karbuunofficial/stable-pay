import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Signed-in StablePay screens, laid out at every width. The app is built against a fake Supabase URL and every
// call to it (plus the session service and thirdweb) is answered here, so no backend or real account is involved.
const SIZES = [320, 375, 390, 768, 1024, 1440, 1920];
const ME = { id: "u1", username: "kayden", display_name: "Kayden With A Rather Long Display Name", avatar_url: "", wallet_address: "0x1111111111111111111111111111111111111111", email: "k@example.com", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" };
const FRIEND = { ...ME, id: "u2", username: "a_really_long_username_for_testing", display_name: "Friend", wallet_address: "0x2222222222222222222222222222222222222222" };

async function signIn(page: Page) {
  await page.addInitScript(() => localStorage.setItem("thirdweb_token", "e2e"));
  await page.route("http://127.0.0.1:54399/session", (r) => r.fulfill({ json: { access_token: "t", expires_at: Math.floor(Date.now() / 1000) + 3600, user: ME } }));
  await page.route("http://127.0.0.1:54399/rest/v1/**", (r) => {
    const single = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const url = r.request().url();
    if (url.includes("/users")) return r.fulfill({ json: single ? FRIEND : [FRIEND, { ...FRIEND, id: "u3", username: "short", display_name: "Short" }] });
    return r.fulfill({ json: single ? {} : [] });
  });
  await page.route("https://api.thirdweb.com/**", (r) => r.fulfill({ json: { result: [{ value: "12500000", symbol: "USDC", decimals: 6, name: "USD Coin", displayValue: "12.5", chainId: 8453 }] } }));
}

const clipped = (page: Page) =>
  page.evaluate(() => {
    const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
    const inScroller = (e: Element) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true; } return false; };
    const out: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth) out.push("h-scroll");
    for (const e of document.querySelectorAll("main *, header *")) {
      if (!vis(e) || e.closest(".sr-only")) continue;
      const b = e.getBoundingClientRect();
      if ((b.right > innerWidth + 1 || b.left < -1) && !inScroller(e)) out.push(`${e.tagName}.${String(e.className).slice(0, 40)} [${Math.round(b.left)},${Math.round(b.right)}]`);
    }
    return out;
  });

for (const width of SIZES) {
  test.describe(`signed in @ ${width}px`, () => {
    test.use({ viewport: { width, height: width < 500 ? 700 : 900 }, hasTouch: width <= 768 });
    for (const path of ["/pay", "/pay?to=a_really_long_username_for_testing", "/wallet", "/activity", "/people", "/me", "/settings"]) {
      test(`${path} fits`, async ({ page }) => {
        await signIn(page);
        await page.goto(path);
        await page.locator("main").waitFor();
        await expect(page.getByText("Checking your session")).toBeHidden();
        if (path.startsWith("/pay?to")) await expect(page.getByRole("heading", { name: "Send Payment" })).toBeVisible();
        if (path === "/me") await expect(page.getByText(/Kayden With A Rather/)).toBeVisible();
        expect(await clipped(page)).toEqual([]);
      });
    }
  });
}

test.describe("signed in: payment form and account menu on a small phone", () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true });

  test("the Continue button can be scrolled clear of the bottom bar", async ({ page }) => {
    await signIn(page);
    await page.goto("/pay?to=a_really_long_username_for_testing");
    await page.getByPlaceholder("0.00").fill("5");
    const cont = page.getByRole("button", { name: "Continue" });
    await cont.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const nav = (await page.getByRole("navigation", { name: "Mobile" }).boundingBox())!;
    const b = (await cont.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(nav.y);
    await expect(cont).toBeEnabled();
  });

  test("the account menu opens fully inside the screen", async ({ page }) => {
    await signIn(page);
    await page.goto("/pay");
    await page.getByRole("button", { name: "Account menu" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const b = (await menu.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(320);
    expect(b.y + b.height).toBeLessThanOrEqual(568);
    await expect(menu.getByRole("menuitem", { name: "Wallet" })).toBeVisible();
  });
});

// ---- accessibility of the signed-in and sign-in screens ----
const axeViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze()).violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  );

test.describe("accessibility: StablePay screens", () => {
  for (const theme of ["dark", "light"]) {
    for (const path of ["/pay", "/pay?to=a_really_long_username_for_testing", "/wallet", "/activity", "/people", "/me", "/settings"]) {
      test(`${path} (${theme}) has no axe violations`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("amixof-theme", t), theme);
        await signIn(page);
        await page.goto(path);
        await page.locator("main").waitFor();
        await expect(page.getByText("Checking your session")).toBeHidden();
        await page.waitForTimeout(300);
        expect(await axeViolations(page)).toEqual([]);
      });
    }
  }

  test("sign-in form: no axe violations, labelled fields, and a failed request is announced and linked to the field", async ({ page }) => {
    await page.route("https://api.thirdweb.com/**", (r) => r.fulfill({ status: 400, json: { error: "bad" } }));
    await page.goto("/pay");
    const email = page.getByLabel("Email address");
    await expect(email).toBeVisible();
    expect(await email.getAttribute("autocomplete")).toBe("email");
    expect(await axeViolations(page)).toEqual([]);
    await email.fill("someone@example.com");
    await page.getByRole("button", { name: /send/i }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const describedBy = await email.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toBeVisible();
  });

  test("pay form: every field has a label, and an invalid amount is flagged on the field", async ({ page }) => {
    await signIn(page);
    await page.goto("/pay?to=a_really_long_username_for_testing");
    const amount = page.getByLabel("Amount");
    await expect(amount).toBeVisible();
    await expect(page.getByLabel(/Message/)).toBeVisible();
    await amount.fill("0");
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert")).toContainText(/valid amount/i);
    expect(await amount.getAttribute("aria-describedby")).toBe("amount-error");
  });
});
