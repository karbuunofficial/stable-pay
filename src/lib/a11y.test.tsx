import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installRovingFocus, useRestoreFocus } from "@/lib/a11y";

installRovingFocus();

function Tabs({ onPick }: { onPick?: (k: string) => void }) {
  const [sel, setSel] = useState("a");
  return (
    <div role="tablist" aria-label="Demo">
      {["a", "b", "c"].map((k) => (
        <button key={k} role="tab" aria-selected={sel === k} onClick={() => { setSel(k); onPick?.(k); }}>{k}</button>
      ))}
    </div>
  );
}

const tabIndexes = () => screen.getAllByRole("tab").map((t) => t.tabIndex);

describe("roving focus for tabs and radios", () => {
  beforeEach(() => document.body.replaceChildren());

  it("puts only the selected tab in the Tab order", async () => {
    render(<Tabs />);
    await waitFor(() => expect(tabIndexes()).toEqual([0, -1, -1]));
  });

  it("moves focus and selection with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    const picked = vi.fn();
    render(<Tabs onPick={picked} />);
    screen.getByRole("tab", { name: "a" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "b" })).toHaveFocus();
    expect(picked).toHaveBeenLastCalledWith("b");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "a" })).toHaveFocus(); // wrapped
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "c" })).toHaveFocus(); // wrapped backwards
    await waitFor(() => expect(tabIndexes()).toEqual([-1, -1, 0]));
  });

  it("supports Home and End", async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    screen.getByRole("tab", { name: "b" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "c" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "a" })).toHaveFocus();
  });

  it("works for radio groups too, and ignores other keys", async () => {
    const user = userEvent.setup();
    render(
      <div role="radiogroup" aria-label="Pick">
        <button role="radio" aria-checked="true">one</button>
        <button role="radio" aria-checked="false">two</button>
      </div>,
    );
    screen.getByRole("radio", { name: "one" }).focus();
    await user.keyboard("x");
    expect(screen.getByRole("radio", { name: "one" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "two" })).toHaveFocus();
  });

  it("skips disabled items and leaves modifier shortcuts alone", async () => {
    const user = userEvent.setup();
    render(
      <div role="tablist" aria-label="x">
        <button role="tab" aria-selected="true">a</button>
        <button role="tab" aria-selected="false" disabled>b</button>
        <button role="tab" aria-selected="false">c</button>
      </div>,
    );
    screen.getByRole("tab", { name: "a" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "c" })).toHaveFocus();
    screen.getByRole("tab", { name: "a" }).focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getByRole("tab", { name: "a" })).toHaveFocus();
  });

  it("does not touch tab-like elements outside a tablist", async () => {
    const user = userEvent.setup();
    render(<><button role="tab">loose</button><button role="tab">other</button></>);
    screen.getByRole("tab", { name: "loose" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "loose" })).toHaveFocus();
  });
});

describe("useRestoreFocus", () => {
  afterEach(() => document.body.replaceChildren());

  it("returns focus to the element that was focused when the dialog opened", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { result } = renderHook(() => useRestoreFocus());
    result.current.onOpenAutoFocus(new Event("focus"));
    document.body.focus();
    const close = new Event("focus", { cancelable: true });
    result.current.onCloseAutoFocus(close);
    expect(close.defaultPrevented).toBe(true);
    expect(opener).toHaveFocus();
  });

  it("falls back to the default when the opener is gone", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { result } = renderHook(() => useRestoreFocus());
    result.current.onOpenAutoFocus(new Event("focus"));
    opener.remove();
    const close = new Event("focus", { cancelable: true });
    result.current.onCloseAutoFocus(close);
    expect(close.defaultPrevented).toBe(false);
  });

  it("calls through to the caller's own handlers and respects their preventDefault", () => {
    const own = vi.fn((e: Event) => e.preventDefault());
    const { result } = renderHook(() => useRestoreFocus({ onCloseAutoFocus: own }));
    const close = new Event("focus", { cancelable: true });
    result.current.onCloseAutoFocus(close);
    expect(own).toHaveBeenCalled();
  });
});
