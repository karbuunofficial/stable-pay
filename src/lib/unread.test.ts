import { beforeEach, describe, expect, it } from "vitest";
import { markNotificationsSeen, unreadCount } from "@/lib/unread";
import type { NotificationView } from "@/lib/social/types";

const n = (createdAt: string | null, id = Math.random().toString()): NotificationView => ({ id, kind: "follow", actor: { handle: "a", name: "A", avatar: "" }, text: "followed you", time: "1m", createdAt, mention: false });

beforeEach(() => localStorage.clear());

describe("unreadCount", () => {
  it("counts everything until the page has been opened once", () => {
    expect(unreadCount([n("2026-10-01T00:00:00Z"), n(null)], null)).toBe(2);
  });
  it("counts only items newer than the last visit", () => {
    const seen = "2026-10-10T00:00:00Z";
    expect(unreadCount([n("2026-10-09T00:00:00Z"), n("2026-10-11T00:00:00Z"), n("2026-10-12T00:00:00Z")], seen)).toBe(2);
  });
  it("never counts items with no timestamp once the page has been seen (demo samples don't reappear)", () => {
    expect(unreadCount([n(null), n(null)], "2026-10-10T00:00:00Z")).toBe(0);
  });
  it("is zero for an empty list", () => {
    expect(unreadCount([], null)).toBe(0);
  });
});

describe("markNotificationsSeen", () => {
  it("remembers the visit per profile", () => {
    markNotificationsSeen("p1", new Date("2026-10-29T10:00:00Z"));
    expect(localStorage.getItem("amixof-notifications-seen:p1")).toBe("2026-10-29T10:00:00.000Z");
    expect(localStorage.getItem("amixof-notifications-seen:p2")).toBeNull();
  });
  it("doesn't throw when storage is unavailable", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("quota"); };
    expect(() => markNotificationsSeen("p1")).not.toThrow();
    Storage.prototype.setItem = orig;
  });
});
