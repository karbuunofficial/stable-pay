/** Absolute URL of a post's page. */
export const postUrl = (id: string) => `${window.location.origin}/post/${id}`;

/** Copies text to the clipboard. Resolves false (instead of throwing) when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Opens the system share sheet when there is one, otherwise copies the link. */
export async function shareLink(data: { title: string; text?: string; url: string }): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      return (e as DOMException)?.name === "AbortError" ? "cancelled" : "failed";
    }
  }
  return (await copyText(data.url)) ? "copied" : "failed";
}
