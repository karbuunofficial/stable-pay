import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completePayment, createPayment, getPaymentStatus, getTransactionStatus, getWalletBalance, getWalletTransactions, getNativeTokenBalance,
  isInsufficientFundsResponse, mapThirdwebStatusToInternal, refreshPendingTransactionStatuses, sendLoginCode, sendTokens, verifyLoginCode,
} from "@/utils/thirdwebAPI";

const BASE = "https://api.thirdweb.com/v1";
const json = (status: number, body: unknown = {}, statusText = "") => new Response(JSON.stringify(body), { status, statusText });
let fetchMock: ReturnType<typeof vi.fn>;
const lastCall = () => fetchMock.mock.calls.at(-1)! as [string, RequestInit & { headers: Record<string, string> }];
const lastBody = () => JSON.parse(String(lastCall()[1].body));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("login", () => {
  it("asks thirdweb to email a code, identifying the app with its client id", async () => {
    fetchMock.mockImplementation(async () => json(200, { ok: true }));
    await sendLoginCode("me@x.io");
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/auth/initiate`);
    expect(init.method).toBe("POST");
    expect(init.headers["x-client-id"]).toBe("test-client");
    expect(lastBody()).toEqual({ method: "email", email: "me@x.io" });
  });

  it("throws a readable error when the code can't be sent", async () => {
    fetchMock.mockImplementation(async () => json(429, {}, "Too Many Requests"));
    await expect(sendLoginCode("me@x.io")).rejects.toThrow("Failed to send login code: 429 Too Many Requests");
  });

  it("verifies a code and returns the token, wallet and whether the user is new", async () => {
    fetchMock.mockImplementation(async () => json(200, { token: "tw", walletAddress: "0xAAA", isNewUser: true, extra: "ignored" }));
    await expect(verifyLoginCode("me@x.io", "123456")).resolves.toEqual({ token: "tw", walletAddress: "0xAAA", isNewUser: true });
    expect(lastCall()[0]).toBe(`${BASE}/auth/complete`);
    expect(lastBody()).toEqual({ method: "email", email: "me@x.io", code: "123456" });
  });

  it("reports the status when verification fails (the login form maps it to a message)", async () => {
    fetchMock.mockImplementation(async () => json(404, {}, "Not Found"));
    await expect(verifyLoginCode("me@x.io", "000000")).rejects.toThrow(/404/);
  });
});

describe("balances", () => {
  it("requests a token balance for a chain and token", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { value: "1000000", decimals: 6, symbol: "USDC", name: "USD Coin" } }));
    const res = await getWalletBalance("0xAAA", 8453, "0xUSDC");
    const url = new URL(lastCall()[0]);
    expect(url.pathname).toBe("/v1/wallets/0xAAA/balance");
    expect(url.searchParams.get("chainId")).toBe("8453");
    expect(url.searchParams.get("tokenAddress")).toBe("0xUSDC");
    expect(res.result.symbol).toBe("USDC");
  });

  it("omits the token for native balances, including the 0xEeee… native marker", async () => {
    fetchMock.mockImplementation(async () => json(200, {}));
    await getWalletBalance("0xAAA", 1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
    expect(new URL(lastCall()[0]).searchParams.has("tokenAddress")).toBe(false);
    await getNativeTokenBalance("0xAAA", 1);
    expect(new URL(lastCall()[0]).searchParams.has("tokenAddress")).toBe(false);
  });

  it("throws with the status so the UI can show a retry", async () => {
    fetchMock.mockImplementation(async () => json(500, {}, "Server Error"));
    await expect(getWalletBalance("0xAAA", 8453)).rejects.toThrow("Failed to get wallet balance: 500");
    await expect(getNativeTokenBalance("0xAAA", 8453)).rejects.toThrow("Failed to get native token balance: 500");
  });
});

describe("payments", () => {
  it("creates a payment for the recipient and amount, authenticated as the user", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { id: "pay_1", link: "https://pay/1" } }));
    const res = await createPayment("Payment to bob", "lunch", "0xBOB", "0xUSDC", "2500000", 8453, "user-token");
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/payments`);
    expect(init.headers.Authorization).toBe("Bearer user-token");
    expect(init.headers["x-client-id"]).toBe("test-client");
    expect(lastBody()).toEqual({ name: "Payment to bob", description: "lunch", recipient: "0xBOB", token: { address: "0xUSDC", chainId: 8453, amount: "2500000" } });
    expect(res).toEqual({ id: "pay_1", link: "https://pay/1" });
  });

  it("refuses a response without a payment id instead of continuing with garbage", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: {} }));
    await expect(createPayment("n", "d", "0xB", "0xT", "1", 1, "t")).rejects.toThrow(/invalid payment response/i);
    fetchMock.mockImplementation(async () => json(200, {}));
    await expect(createPayment("n", "d", "0xB", "0xT", "1", 1, "t")).rejects.toThrow(/invalid payment response/i);
  });

  it("throws when creating a payment is rejected", async () => {
    fetchMock.mockImplementation(async () => json(401, {}, "Unauthorized"));
    await expect(createPayment("n", "d", "0xB", "0xT", "1", 1, "t")).rejects.toThrow("Failed to create payment: 401");
  });

  it("completes a payment from the sender's wallet", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { transactionId: "tx_1", status: "QUEUED" } }));
    const res = await completePayment("pay_1", "0xME", "user-token");
    expect(lastCall()[0]).toBe(`${BASE}/payments/pay_1`);
    expect(lastBody()).toEqual({ from: "0xME" });
    expect(res).toEqual({ result: { transactionId: "tx_1", status: "QUEUED" } });
    expect(isInsufficientFundsResponse(res)).toBe(false);
  });

  it("returns the funding link (does not throw) when the balance is too low (402)", async () => {
    fetchMock.mockImplementation(async () => json(402, { result: { link: "https://fund/me" } }));
    const res = await completePayment("pay_1", "0xME", "t");
    expect(isInsufficientFundsResponse(res)).toBe(true);
    expect((res as { result: { link: string } }).result.link).toBe("https://fund/me");
  });

  it("throws on other failures when completing", async () => {
    fetchMock.mockImplementation(async () => json(500, {}, "Server Error"));
    await expect(completePayment("pay_1", "0xME", "t")).rejects.toThrow("Failed to complete payment: 500");
  });

  it("reads payment status", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { status: "COMPLETED" } }));
    await getPaymentStatus("pay_1", "t");
    expect(lastCall()[1].method).toBe("GET");
    fetchMock.mockImplementation(async () => json(404, {}, "Not Found"));
    await expect(getPaymentStatus("pay_1", "t")).rejects.toThrow("Failed to get payment status: 404");
  });

  it("sends tokens directly (legacy path), only including a token address when given", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { transactionId: "t", status: "QUEUED" } }));
    await sendTokens("0xME", "0xBOB", "5", 8453, "t", "0xUSDC");
    expect(lastBody()).toEqual({ chainId: 8453, from: "0xME", recipients: [{ address: "0xBOB", quantity: "5" }], tokenAddress: "0xUSDC" });
    await sendTokens("0xME", "0xBOB", "5", 8453, "t");
    expect(lastBody()).not.toHaveProperty("tokenAddress");
  });
});

describe("insufficient funds detection", () => {
  it.each([
    [{ result: { link: "x" } }, true],
    [{ result: { link: "x", transactionId: "t" } }, false],
    [{ result: { transactionId: "t", status: "QUEUED" } }, false],
  ])("%j -> %s", (body, expected) => {
    expect(isInsufficientFundsResponse(body as never)).toBe(expected);
  });
});

describe("transaction status", () => {
  it.each([
    ["QUEUED", "pending"], ["SUBMITTED", "pending"], ["CONFIRMED", "confirmed"], ["FAILED", "failed"],
    ["confirmed", "confirmed"], ["failed", "failed"], ["SOMETHING_NEW", "pending"], ["", "pending"], [null, "pending"],
  ])("maps %s -> %s (unknown means still pending, never a false 'confirmed')", (input, expected) => {
    expect(mapThirdwebStatusToInternal(input as string | null)).toBe(expected);
  });

  it("fetches a transaction's status", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: { status: "CONFIRMED", transactionHash: "0xhash" } }));
    await expect(getTransactionStatus("tx_1")).resolves.toEqual({ result: { status: "CONFIRMED", transactionHash: "0xhash" } });
    expect(lastCall()[0]).toBe(`${BASE}/transactions/tx_1`);
  });

  it("lists wallet transactions with chain and limit", async () => {
    fetchMock.mockImplementation(async () => json(200, { result: [] }));
    await getWalletTransactions("0xAAA", 8453, 5);
    const u = new URL(lastCall()[0]);
    expect(u.searchParams.get("chainId")).toBe("8453");
    expect(u.searchParams.get("limit")).toBe("5");
  });
});

describe("refreshPendingTransactionStatuses", () => {
  const statusFor = (map: Record<string, { status: string; hash?: string } | "error">) =>
    fetchMock.mockImplementation(async (url: string) => {
      const id = String(url).split("/").pop()!;
      const v = map[id];
      if (v === "error") return json(500, {}, "boom");
      return json(200, { result: { status: v!.status, transactionHash: v!.hash } });
    });

  it("updates only transactions that reached a final status, passing the hash", async () => {
    statusFor({ tw1: { status: "CONFIRMED", hash: "0xH1" }, tw2: { status: "QUEUED" }, tw3: { status: "FAILED" } });
    const update = vi.fn().mockResolvedValue(undefined);
    await refreshPendingTransactionStatuses(
      [{ id: "a", thirdweb_transaction_id: "tw1" }, { id: "b", thirdweb_transaction_id: "tw2" }, { id: "c", thirdweb_transaction_id: "tw3" }],
      update,
    );
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith("a", "confirmed", "0xH1");
    expect(update).toHaveBeenCalledWith("c", "failed", undefined);
  });

  it("skips transactions with no thirdweb id (nothing to look up)", async () => {
    const update = vi.fn();
    await refreshPendingTransactionStatuses([{ id: "x" }], update);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps going when one lookup fails", async () => {
    statusFor({ tw1: "error", tw2: { status: "CONFIRMED", hash: "0xH2" } });
    const update = vi.fn().mockResolvedValue(undefined);
    await expect(refreshPendingTransactionStatuses([{ id: "a", thirdweb_transaction_id: "tw1" }, { id: "b", thirdweb_transaction_id: "tw2" }], update)).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith("b", "confirmed", "0xH2");
  });

  it("keeps going when the update callback itself throws", async () => {
    statusFor({ tw1: { status: "CONFIRMED" }, tw2: { status: "CONFIRMED" } });
    const update = vi.fn().mockRejectedValueOnce(new Error("db")).mockResolvedValue(undefined);
    await refreshPendingTransactionStatuses([{ id: "a", thirdweb_transaction_id: "tw1" }, { id: "b", thirdweb_transaction_id: "tw2" }], update);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
