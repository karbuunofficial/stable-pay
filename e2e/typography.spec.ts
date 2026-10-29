import { expect, test } from "./fixtures";

// Typography and density audit across every page, at a narrow phone (320) and a laptop (1280).
const ROUTES = [
  "/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/communities/atlhiphop", "/blog", "/blog/the-sample-economy", "/messages",
  "/notifications", "/bookmarks", "/dashboard", "/admin", "/admin/media", "/settings", "/wallet", "/pay", "/activity", "/people", "/me", "/profile/kaydence", "/post/p1",
];
// the deliberate scale (px): captions to display
const SIZES = new Set([10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 30]);

for (const width of [320, 1280]) {
  test.describe(`typography @ ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of ROUTES) {
      test(`${path}: on-scale sizes, one h1 size, no overflow, readable measure`, async ({ page }) => {
        await page.goto(path);
        await page.locator("main").waitFor();
        const r = await page.evaluate(() => {
          const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
          const sizes = new Set<number>();
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (n.textContent!.trim() && n.parentElement && vis(n.parentElement)) sizes.add(parseFloat(getComputedStyle(n.parentElement).fontSize));
          }
          const h1 = [...document.querySelectorAll("h1")].filter(vis).map((e) => parseFloat(getComputedStyle(e).fontSize));
          // longest unbroken run of prose: characters per line approximated from width / avg glyph width (0.5em)
          const prose = [...document.querySelectorAll("main p")].filter(vis).filter((p) => (p.textContent ?? "").length > 160).map((p) => {
            const cs = getComputedStyle(p); return p.getBoundingClientRect().width / (parseFloat(cs.fontSize) * 0.5);
          });
          return { sizes: [...sizes], h1, overflow: document.documentElement.scrollWidth - window.innerWidth, prose };
        });
        expect(r.overflow).toBeLessThanOrEqual(0);
        expect(r.sizes.filter((s) => !SIZES.has(s))).toEqual([]);
        expect(Math.min(...r.sizes)).toBeGreaterThanOrEqual(10);
        expect(r.h1.length).toBeLessThanOrEqual(1);
        for (const h of r.h1) expect([16, 20, 30]).toContain(h); // 16 = sr-only/gated; titles are 20; display heroes 30
        for (const chars of r.prose) expect(chars).toBeLessThanOrEqual(90);
      });
    }
  });
}
