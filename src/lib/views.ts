// Facebook-style view counting (demo, client-only).
// A view counts once per viewer per item per session, when the item is
// ≥50% on screen for ≥1s in a feed, or immediately when its page is opened.
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

export const VISIBLE_RATIO = 0.5;
export const DWELL_MS = 1000;
const KEY = "amixof:viewed";

/** Deterministic demo baseline so counts look real without a backend. */
export function baseViews(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 800 + (h % 48000);
}

export function shouldCount(seen: ReadonlySet<string>, id: string, ratio: number, dwellMs: number): boolean {
  return !seen.has(id) && ratio >= VISIBLE_RATIO && dwellMs >= DWELL_MS;
}

let seen = new Set<string>();
let loaded = false;
const subs = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { seen = new Set(JSON.parse(sessionStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ }
}
export function recordView(id: string): boolean {
  load();
  if (seen.has(id)) return false;
  seen = new Set(seen).add(id);
  try { sessionStorage.setItem(KEY, JSON.stringify([...seen])); } catch { /* ignore */ }
  subs.forEach((f) => f());
  return true;
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Returns the displayed view count; counts a view by visibility (ref) or on mount (immediate). */
export function useViews(id: string, opts: { ref?: RefObject<Element | null> | undefined; immediate?: boolean | undefined; base?: number } = {}): number {
  const viewed = useSyncExternalStore(subscribe, () => { load(); return seen.has(id); }, () => false);
  const [, force] = useState(0);
  const { ref, immediate } = opts;
  useEffect(() => {
    if (immediate) { recordView(id); force((n) => n + 1); return; }
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e && e.intersectionRatio >= VISIBLE_RATIO) timer ??= setTimeout(() => { recordView(id); io.disconnect(); }, DWELL_MS);
      else { clearTimeout(timer); timer = undefined; }
    }, { threshold: [0, VISIBLE_RATIO, 1] });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [id, ref, immediate]);
  return (opts.base ?? baseViews(id)) + (viewed ? 1 : 0);
}
