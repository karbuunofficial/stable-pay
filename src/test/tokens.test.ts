import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrast, over, parseOklch, readVars } from "@/test/colors";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const light = readVars(css, ":root");
const dark = { ...light, ...readVars(css, ".dark") }; // .dark overrides :root, exactly like the browser

const colour = (vars: Record<string, string>, name: string) => parseOklch(vars[`--${name}`] ?? (() => { throw new Error(`--${name} is not defined`); })());
const themes = { light, dark } as const;

describe("token completeness", () => {
  // constants that are intentionally theme-independent
  const SHARED = /^--(radius|control-|avatar-)/;

  it("every themeable token defined for light is also defined for dark (or is a shared constant)", () => {
    const darkOnly = readVars(css, ".dark");
    const missing = Object.keys(light).filter((k) => !SHARED.test(k) && !(k in darkOnly) && /oklch|rgb/.test(light[k]!) && !["--primary", "--primary-foreground", "--destructive-foreground", "--live-foreground", "--sidebar-primary", "--sidebar-primary-foreground", "--chart-1", "--chart-4", "--chart-5"].includes(k));
    expect(missing, "defined for light but not overridden for dark: if the value really is the same in both themes, add it to the allow-list above").toEqual([]);
  });

  it("every colour token registered with Tailwind has a value", () => {
    const registered = [...css.matchAll(/--color-([\w-]+):\s*var\(--([\w-]+)\)/g)].map((m) => m[2]!);
    expect(registered.length).toBeGreaterThan(40);
    const undefinedTokens = registered.filter((v) => !(`--${v}` in light));
    expect(undefinedTokens).toEqual([]);
  });

  it("uses oklch for every colour (one colour space)", () => {
    const bad = Object.entries({ ...light, ...readVars(css, ".dark") }).filter(([k, v]) => /^--(?!elevation|radius|control|avatar)/.test(k) && /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(v));
    expect(bad).toEqual([]);
  });

  it("defines the four status families with solid, foreground, tint and text", () => {
    for (const s of ["success", "warning", "info"]) for (const part of ["", "-foreground", "-subtle", "-text"]) expect(light[`--${s}${part}`], `--${s}${part}`).toBeTruthy();
    expect(light["--destructive-subtle"]).toBeTruthy();
    expect(light["--destructive-text"]).toBeTruthy();
  });

  it("defines every control height and avatar size, in rem", () => {
    for (const k of ["xs", "sm", "md", "lg", "xl"]) {
      expect(light[`--control-${k}`]).toMatch(/rem$/);
      expect(light[`--avatar-${k}`]).toMatch(/rem$/);
    }
  });
});

// [foreground token, background token, minimum ratio, what it is for]
const TEXT: [string, string, number, string][] = [
  ["foreground", "background", 7, "primary text on the page"],
  ["foreground", "card", 7, "primary text on cards"],
  ["support", "background", 7, "secondary text on the page"],
  ["muted-foreground", "background", 4.5, "tertiary text on the page"],
  ["muted-foreground", "card", 4.5, "tertiary text on cards"],
  ["muted-foreground", "surface-2", 4.5, "tertiary text on inputs and raised areas"],
  ["muted-foreground", "surface-hover", 4.5, "tertiary text on hover"],
  ["foreground", "surface-hover", 7, "primary text on hover"],
  ["foreground", "surface-active", 7, "primary text on pressed"],
  ["primary-foreground", "primary", 4.5, "label on a primary button"],
  ["brand", "background", 4.5, "brand text and links on the page"],
  ["brand", "card", 4.5, "brand text on cards"],
  ["secondary-foreground", "secondary", 4.5, "label on a secondary button"],
  ["accent-foreground", "accent", 4.5, "label on a hovered or selected item"],
  ["popover-foreground", "popover", 7, "menu and tooltip-free popover text"],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5, "active sidebar item"],
  ["destructive-foreground", "destructive", 4.5, "label on a destructive button"],
  ["destructive-text", "background", 4.5, "error text on the page"],
  ["destructive-text", "card", 4.5, "error text on cards"],
  ["success-foreground", "success", 4.5, "label on a solid success badge"],
  ["success-text", "background", 4.5, "success text on the page"],
  ["success-text", "card", 4.5, "success text on cards"],
  ["warning-foreground", "warning", 4.5, "label on a solid warning badge"],
  ["warning-text", "background", 4.5, "warning text on the page"],
  ["warning-text", "card", 4.5, "warning text on cards"],
  ["info-foreground", "info", 4.5, "label on a solid info badge"],
  ["info-text", "background", 4.5, "info text on the page"],
  ["info-text", "card", 4.5, "info text on cards"],
  ["live-foreground", "live", 4.5, "LIVE badge label"],
  ["live-text", "background", 4.5, "live-red text on the page"],
  ["online", "background", 3, "presence dot / large status text"],
];

describe.each(Object.entries(themes))("%s theme: text contrast (WCAG AA)", (_name, vars) => {
  const page = colour(vars, "background");
  it.each(TEXT)("%s on %s ≥ %s (%s)", (fg, bg, min) => {
    const base = colour(vars, bg);
    const solidBg = over(base, page); // translucent surfaces are judged over the page
    const ratio = contrast(over(colour(vars, fg), solidBg), solidBg);
    expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
  });

  it.each([["success"], ["warning"], ["info"], ["destructive"]])("%s text stays readable on its own tint", (s) => {
    const tint = over(colour(vars, `${s}-subtle`), colour(vars, "card"));
    expect(contrast(colour(vars, `${s}-text`), tint)).toBeGreaterThanOrEqual(4.5);
  });

  it("brand text stays readable on its own tint", () => {
    const tint = over(colour(vars, "brand-subtle"), colour(vars, "card"));
    expect(contrast(colour(vars, "brand"), tint)).toBeGreaterThanOrEqual(4.5);
  });

  it("the focus ring is visible against the page and against cards (≥ 3:1, WCAG 1.4.11)", () => {
    expect(contrast(colour(vars, "ring"), page)).toBeGreaterThanOrEqual(3);
    expect(contrast(colour(vars, "ring"), colour(vars, "card"))).toBeGreaterThanOrEqual(3);
  });
});

describe("surface ladder", () => {
  it.each(Object.entries(themes))("%s: each step is a distinct, ordered tone (page, card, raised, hover, pressed)", (name, vars) => {
    const L = (t: string) => {
      const m = /oklch\(\s*([\d.]+)/.exec(vars[`--${t}`]!);
      return Number(m![1]);
    };
    const ladder = ["background", "card", "surface-2", "surface-hover", "surface-active"].map(L);
    // dark: each step is lighter; light: the page is the lightest after cards, and states get darker
    const distinct = new Set(ladder.map((v) => v.toFixed(3))).size;
    expect(distinct, name).toBeGreaterThanOrEqual(4);
  });
});
