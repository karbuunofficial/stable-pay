import { expect, test } from "./fixtures";

// Structural accessibility checks on every page. Not a substitute for an axe/Lighthouse run or screen-reader testing.
const ROUTES = [
  "/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/communities/atlhiphop", "/blog", "/blog/the-sample-economy", "/messages",
  "/notifications", "/bookmarks", "/dashboard", "/admin", "/admin/media", "/settings", "/wallet", "/pay", "/activity", "/people", "/me", "/profile/kaydence", "/post/p1", "/design-system",
];

for (const theme of ["dark", "light"] as const) {
  for (const path of ROUTES) {
    test(`${path} (${theme}) has landmarks, one h1, a unique title, names on controls`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("amixof-theme", t), theme);
      await page.goto(path);
      await page.locator("main").waitFor();

      const report = await page.evaluate(() => {
        const visible = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
        const text = (e: Element) => (e.textContent ?? "").trim();
        const name = (e: Element): string => {
          const el = e as HTMLInputElement;
          if (e.getAttribute("aria-label")) return e.getAttribute("aria-label")!;
          if (e.getAttribute("aria-labelledby")) return e.getAttribute("aria-labelledby")!.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
          if (el.labels && [...el.labels].some((l) => text(l))) return "label";
          return text(e) || e.querySelector("img[alt]")?.getAttribute("alt") || e.getAttribute("title") || "";
        };
        const unnamed = [...document.querySelectorAll("a, button, input:not([type=hidden]), textarea, select, [role=tab], [role=radio], [role=switch]")].filter((e) => visible(e) && !name(e)).map((e) => e.tagName + "." + String(e.className).slice(0, 30));
        return {
          h1: document.querySelectorAll("h1").length,
          main: document.querySelectorAll("main").length,
          titleCount: document.querySelectorAll("head title").length,
          title: document.title,
          lang: document.documentElement.lang,
          unlabelledLandmarks: [...document.querySelectorAll("nav, aside")].filter((n) => !n.getAttribute("aria-label") && !n.getAttribute("aria-labelledby")).length,
          imagesWithoutAlt: document.querySelectorAll("img:not([alt])").length,
          duplicateIds: (() => { const seen = new Set<string>(); const d: string[] = []; document.querySelectorAll("[id]").forEach((e) => { if (seen.has(e.id)) d.push(e.id); seen.add(e.id); }); return d; })(),
          unnamed,
        };
      });

      expect(report.h1, "exactly one h1").toBe(1);
      expect(report.main, "exactly one main").toBe(1);
      expect(report.titleCount, "one <title>").toBe(1);
      expect(report.title).toMatch(/AMIXOF|StablePay/);
      expect(report.lang).toBe("en");
      expect(report.unlabelledLandmarks).toBe(0);
      expect(report.imagesWithoutAlt).toBe(0);
      expect(report.duplicateIds).toEqual([]);
      expect(report.unnamed, "controls without an accessible name").toEqual([]);
    });
  }
}

test("page titles are unique per page", async ({ page }) => {
  const titles = new Map<string, string>();
  for (const path of ["/", "/explore", "/live", "/clips", "/communities", "/blog", "/messages", "/notifications", "/bookmarks", "/dashboard", "/settings", "/wallet", "/pay", "/activity", "/people", "/me"]) {
    await page.goto(path);
    const t = await page.title();
    expect(titles.get(t), `"${t}" is used by both ${titles.get(t)} and ${path}`).toBeUndefined();
    titles.set(t, path);
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("users who ask for it get no animations", async ({ page }) => {
    await page.goto("/");
    await page.locator("main").waitFor();
    const longest = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll("*")].map((e) => parseFloat(getComputedStyle(e).animationDuration) || 0)));
    expect(longest).toBeLessThan(0.05);
  });
});
