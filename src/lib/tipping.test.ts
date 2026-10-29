import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIP_MAX, TIP_MIN, createMockTipService, validateTip, type TipRequest } from "@/lib/tipping";

const tip = (over: Partial<TipRequest> = {}): TipRequest => ({ kind: "tip", recipient: "Kaydence", amount: 5, ...over });

beforeEach(() => localStorage.clear());

describe("validateTip", () => {
  it.each([
    [TIP_MIN, ""],
    [TIP_MAX, ""],
    ["5", ""],
    ["12.50", ""],
  ])("accepts %s", (amount, expected) => expect(validateTip(amount)).toBe(expected));

  it.each([[0], [0.99], [-5], [TIP_MAX + 0.01], [1000], ["abc"], [""], [NaN]])("rejects %s", (amount) => {
    expect(validateTip(amount as number | string)).not.toBe("");
  });

  it("says which limit was broken", () => {
    expect(validateTip(0.5)).toMatch(/at least \$1/);
    expect(validateTip(501)).toMatch(/Maximum tip is \$500/);
  });
});

describe("mock tip service", () => {
  it("confirms a tip, marks it as mock, and lists it newest first", async () => {
    const s = createMockTipService({ latencyMs: 0 });
    const a = await s.send(tip({ amount: 2 }));
    const b = await s.send(tip({ amount: 10, recipient: "BPM Bishop" }));
    expect(a).toMatchObject({ status: "confirmed", mock: true });
    expect(a.id).not.toBe(b.id);
    expect(s.list().map((r) => r.request.amount)).toEqual([10, 2]);
    expect(s.mode).toBe("mock");
  });

  it("rejects an out-of-range tip without recording it", async () => {
    const s = createMockTipService({ latencyMs: 0 });
    await expect(s.send(tip({ amount: 0.5 }))).rejects.toThrow(/at least \$1/);
    await expect(s.send(tip({ amount: 501 }))).rejects.toThrow(/Maximum/);
    expect(s.list()).toHaveLength(0);
  });

  it("does not range-check gifts (their prices are fixed)", async () => {
    const s = createMockTipService({ latencyMs: 0 });
    await expect(s.send(tip({ kind: "gift", amount: 2, label: "🎤 Mic Drop" }))).resolves.toMatchObject({ status: "confirmed" });
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const s = createMockTipService({ latencyMs: 0 });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    await s.send(tip());
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    await s.send(tip());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("persists receipts across instances (page reloads)", async () => {
    await createMockTipService({ latencyMs: 0 }).send(tip({ amount: 7 }));
    expect(createMockTipService({ latencyMs: 0 }).list()[0]?.request.amount).toBe(7);
  });

  it("keeps only the latest 100 receipts", async () => {
    const s = createMockTipService({ latencyMs: 0 });
    for (let i = 0; i < 105; i++) await s.send(tip({ amount: 1 + (i % 5) }));
    expect(s.list()).toHaveLength(100);
  });

  it("still works when storage is unavailable", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const s = createMockTipService({ latencyMs: 0 });
    await expect(s.send(tip())).resolves.toBeDefined();
    expect(s.list()).toHaveLength(1);
    spy.mockRestore();
  });

  it("survives corrupt stored data", () => {
    localStorage.setItem("stablepay-mock-tips", "{not json");
    expect(createMockTipService({ latencyMs: 0 }).list()).toEqual([]);
  });
});
