import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Signed-in StablePay screens, laid out at every width. The app is built against a fake Supabase URL and every
// call to it (plus the session service and thirdweb) is answered here, so no backend or real account is involved.
const SIZES = [320, 375, 390, 768, 1024, 1440, 1920];
const ME = { id: "u1", username: "kayden", display_name: "Kayden With A Rather Long Display Name", avatar_url: "", wallet_address: "0x1111111111111111111111111111111111111111", email: "k@example.com", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" };
const FRIEND = { ...ME, id: "u2", username: "a_really_long_username_for_testing", display_name: "Friend", wallet_address: "0x2222222222222222222222222222222222222222" };

const TX = { id: "t1", from_user_id: "u1", to_user_id: "u2", from_address: ME.wallet_address, to_address: FRIEND.wallet_address, amount: "2500000", token_contract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", token_symbol: "USDC", chain_id: 8453, message: "lunch", status: "confirmed", created_at: new Date().toISOString(), confirmed_at: new Date().toISOString(), from_user: ME, to_user: FRIEND };

async function signIn(page: Page, opts: { transactions?: unknown[] } = {}) {
  await page.addInitScript(() => localStorage.setItem("thirdweb_token", "e2e"));
  await page.route("http://127.0.0.1:54399/session", (r) => r.fulfill({ json: { access_token: "t", expires_at: Math.floor(Date.now() / 1000) + 3600, user: ME } }));
  await page.route("http://127.0.0.1:54399/rest/v1/**", (r) => {
    const single = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const url = r.request().url();
    if (url.includes("/rest/v1/transactions")) return r.fulfill({ json: single ? {} : (opts.transactions ?? []) });
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

// ---- browser regression coverage for controls only reachable with a signed-in session ----
test.describe("StablePay controls: names, state and behaviour", () => {
  test("balance: the visibility toggle changes its name (no aria-pressed) and hides and shows the amounts", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");
    await expect(page.getByRole("heading", { name: "Your Balance" })).toBeVisible();
    const hide = page.getByRole("button", { name: "Hide balances" });
    await expect(hide).toBeVisible();
    expect(await hide.getAttribute("aria-pressed")).toBeNull(); // one signal for state: the name (action label) alone
    await expect(page.getByText("••••••")).toHaveCount(0);
    await expect(page.getByText(/^\$\d/).first()).toBeVisible();
    await hide.click();
    const show = page.getByRole("button", { name: "Show balances" });
    await expect(show).toBeVisible();
    expect(await show.getAttribute("aria-pressed")).toBeNull();
    await expect(page.getByText("••••••").first()).toBeVisible();
    await expect(page.getByText(/^\$\d/)).toHaveCount(0);
    await show.click(); // and back
    await expect(page.getByRole("button", { name: "Hide balances" })).toBeVisible();
    await expect(page.getByText("••••••")).toHaveCount(0);
  });

  test("balance: the refresh button is named, disabled while loading, and fetches again", async ({ page }) => {
    await signIn(page);
    let calls = 0;
    await page.route("https://api.thirdweb.com/**", async (r) => {
      calls++;
      await new Promise((res) => setTimeout(res, 300));
      await r.fulfill({ json: { result: [{ value: "12500000", symbol: "USDC", decimals: 6, name: "USD Coin", displayValue: "12.5", chainId: 8453 }] } });
    });
    await page.goto("/wallet");
    const refresh = page.getByRole("button", { name: "Refresh balances" });
    await expect(refresh).toBeVisible();
    const before = calls;
    await refresh.click();
    await expect(page.getByRole("button", { name: "Refreshing balances" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Refresh balances" })).toBeEnabled();
    expect(calls).toBeGreaterThan(before);
  });

  test("activity: the refresh button is named, shows its pending state, and reloads the list", async ({ page }) => {
    await signIn(page, { transactions: [TX] });
    let loads = 0;
    await page.route("http://127.0.0.1:54399/rest/v1/transactions**", async (r) => {
      loads++;
      await new Promise((res) => setTimeout(res, 300));
      await r.fulfill({ json: [TX] });
    });
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
    const refresh = page.getByRole("button", { name: "Refresh activity" });
    await expect(refresh).toBeVisible();
    const before = loads;
    await refresh.click();
    await expect(page.getByRole("button", { name: "Refreshing activity" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Refresh activity" })).toBeEnabled();
    expect(loads).toBeGreaterThan(before);
    await expect(page.getByText("Confirmed")).toBeVisible(); // the row is still there afterwards
  });

  test("pay confirmation: Back is named, keyboard-operable, returns to the amount form, and no payment is created", async ({ page }) => {
    await signIn(page);
    const paymentCalls: string[] = [];
    page.on("request", (req) => { if (/\/v1\/payments/.test(req.url())) paymentCalls.push(`${req.method()} ${req.url()}`); });
    await page.goto("/pay?to=a_really_long_username_for_testing");
    await page.getByLabel("Amount").fill("5");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Confirm Payment" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    const back = page.getByRole("button", { name: "Back", exact: true });
    await expect(back).toBeVisible();
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Send Payment" })).toBeVisible();
    await expect(page.getByLabel("Amount")).toHaveValue(""); // the confirm step was abandoned, nothing carried over
    expect(paymentCalls).toEqual([]);
  });
});
