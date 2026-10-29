import { describe, expect, it } from "vitest";
import { recordView, shouldCount } from "@/lib/views";

describe("views", () => {
  it("counts at 50% visible for 1s", () => expect(shouldCount(new Set(), "p1", 0.5, 1000)).toBe(true));
  it("ignores brief scroll-past", () => expect(shouldCount(new Set(), "p1", 1, 400)).toBe(false));
  it("ignores mostly off-screen", () => expect(shouldCount(new Set(), "p1", 0.3, 5000)).toBe(false));
  it("counts once per session", () => {
    expect(recordView("x1")).toBe(true);
    expect(recordView("x1")).toBe(false);
  });
});
