import { describe, expect, it, vi } from "vitest";
import { CHAINS, CHAIN_IDS, TOKENS, formatTokenAmount, getChainName, getDefaultChain, getDefaultToken, getTokenByAddress, parseTokenAmount } from "@/utils/contracts";

describe("formatTokenAmount", () => {
  it.each([
    ["1000000", 6, "1"],
    ["1500000", 6, "1.5"],
    ["1", 6, "0.000001"],
    ["123456789", 6, "123.456789"],
    ["0", 6, "0"],
    ["1000000000000000000", 18, "1"],
  ])("%s with %s decimals -> %s", (amount, decimals, expected) => expect(formatTokenAmount(amount, decimals)).toBe(expected));

  it.each([[undefined], [null], [""], ["undefined"], ["null"]])("treats %s as zero", (v) => expect(formatTokenAmount(v, 6)).toBe("0"));

  it("returns 0 (and logs) for garbage instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(formatTokenAmount("abc", 6)).toBe("0");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not lose precision on large balances", () => {
    expect(formatTokenAmount("123456789012345678901234567", 6)).toBe("123456789012345678901.234567");
  });
});

describe("parseTokenAmount", () => {
  it.each([
    ["1", 6, "1000000"],
    ["1.5", 6, "1500000"],
    ["0.000001", 6, "1"],
    [".5", 6, "500000"],
    ["100", 6, "100000000"],
  ])("%s -> %s", (amount, decimals, expected) => expect(parseTokenAmount(amount, decimals)).toBe(expected));

  it("truncates extra decimals instead of rounding up (never sends more than asked)", () => {
    expect(parseTokenAmount("1.9999999", 6)).toBe("1999999");
  });

  it("round-trips with formatTokenAmount", () => {
    for (const v of ["0.01", "12.345678", "1000", "0.000001"]) {
      expect(formatTokenAmount(parseTokenAmount(v, 6), 6)).toBe(v);
    }
  });
});

describe("chain and token config", () => {
  it("defaults to Base with USDC", () => {
    expect(getDefaultChain().id).toBe(CHAIN_IDS.BASE);
    expect(getDefaultToken().symbol).toBe("USDC");
  });
  it("looks tokens up case-insensitively", () => {
    const t = TOKENS[CHAIN_IDS.BASE]![0]!;
    expect(getTokenByAddress(CHAIN_IDS.BASE, t.address.toUpperCase())).toEqual(t);
    expect(getTokenByAddress(CHAIN_IDS.BASE, "0x0")).toBeUndefined();
  });
  it("names unknown chains instead of crashing", () => {
    expect(getChainName(8453)).toBeTruthy();
    expect(getChainName(999999)).toBe("Chain 999999");
  });
  it("gives every token a chain that is configured and 6 or more decimals", () => {
    for (const list of Object.values(TOKENS)) for (const t of list) {
      expect(CHAINS.some((c) => c.id === t.chainId)).toBe(true);
      expect(t.decimals).toBeGreaterThanOrEqual(6);
      expect(t.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});
