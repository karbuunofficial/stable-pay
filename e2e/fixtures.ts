import { test as base, expect } from "@playwright/test";

/**
 * The sample content links to third-party image and video hosts. Tests must not depend on them: they make runs slow,
 * flaky and impossible offline. Every external request is answered locally (images get a 1x1 transparent GIF).
 */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export const test = base.extend({
  page: async ({ page, baseURL }, provide) => {
    const origin = new URL(baseURL!).origin;
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
      if (route.request().resourceType() === "image") return route.fulfill({ status: 200, contentType: "image/gif", body: PIXEL });
      return route.fulfill({ status: 204, body: "" }); // fonts, video and anything else
    });
    await provide(page);
  },
});
export { expect };
