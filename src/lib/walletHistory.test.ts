import { describe, expect, it } from "vitest";
import { buildWalletRows, timeAgo } from "@/lib/walletHistory";
import type { TipReceipt } from "@/lib/tipping";

const NOW = new Date("2026-10-29T12:00:00Z").getTime();
const receipt = (over: Partial<TipReceipt["request"]> = {}, createdAt = NOW - 5 * 60_000): TipReceipt => ({
  id: `r${createdAt}`, status: "confirmed", mock: true, createdAt, request: { kind: "tip", recipient: "Kaydence", amount: 10, ...over },
});

describe("wallet rows", () => {
  it("in a connected app lists ONLY what the user did: no sample payouts or gifts", () => {
    const rows = buildWalletRows([receipt()], { includeSample: false, now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "Tip sent", who: "Kaydence", amount: -10, time: "5m" });
    expect(rows.some((r) => /sample|payout|received/i.test(r.kind))).toBe(false);
  });

  it("is empty for a user with no activity (so the page can show an empty state)", () => {
    expect(buildWalletRows([], { includeSample: false })).toEqual([]);
  });

  it("in the demo build adds sample rows, each labelled as a sample, after the user's own", () => {
    const rows = buildWalletRows([receipt()], { includeSample: true, now: NOW });
    expect(rows[0]!.kind).toBe("Tip sent");
    const samples = rows.slice(1);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(s.kind).toMatch(/\(sample\)$/);
  });

  it("describes gifts with their label and records money going out as negative", () => {
    const [row] = buildWalletRows([receipt({ kind: "gift", amount: 25, label: "🚀 Rocket" })], { includeSample: false, now: NOW });
    expect(row).toMatchObject({ kind: "Gift sent · 🚀 Rocket", amount: -25 });
  });
});

describe("timeAgo", () => {
  it.each([[0, "Just now"], [30_000, "Just now"], [5 * 60_000, "5m"], [90 * 60_000, "1h"], [3 * 3_600_000, "3h"]])("%sms ago -> %s", (ms, label) => {
    expect(timeAgo(NOW - ms, NOW)).toBe(label);
  });
  it("falls back to a date after a day", () => {
    expect(timeAgo(NOW - 3 * 86_400_000, NOW)).not.toMatch(/^\d+[mh]$/);
  });
});
