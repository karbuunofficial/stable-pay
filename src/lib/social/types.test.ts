import { describe, expect, it } from "vitest";
import { timeAgo } from "@/lib/social/types";

const NOW = new Date("2026-10-29T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

describe("timeAgo", () => {
  it.each([
    [0, "now"],
    [30_000, "now"],
    [MIN, "1m"],
    [59 * MIN, "59m"],
    [60 * MIN, "1h"],
    [23 * 60 * MIN, "23h"],
    [24 * 60 * MIN, "1d"],
    [6 * 24 * 60 * MIN, "6d"],
  ])("%sms ago -> %s", (ms, label) => expect(timeAgo(ago(ms), NOW)).toBe(label));

  it("falls back to a date after a week", () => {
    expect(timeAgo(ago(8 * 24 * 60 * MIN), NOW)).toMatch(/\w/);
    expect(timeAgo(ago(8 * 24 * 60 * MIN), NOW)).not.toMatch(/^\d+d$/);
  });

  it("never shows a negative time for a timestamp slightly in the future (clock skew)", () => {
    expect(timeAgo(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe("now");
  });
});
