import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  class FakeSessionError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  }
  return {
    FakeSessionError,
    exchangeSession: vi.fn(),
    setSupabaseAccessToken: vi.fn(),
    verifyLoginCode: vi.fn(),
    sendLoginCode: vi.fn(),
    clearQueries: vi.fn(),
  };
});
const { FakeSessionError, exchangeSession, setSupabaseAccessToken, verifyLoginCode, sendLoginCode, clearQueries } = h;

vi.mock("../utils/supabase", () => ({ SessionError: h.FakeSessionError, exchangeSession: h.exchangeSession, setSupabaseAccessToken: h.setSupabaseAccessToken }));
vi.mock("../utils/thirdwebAPI", () => ({ verifyLoginCode: h.verifyLoginCode, sendLoginCode: h.sendLoginCode }));
vi.mock("../lib/queryClient", () => ({ queryClient: { clear: h.clearQueries } }));

import { AuthProvider, useAuth } from "@/context/AuthContext";

const user = { id: "u1", username: "me", display_name: "Me", email: "me@x.io", wallet_address: "0xAAA", created_at: "", updated_at: "" };
const nowSec = () => Math.floor(Date.now() / 1000);
const session = (over = {}) => ({ access_token: "sb.jwt", expires_at: nowSec() + 3600, user, ...over });
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const mount = () => renderHook(() => useAuth(), { wrapper });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("restoring a session", () => {
  it("is signed out and not loading when nothing is stored (and never calls the server)", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ isAuthenticated: false, user: null });
    expect(exchangeSession).not.toHaveBeenCalled();
  });

  it("signs in as whoever the server says the token belongs to", async () => {
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValue(session());
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(exchangeSession).toHaveBeenCalledWith("tw-real");
    expect(result.current.user).toEqual(user);
    expect(result.current.walletAddress).toBe("0xAAA"); // from the server's user row
    expect(setSupabaseAccessToken).toHaveBeenCalledWith("sb.jwt");
  });

  it("does NOT trust a wallet address saved in the browser", async () => {
    // the old vulnerability: a hand-edited wallet_address used to be enough to be "logged in" as someone
    localStorage.setItem("wallet_address", "0xVICTIM");
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("wallet_address")).toBeNull(); // and the stale key is removed
  });

  it("ignores a spoofed wallet address next to a real token: identity comes from the server", async () => {
    localStorage.setItem("thirdweb_token", "tw-real");
    localStorage.setItem("wallet_address", "0xVICTIM");
    exchangeSession.mockResolvedValue(session());
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.walletAddress).toBe("0xAAA");
    expect(result.current.walletAddress).not.toBe("0xVICTIM");
  });

  it("rejects a forged token: signs out, clears it, and drops cached data", async () => {
    localStorage.setItem("thirdweb_token", "forged");
    exchangeSession.mockRejectedValue(new FakeSessionError("nope", 401));
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("thirdweb_token")).toBeNull();
    expect(setSupabaseAccessToken).toHaveBeenCalledWith(null);
    expect(clearQueries).toHaveBeenCalled();
  });

  it.each([0, 502, 500])("keeps the token when the service is merely unreachable (status %s)", async (status) => {
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockRejectedValue(new FakeSessionError("down", status));
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("thirdweb_token")).toBe("tw-real"); // a hiccup must not log people out for good
  });
});

describe("logging in and out", () => {
  it("sends the code through thirdweb", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.sendCode("me@x.io"));
    expect(sendLoginCode).toHaveBeenCalledWith("me@x.io");
  });

  it("verifies the code, exchanges the token, stores it, and signs in", async () => {
    verifyLoginCode.mockResolvedValue({ token: "tw-new", walletAddress: "0xAAA", isNewUser: true });
    exchangeSession.mockResolvedValue(session());
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.login("me@x.io", "123456"));
    expect(verifyLoginCode).toHaveBeenCalledWith("me@x.io", "123456");
    expect(exchangeSession).toHaveBeenCalledWith("tw-new");
    expect(localStorage.getItem("thirdweb_token")).toBe("tw-new");
    expect(result.current).toMatchObject({ isAuthenticated: true, user });
  });

  it("stays signed out and rethrows when the code is wrong", async () => {
    verifyLoginCode.mockRejectedValue(new Error("bad code"));
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(act(() => result.current.login("me@x.io", "000000"))).rejects.toThrow("bad code");
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(localStorage.getItem("thirdweb_token")).toBeNull();
    expect(exchangeSession).not.toHaveBeenCalled();
  });

  it("does not store the thirdweb token if the server refuses to start a session", async () => {
    verifyLoginCode.mockResolvedValue({ token: "tw-new", walletAddress: "0xAAA", isNewUser: false });
    exchangeSession.mockRejectedValue(new FakeSessionError("down", 502));
    const { result } = mount();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(act(() => result.current.login("me@x.io", "123456"))).rejects.toThrow();
    expect(localStorage.getItem("thirdweb_token")).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs out: clears storage, the Supabase token and cached data", async () => {
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValue(session());
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    act(() => result.current.logout());
    expect(result.current).toMatchObject({ isAuthenticated: false, user: null, token: null });
    expect(localStorage.getItem("thirdweb_token")).toBeNull();
    expect(setSupabaseAccessToken).toHaveBeenLastCalledWith(null);
    expect(clearQueries).toHaveBeenCalled();
  });

  it("patches the local user for UI updates (e.g. after choosing a username)", async () => {
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValue(session());
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    act(() => result.current.updateUser({ username: "renamed" }));
    expect(result.current.user?.username).toBe("renamed");
  });
});

describe("keeping the session fresh", () => {
  it("renews the Supabase token shortly before it expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValueOnce(session({ expires_at: nowSec() + 3600 })).mockResolvedValue(session({ access_token: "sb.jwt.2", expires_at: nowSec() + 7200 }));
    const { result } = mount();
    await vi.waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(exchangeSession).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync((3600 - 120) * 1000 + 1000); });
    expect(exchangeSession).toHaveBeenCalledTimes(2);
    expect(setSupabaseAccessToken).toHaveBeenLastCalledWith("sb.jwt.2");
  });

  it("signs out if renewal finds the token was revoked", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValueOnce(session({ expires_at: nowSec() + 3600 })).mockRejectedValue(new FakeSessionError("revoked", 401));
    const { result } = mount();
    await vi.waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => { await vi.advanceTimersByTimeAsync((3600 - 120) * 1000 + 1000); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("thirdweb_token")).toBeNull();
  });

  it("retries after a transient failure instead of logging out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem("thirdweb_token", "tw-real");
    exchangeSession.mockResolvedValueOnce(session({ expires_at: nowSec() + 3600 })).mockRejectedValueOnce(new FakeSessionError("down", 502)).mockResolvedValue(session());
    const { result } = mount();
    await vi.waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => { await vi.advanceTimersByTimeAsync((3600 - 120) * 1000 + 1000); });
    expect(result.current.isAuthenticated).toBe(true); // still signed in after the failed renewal
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(exchangeSession).toHaveBeenCalledTimes(3);
  });
});

describe("useAuth outside the provider", () => {
  it("fails loudly", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
