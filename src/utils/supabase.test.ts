import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionError, exchangeSession, supabaseConfigured } from "@/utils/supabase";

const okBody = { access_token: "sb.jwt", expires_at: 1900000000, user: { id: "u1", username: "me", wallet_address: "0xabc", email: "me@x.io" } };
const reply = (status: number, body: unknown = {}) => vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("supabase configuration guard", () => {
  it("is false when the environment has no real Supabase URL (so screens show a setup message instead of crashing)", () => {
    expect(supabaseConfigured).toBe(false);
  });
});

describe("exchangeSession", () => {
  it("sends the thirdweb token in x-thirdweb-token and returns the session", async () => {
    const fetchMock = reply(200, okBody);
    vi.stubGlobal("fetch", fetchMock);
    await expect(exchangeSession("tw-token")).resolves.toEqual(okBody);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://session.test");
    expect(init).toMatchObject({ method: "POST" });
    expect(init.headers["x-thirdweb-token"]).toBe("tw-token");
  });

  it("never puts the token in the URL or body", async () => {
    const fetchMock = reply(200, okBody);
    vi.stubGlobal("fetch", fetchMock);
    await exchangeSession("secret-token-value");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain("secret-token-value");
    expect(init.body).toBeUndefined();
  });

  it.each([401, 403])("reports %s as a rejected token (status 401 only for real rejections)", async (status) => {
    vi.stubGlobal("fetch", reply(status, { error: "invalid_token" }));
    const err = await exchangeSession("bad").catch((e) => e);
    expect(err).toBeInstanceOf(SessionError);
    expect(err.status).toBe(status);
  });

  it("keeps server errors distinguishable from rejections so callers don't log users out", async () => {
    vi.stubGlobal("fetch", reply(502, { error: "thirdweb_unavailable" }));
    const err = await exchangeSession("x").catch((e) => e);
    expect(err).toBeInstanceOf(SessionError);
    expect(err.status).toBe(502);
  });

  it("maps a network failure to status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const err = await exchangeSession("x").catch((e) => e);
    expect(err).toBeInstanceOf(SessionError);
    expect(err.status).toBe(0);
  });
});
