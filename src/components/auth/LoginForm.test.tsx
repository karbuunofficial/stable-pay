import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionError } from "@/utils/supabase";

const sendCode = vi.fn();
const login = vi.fn();
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ sendCode, login }) }));

import LoginForm from "@/components/auth/LoginForm";

const emailBox = () => screen.getByLabelText(/email/i);
async function toCodeStep(user: ReturnType<typeof userEvent.setup>) {
  sendCode.mockResolvedValue(undefined);
  await user.type(emailBox(), "me@x.io");
  await user.click(screen.getByRole("button", { name: /send code/i }));
  await screen.findByLabelText(/code/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("LoginForm", () => {
  it("won't submit without an email", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /send code/i })).toBeDisabled();
  });

  it("sends the code and moves to the verification step", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user);
    expect(sendCode).toHaveBeenCalledWith("me@x.io");
  });

  it("shows an alert if the code could not be sent, and stays on the email step", async () => {
    const user = userEvent.setup();
    sendCode.mockRejectedValue(new Error("network"));
    render(<LoginForm />);
    await user.type(emailBox(), "me@x.io");
    await user.click(screen.getByRole("button", { name: /send code/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to send/i);
    expect(screen.queryByLabelText(/code/i)).not.toBeInTheDocument();
  });

  it("only enables Verify for a complete 6-digit code", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user);
    const verify = screen.getByRole("button", { name: /verify/i });
    await user.type(screen.getByLabelText(/code/i), "12345");
    expect(verify).toBeDisabled();
    await user.type(screen.getByLabelText(/code/i), "6");
    expect(verify).toBeEnabled();
  });

  it("logs in with the email and code", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(undefined);
    render(<LoginForm />);
    await toCodeStep(user);
    await user.type(screen.getByLabelText(/code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("me@x.io", "123456"));
  });

  it.each([
    [new Error("Failed to verify login code: 404 Not Found"), /invalid verification code/i],
    [new Error("Failed to verify login code: 429 Too Many"), /too many attempts/i],
    [new SessionError("Session exchange failed (502)", 502), /couldn't start your session/i],
    [new SessionError("Could not reach the session service", 0), /couldn't start your session/i],
    [new SessionError("Session exchange failed (401)", 401), /could not be verified/i],
  ])("explains a failed verification in plain language (%s)", async (error, message) => {
    const user = userEvent.setup();
    login.mockRejectedValue(error);
    render(<LoginForm />);
    await toCodeStep(user);
    await user.type(screen.getByLabelText(/code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert).not.toHaveTextContent(/Session exchange failed|client id/i); // no raw internals for users
  });

  it("lets people go back and fix the email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user);
    await user.click(screen.getByRole("button", { name: /(back|different|change)/i }));
    expect(emailBox()).toBeInTheDocument();
  });
});
