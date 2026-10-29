import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useKeyboardOpen } from "@/components/amixof/shell";

// jsdom has no visualViewport: fake the one thing the hook reads (height + resize events)
function fakeViewport(height: number) {
  const target = new EventTarget();
  const vv = Object.assign(target, { height });
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  return { resize(h: number) { vv.height = h; target.dispatchEvent(new Event("resize")); } };
}

function Probe() {
  const open = useKeyboardOpen();
  return (<><input aria-label="field" /><button>btn</button><output>{open ? "open" : "closed"}</output></>);
}

afterEach(() => Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true }));

describe("useKeyboardOpen", () => {
  it("is closed by default", () => {
    fakeViewport(800);
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveTextContent("closed");
  });

  it("opens when a text field is focused and the visual viewport shrinks a lot, closes when it recovers", () => {
    const vp = fakeViewport(800);
    render(<Probe />);
    act(() => screen.getByLabelText("field").focus());
    act(() => vp.resize(480)); // keyboard up
    expect(screen.getByRole("status")).toHaveTextContent("open");
    act(() => vp.resize(800));
    expect(screen.getByRole("status")).toHaveTextContent("closed");
  });

  it("stays closed when the viewport shrinks without a field focused (browser chrome, split view)", () => {
    const vp = fakeViewport(800);
    render(<Probe />);
    act(() => screen.getByText("btn").focus());
    act(() => vp.resize(480));
    expect(screen.getByRole("status")).toHaveTextContent("closed");
  });

  it("ignores small changes (address bar collapsing)", () => {
    const vp = fakeViewport(800);
    render(<Probe />);
    act(() => screen.getByLabelText("field").focus());
    act(() => vp.resize(740));
    expect(screen.getByRole("status")).toHaveTextContent("closed");
  });

  it("does nothing where visualViewport is missing", () => {
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
    render(<Probe />);
    act(() => screen.getByLabelText("field").focus());
    expect(screen.getByRole("status")).toHaveTextContent("closed");
  });
});
