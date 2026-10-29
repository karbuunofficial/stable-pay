import { useRef } from "react";

/**
 * Keyboard support for custom tab and radio widgets (role="tablist" / role="radiogroup").
 *
 * Implements the WAI-ARIA pattern once for the whole app instead of per component:
 *  - Arrow keys move focus (and select, since these are all selection-follows-focus controls),
 *    Home/End jump to the first/last item
 *  - roving tabindex: only the selected item is in the Tab order, so Tab moves past the group
 *
 * Works on any element with role="tab" or role="radio" inside a tablist/radiogroup, so new
 * widgets get it for free. Call once at startup.
 */
const ITEM = '[role="tab"], [role="radio"]';
const GROUP = '[role="tablist"], [role="radiogroup"]';

const itemsOf = (group: HTMLElement) =>
  Array.from(group.querySelectorAll<HTMLElement>(ITEM)).filter(
    (el) => !el.hasAttribute("disabled") && el.closest(GROUP) === group,
  );

const isSelected = (el: HTMLElement) => el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true";

function syncGroup(group: HTMLElement) {
  const items = itemsOf(group);
  if (!items.length) return;
  const current = items.find(isSelected) ?? items[0]!;
  for (const el of items) el.tabIndex = el === current ? 0 : -1;
}

const syncAll = () => document.querySelectorAll<HTMLElement>(GROUP).forEach(syncGroup);

export function installRovingFocus() {
  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target?.matches?.(ITEM) || e.altKey || e.ctrlKey || e.metaKey) return;
    const group = target.closest<HTMLElement>(GROUP);
    if (!group) return;
    const items = itemsOf(group);
    const i = items.indexOf(target);
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = items[(i + 1) % items.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = items[(i - 1 + items.length) % items.length];
        break;
      case "Home":
        next = items[0];
        break;
      case "End":
        next = items[items.length - 1];
        break;
      default:
        return;
    }
    if (!next) return;
    e.preventDefault();
    next.focus();
    next.click();
  });

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncAll();
    });
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-checked", "disabled"] });
  syncAll();
}

/**
 * Radix only restores focus to a <DialogTrigger>. Our dialogs and sheets are opened from plain buttons through
 * state, so on close focus used to fall back to the top of the page. Spread the result onto a Radix *Content:
 * it remembers the element focused when the dialog opened and returns focus there on close.
 */
export function useRestoreFocus(props: { onOpenAutoFocus?: ((e: Event) => void) | undefined; onCloseAutoFocus?: ((e: Event) => void) | undefined } = {}) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (e: Event) => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      props.onOpenAutoFocus?.(e);
    },
    onCloseAutoFocus: (e: Event) => {
      props.onCloseAutoFocus?.(e);
      const el = opener.current;
      if (!e.defaultPrevented && el && el.isConnected && el !== document.body) {
        e.preventDefault();
        el.focus();
      }
    },
  };
}
