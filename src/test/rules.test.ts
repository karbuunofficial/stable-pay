import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/theme";
import { validatePost } from "@/lib/composer";

describe("theme", () => {
  it("defaults first-time visitors to dark", () => {
    expect(resolveTheme(null)).toBe("dark");
  });
  it("keeps a returning user's saved light theme", () => {
    expect(resolveTheme("light")).toBe("light");
  });
});

describe("composer", () => {
  it("allows exactly 500 characters", () => {
    expect(validatePost("a".repeat(500)).ok).toBe(true);
  });
  it("rejects 501 characters", () => {
    expect(validatePost("a".repeat(501)).ok).toBe(false);
  });
});

import { tipError } from "@/components/amixof/tip";
describe("tips", () => {
  it("rejects tips under $1", () => { expect(tipError("0.5")).not.toBe(""); });
  it("rejects tips over $500", () => { expect(tipError("501")).not.toBe(""); });
  it("accepts $500", () => { expect(tipError("500")).toBe(""); });
});
