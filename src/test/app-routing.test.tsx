import { describe, expect, it } from "vitest";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

// Match routes without rendering: this catches renamed/removed route files and broken params.
const router = createRouter({ routeTree });
const match = (path: string) => router.matchRoutes(path).at(-1)?.routeId;

describe("App routing", () => {
  it.each([
    "/", "/explore", "/live", "/live/kaydence", "/clips", "/communities", "/communities/atlhiphop", "/blog", "/blog/the-sample-economy",
    "/messages", "/messages/c1", "/notifications", "/bookmarks", "/dashboard", "/admin", "/admin/media", "/settings", "/wallet",
    "/pay", "/activity", "/people", "/me", "/post/p1", "/profile/kaydence",
  ])("%s resolves to a page", (path) => {
    expect(match(path)).not.toBe(rootRouteId);
  });

  it("falls back to the root (not-found) for unknown paths", () => {
    expect(match("/definitely/not/a/page")).toBe(rootRouteId);
  });

  it("extracts route params", () => {
    expect(router.matchRoutes("/profile/kaydence").at(-1)?.params).toEqual({ handle: "kaydence" });
    expect(router.matchRoutes("/post/p7").at(-1)?.params).toEqual({ id: "p7" });
  });

  it("keeps the payment pages on their own routes", () => {
    for (const p of ["/pay", "/activity", "/people", "/me"]) expect(match(p)).toBe(`${p}`);
  });
});
