import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, postUrl, shareLink } from "@/lib/share";

const setNavigator = (props: Record<string, unknown>) => { for (const [k, v] of Object.entries(props)) Object.defineProperty(navigator, k, { value: v, configurable: true }); };
afterEach(() => { setNavigator({ clipboard: undefined, share: undefined }); vi.restoreAllMocks(); });

describe("postUrl", () => {
  it("is an absolute link to the post page", () => {
    expect(postUrl("p1")).toBe(`${window.location.origin}/post/p1`);
  });
});

describe("copyText", () => {
  it("uses the clipboard API and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports failure instead of throwing when the browser refuses and there is no fallback", async () => {
    setNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    document.execCommand = vi.fn().mockReturnValue(false);
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("falls back to the legacy copy command when there is no clipboard API", async () => {
    setNavigator({ clipboard: undefined });
    document.execCommand = vi.fn().mockReturnValue(true);
    await expect(copyText("hello")).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull(); // the temporary field is cleaned up
  });
});

describe("shareLink", () => {
  const data = { title: "T", url: "https://x.test/post/1" };

  it("opens the system share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share });
    await expect(shareLink(data)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
  });

  it("treats closing the share sheet as a cancel, not an error", async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")) });
    await expect(shareLink(data)).resolves.toBe("cancelled");
  });

  it("reports a real sharing failure", async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(shareLink(data)).resolves.toBe("failed");
  });

  it("copies the link when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share: undefined, clipboard: { writeText } });
    await expect(shareLink(data)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });
});
