import { describe, expect, it } from "vitest";

// Source-level guard: the users table keeps `email` private through column privileges, so any
// `select('*')` on it (or an embed like users!from_user_id(*)) fails at runtime, or worse, leaks the email if the
// privilege is ever loosened. Catch it at review time instead.
const sources = import.meta.glob(["/src/**/*.ts", "/src/**/*.tsx", "!/src/**/*.test.*", "!/src/test/**", "!/src/routeTree.gen.ts"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("source guard: private columns", () => {
  it("scans a meaningful number of files", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(40);
  });

  it("never selects * (or nothing, which means *) from users", () => {
    const offenders = Object.entries(sources).flatMap(([file, src]) => {
      const out: string[] = [];
      for (const m of src.matchAll(/\.from\(\s*['"]users['"]\s*\)([\s\S]{0,200})/g)) {
        if (/\.select\(\s*(['"`]\*['"`])?\s*\)/.test(m[1]!)) out.push(file);
      }
      return out;
    });
    expect(offenders).toEqual([]);
  });

  it("never embeds users with a wildcard", () => {
    const offenders = Object.entries(sources).filter(([, src]) => /users!?[\w_]*\(\s*\*\s*\)/.test(src)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it("never puts the thirdweb token in a URL", () => {
    const offenders = Object.entries(sources).filter(([, src]) => /[?&]token=\$\{/.test(src) || /[?&]x-thirdweb-token/.test(src)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it("never reads identity from the browser-stored wallet address", () => {
    const offenders = Object.entries(sources).filter(([, src]) => /localStorage\.getItem\(\s*['"]wallet_address['"]\s*\)/.test(src)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });
});
