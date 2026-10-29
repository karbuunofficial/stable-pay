import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  getUserByUsername: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUser: vi.fn(),
  refreshUser: vi.fn(),
}));
vi.mock("../../utils/supabase", () => ({ getUserByUsername: h.getUserByUsername, updateUserProfile: h.updateUserProfile }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" }, walletAddress: "0xAAA", updateUser: h.updateUser, refreshUser: h.refreshUser }) }));

import UsernameSetup from "@/components/auth/UsernameSetup";

const box = () => screen.getByPlaceholderText("yourusername");
const submit = () => screen.getByRole("button", { name: /continue|get started|complete|save|finish/i });
const settle = (ms = 600) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  h.getUserByUsername.mockResolvedValue(null);
  h.updateUserProfile.mockResolvedValue({ id: "u1", username: "newname" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("UsernameSetup availability check", () => {
  it("lowercases and strips anything but letters, digits and underscores", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "Hu$tle Big-1!");
    expect(box()).toHaveValue("hutlebig1");
  });

  it("does not hit the server for names under 3 characters", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "ab");
    await settle();
    expect(h.getUserByUsername).not.toHaveBeenCalled();
  });

  it("checks once after typing pauses, not once per keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "hustlebig");
    await settle();
    expect(h.getUserByUsername).toHaveBeenCalledTimes(1);
    expect(h.getUserByUsername).toHaveBeenCalledWith("hustlebig");
  });

  it("ignores a slow answer for a name that is no longer in the box", async () => {
    // "abc" is slow and says taken; "abcd" is fast and says free. The box shows "abcd", so the result must be "free".
    let resolveAbc: (v: unknown) => void = () => {};
    h.getUserByUsername.mockImplementation((n: string) => (n === "abc" ? new Promise((r) => (resolveAbc = r)) : Promise.resolve(null)));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "abc");
    await settle();
    await user.type(box(), "d");
    await settle();
    await act(async () => { resolveAbc({ id: "someone" }); }); // the stale "taken" answer arrives last
    expect(submit()).toBeEnabled();
    expect(screen.queryByText(/already taken|not available|taken/i)).not.toBeInTheDocument();
  });

  it("enables the submit button only for an available name of 3+ characters", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    expect(submit()).toBeDisabled();
    await user.type(box(), "free_name");
    await settle();
    expect(submit()).toBeEnabled();
  });

  it("keeps submit disabled for a taken name", async () => {
    h.getUserByUsername.mockResolvedValue({ id: "other" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "taken_name");
    await settle();
    expect(submit()).toBeDisabled();
  });

  it("treats a failed availability lookup as unknown, not as available", async () => {
    h.getUserByUsername.mockRejectedValue(new Error("network"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "some_name");
    await settle();
    expect(submit()).toBeDisabled();
  });
});

describe("UsernameSetup submit", () => {
  async function fill() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UsernameSetup />);
    await user.type(box(), "newname");
    await settle();
    return user;
  }

  it("saves the username for the signed-in wallet and refreshes the user", async () => {
    const user = await fill();
    await user.click(submit());
    expect(h.updateUserProfile).toHaveBeenCalledWith("0xAAA", { username: "newname", display_name: "newname" });
    expect(h.updateUser).toHaveBeenCalled();
    expect(h.refreshUser).toHaveBeenCalled();
  });

  it("explains a username conflict that slipped past the check", async () => {
    h.updateUserProfile.mockRejectedValue(new Error('duplicate key value violates unique constraint "users_username_key"'));
    const user = await fill();
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(/already taken/i);
  });

  it("shows a generic error for other failures", async () => {
    h.updateUserProfile.mockRejectedValue(new Error("permission denied"));
    const user = await fill();
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to set username/i);
  });
});
