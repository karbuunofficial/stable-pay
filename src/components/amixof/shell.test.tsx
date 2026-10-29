import { describe, expect, it } from "vitest";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { navGroups } from "@/components/amixof/shell";

const router = createRouter({ routeTree });
const all = navGroups.flatMap((g) => g.items);

describe("navigation config (feeds the top bar, side nav, mobile bar and More sheet)", () => {
  it("has no duplicate labels or destinations", () => {
    const labels = all.map((i) => i.label);
    const paths = all.map((i) => String(i.to));
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("only links to pages that exist", () => {
    for (const i of all) expect(router.matchRoutes(String(i.to)).at(-1)?.routeId, `${i.label} -> ${String(i.to)}`).not.toBe(rootRouteId);
  });

  it("keeps the phone bar to four destinations plus More, and includes Home", () => {
    const mobile = all.filter((i) => i.mobile);
    expect(mobile.length).toBeLessThanOrEqual(4);
    expect(mobile.map((i) => i.label)).toContain("Home");
  });

  it("groups the payment pages together and puts Account under Account", () => {
    const payments = navGroups.find((g) => g.label === "Payments")!.items.map((i) => i.label);
    expect(payments).toEqual(expect.arrayContaining(["Pay", "Wallet", "Activity", "Find people"]));
    expect(navGroups.find((g) => g.label === "Account")!.items.map((i) => i.label)).toContain("Account");
  });

  it("gives every item an icon and a non-empty label", () => {
    for (const i of all) { expect(i.label.trim()).not.toBe(""); expect(i.icon).toBeTruthy(); }
  });
});
