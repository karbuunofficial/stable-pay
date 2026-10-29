import { describe, expect, it } from "vitest";
import { POST_LIMIT, formatCount, validatePost } from "@/lib/composer";

describe("validatePost", () => {
  it("rejects empty and whitespace-only posts", () => {
    expect(validatePost("").ok).toBe(false);
    expect(validatePost("   \n ").ok).toBe(false);
  });
  it("reports characters remaining", () => {
    expect(validatePost("hello").remaining).toBe(POST_LIMIT - 5);
  });
  it("accepts exactly the limit and rejects one over, with a message", () => {
    expect(validatePost("a".repeat(POST_LIMIT)).ok).toBe(true);
    const over = validatePost("a".repeat(POST_LIMIT + 1));
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(-1);
    expect(over.error).toBeTruthy();
  });
});

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1K"],
    [4100, "4.1K"],
    [128400, "128.4K"],
    [1_500_000, "1.5M"],
  ])("%s -> %s", (n, out) => expect(formatCount(n)).toBe(out));
});
