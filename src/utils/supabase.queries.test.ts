import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "@/test/fakeSupabase";

const fake = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import("@/test/fakeSupabase").createFakeSupabase> }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: (t: string) => fake.current!.client.from(t) }) }));

import { createTransaction, getRecentTransactions, getUserByUsername, getUserByWalletAddress, getUserTransactions, searchUsers, updateUserProfile } from "@/utils/supabase";

let f: ReturnType<typeof createFakeSupabase>;
beforeEach(() => { f = createFakeSupabase(); fake.current = f; });

const selected = (table: string) => f.on(table).flatMap((c) => c.ops.filter(([n]) => n === "select").map(([, a]) => String(a[0] ?? "")));

describe("user queries never ask for the private email column", () => {
  it.each([
    ["getUserByUsername", () => getUserByUsername("bob")],
    ["getUserByWalletAddress", () => getUserByWalletAddress("0xAAA")],
    ["searchUsers", () => searchUsers("bo")],
    ["updateUserProfile", () => updateUserProfile("0xAAA", { display_name: "Bob" })],
  ])("%s", async (_name, run) => {
    f.respond("users", f.ok(null));
    await run();
    const cols = selected("users");
    expect(cols.length).toBeGreaterThan(0);
    for (const c of cols) {
      expect(c).not.toContain("*");
      expect(c).not.toMatch(/email/);
      expect(c).toContain("username");
    }
  });

  it("transaction queries embed only public user columns", async () => {
    f.respond("transactions", f.ok([]), f.ok([]), f.ok({ id: "t" }));
    await getUserTransactions("u1");
    await getRecentTransactions(5);
    await createTransaction("u1", "u2", "0xA", "0xB", "100", "0xT", "USDC", 8453);
    for (const sel of selected("transactions")) {
      expect(sel).not.toMatch(/users![a-z_]+\(\*\)/);
      expect(sel).not.toMatch(/email/);
    }
  });
});

describe("user queries", () => {
  it("searches by username or display name only (never by email)", async () => {
    f.respond("users", f.ok([]));
    await searchUsers("bo");
    const [filter] = f.args(f.on("users")[0]!, "or") as [string];
    expect(filter).toContain("username.ilike");
    expect(filter).toContain("display_name.ilike");
    expect(filter).not.toContain("email");
  });

  it("returns null (not an error) when no user matches", async () => {
    f.respond("users", f.fail("no rows", "PGRST116"));
    await expect(getUserByUsername("ghost")).resolves.toBeNull();
  });

  it("throws other errors with context", async () => {
    f.respond("users", f.fail("boom", "XX000"));
    await expect(getUserByUsername("x")).rejects.toThrow(/boom/);
  });

  it("records a payment as pending, from the sender", async () => {
    f.respond("transactions", f.ok({ id: "t1" }));
    await createTransaction("u1", "u2", "0xA", "0xB", "2500000", "0xT", "USDC", 8453, "lunch", "tw_1");
    const [row] = f.args(f.on("transactions", "insert")[0]!, "insert") as [Record<string, unknown>];
    expect(row).toMatchObject({ from_user_id: "u1", to_user_id: "u2", amount: "2500000", token_symbol: "USDC", chain_id: 8453, message: "lunch", thirdweb_transaction_id: "tw_1", status: "pending" });
  });
});
