import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { send, toast } = vi.hoisted(() => ({ send: vi.fn(), toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/tipping", async (orig) => ({ ...(await orig<typeof import("@/lib/tipping")>()), getTipService: () => ({ mode: "mock", send, list: () => [], subscribe: () => () => {} }) }));

import { TipDialog, GIFTS } from "@/components/amixof/tip";

function setup(props: Partial<React.ComponentProps<typeof TipDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onTipped = vi.fn();
  const onSent = vi.fn();
  render(<TipDialog open onOpenChange={onOpenChange} name="Kaydence" onTipped={onTipped} onSent={onSent} {...props} />);
  return { onOpenChange, onTipped, onSent, user: userEvent.setup() };
}
const sendButton = () => screen.getByRole("button", { name: /^(send \$|processing)/i });

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ id: "r1", status: "confirmed", mock: true });
});

describe("TipDialog (tip)", () => {
  it("is labelled, says no money moves in demo mode, and defaults to $5", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /send a tip/i })).toBeInTheDocument();
    expect(screen.getByText(/no money moves/i)).toBeInTheDocument();
    expect(sendButton()).toHaveTextContent("Send $5 to Kaydence");
  });

  it("changes the amount from the presets", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "$25" }));
    expect(sendButton()).toHaveTextContent("Send $25 to Kaydence");
    expect(screen.getByRole("button", { name: "$25" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([["0.5", /at least \$1/i], ["501", /maximum tip is \$500/i], ["abc", /at least \$1/i]])("blocks %s with a clear message", async (value, message) => {
    const { user } = setup();
    const box = screen.getByLabelText(/custom amount/i);
    await user.clear(box);
    await user.type(box, value);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(sendButton()).toBeDisabled();
    expect(box).toHaveAttribute("aria-invalid", "true");
  });

  it("sends exactly what was shown: amount, recipient, note and where it came from", async () => {
    const { user, onOpenChange, onTipped, onSent } = setup({ surface: "profile", surfaceId: "kaydence" });
    await user.click(screen.getByRole("button", { name: "$10" }));
    await user.type(screen.getByLabelText(/message/i), "great set");
    await user.click(sendButton());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(send).toHaveBeenCalledWith({ kind: "tip", recipient: "Kaydence", amount: 10, label: undefined, note: "great set", surface: "profile", surfaceId: "kaydence" });
    expect(onTipped).toHaveBeenCalledWith(10);
    expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ kind: "tip", to: "Kaydence", amount: 10, note: "great set" }));
    expect(toast.success).toHaveBeenCalledWith("Tipped Kaydence $10", expect.anything());
  });

  it("keeps the dialog open, says nothing was charged, and lets the user retry when sending fails", async () => {
    send.mockRejectedValueOnce(new Error("Network down"));
    const { user, onOpenChange, onTipped } = setup();
    await user.click(sendButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Network down"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onTipped).not.toHaveBeenCalled();
    expect(sendButton()).toBeEnabled();
    await user.click(sendButton()); // second try succeeds
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("can't be double-submitted while processing", async () => {
    let finish: (v: unknown) => void = () => {};
    send.mockReturnValue(new Promise((r) => (finish = r)));
    const { user } = setup();
    await user.click(sendButton());
    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /processing/i }));
    expect(send).toHaveBeenCalledTimes(1);
    finish({ id: "r" });
  });

  it("lets you choose who gets the tip when there are several recipients", async () => {
    const { user } = setup({ recipients: ["Kaydence", "BPM Bishop"] });
    await user.click(screen.getByRole("radio", { name: "BPM Bishop" }));
    await user.click(sendButton());
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ recipient: "BPM Bishop" })));
  });
});

describe("TipDialog (gift)", () => {
  it("sends the gift at its fixed price with its label", async () => {
    const { user } = setup({ mode: "gift" });
    expect(screen.getByRole("dialog", { name: /send a gift/i })).toBeInTheDocument();
    const rocket = GIFTS.find((g) => g.id === "rocket")!;
    await user.click(screen.getByRole("radio", { name: new RegExp(rocket.label) }));
    expect(sendButton()).toHaveTextContent(`Send $${rocket.price} to Kaydence`);
    await user.click(sendButton());
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ kind: "gift", amount: rocket.price, label: `${rocket.emoji} ${rocket.label}` })));
    expect(toast.success).toHaveBeenCalledWith(`Sent ${rocket.label} to Kaydence`, expect.anything());
  });

  it("has four gifts with sensible increasing prices", () => {
    expect(GIFTS).toHaveLength(4);
    const prices = GIFTS.map((g) => g.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(Math.min(...prices)).toBeGreaterThan(0);
  });
});
