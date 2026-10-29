import { describe, expect, it } from "vitest";

// Source guard for the design system. These rules exist so the system can't quietly erode: each one fails with the
// offending files so the fix is obvious. If you have a real exception, add the file to the allow-list with a reason.
const all = import.meta.glob(["/src/**/*.ts", "/src/**/*.tsx", "!/src/**/*.test.*", "!/src/test/**", "!/src/routeTree.gen.ts"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const files = Object.entries(all);
const withoutUi = files.filter(([f]) => !f.includes("/components/ui/"));

const offenders = (list: [string, string][], re: RegExp, allow: string[] = []) =>
  list.filter(([f, src]) => re.test(src) && !allow.some((a) => f.endsWith(a))).map(([f]) => f.replace("/src/", ""));

describe("design system guard", () => {
  it("scans the whole source tree", () => {
    expect(files.length).toBeGreaterThan(80);
  });

  it("no legacy venmo-* classes", () => {
    expect(offenders(files, /\bvenmo-(button|card|input|avatar)\b/)).toEqual([]);
  });

  it("no raw palette colours: use the tokens (text over video in Clips is the one exception)", () => {
    const raw = /(?<![\w-])(?:bg|text|border|ring|from|to|via|divide|fill|stroke)-(?:white|black|gray|slate|zinc|neutral|stone|red|green|blue|yellow|amber|orange|purple|indigo|emerald|violet|pink|rose|sky|teal|cyan|lime|fuchsia)(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/;
    expect(offenders(files, raw, ["routes/clips.tsx"])).toEqual([]);
  });

  it("no arbitrary font sizes or colours: use the named sizes and tokens", () => {
    expect(offenders(withoutUi, /(?<![\w-])text-\[\s*[\d.]+(?:px|rem|em)\s*\]/)).toEqual([]);
    expect(offenders(withoutUi, /(?<![\w-])(?:bg|text|border)-\[(?:#|oklch|rgb|hsl)/, ["routes/settings.tsx"])).toEqual([]); // settings draws the theme previews
  });

  it("headings use the type roles, not ad-hoc size + weight combos", () => {
    // <h1>-<h3> must carry a type-* role (sr-only headings and the 404 numeral are exempt)
    const bad = withoutUi.flatMap(([f, src]) =>
      [...src.matchAll(/<h[1-3]\b[^>]*className="([^"]*)"/g)]
        .filter((m) => !/type-(display|title|heading|subheading|overline|stat|ui)|sr-only|text-6xl/.test(m[1]!))
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("no text above 20px except display roles (no oversized one-off headings)", () => {
    expect(offenders(withoutUi, /(?<![\w-])text-(?:2xl|3xl|4xl|5xl|6xl)\b/, ["routes/__root.tsx", "components/payments/SendPayment.tsx", "components/amixof/profile-avatar.tsx", "components/amixof/tip.tsx", "components/auth/LoginForm.tsx"])).toEqual([]);
  });

  it("avatars come from the size scale (no hand-sized round images)", () => {
    expect(offenders(files, /<img[^>]*\brounded-full\b/, ["components/amixof/profile-avatar.tsx"])).toEqual([]);
  });

  it("hover surfaces use the shared token, not accent", () => {
    expect(offenders(files, /hover:bg-accent\b/)).toEqual([]);
  });

  it("status text uses the status tokens (text-destructive is the fill colour, not a text colour)", () => {
    expect(offenders(files, /(?<![\w-])text-destructive(?!-)(?![\w-])/)).toEqual([]);
  });

  it("buttons are the Button component, not repeated class recipes", () => {
    // allowed: Clips/live-stage controls drawn over media, which have their own compact styling
    expect(offenders(withoutUi, /<button[^>]*\bbg-primary\b/, ["components/amixof/multiguest.tsx", "routes/blog.$slug.tsx"])).toEqual([]);
  });

  it("shadows only appear on floating layers and thumbs", () => {
    const floating = [
      "components/ui/dialog.tsx", "components/ui/alert-dialog.tsx", "components/ui/sheet.tsx", "components/ui/drawer.tsx",
      "components/ui/popover.tsx", "components/ui/hover-card.tsx", "components/ui/dropdown-menu.tsx", "components/ui/context-menu.tsx",
      "components/ui/menubar.tsx", "components/ui/select.tsx", "components/ui/navigation-menu.tsx", "components/ui/tooltip.tsx",
      "components/ui/command.tsx", "components/ui/sonner.tsx", "components/ui/switch.tsx", "components/ui/sidebar.tsx", "components/ui/chart.tsx", "components/ui/calendar.tsx",
      "components/ui/TokenChainSelector.tsx", // its dropdown list
      "components/amixof/post.tsx", // the post More menu is a dropdown
      "routes/clips.tsx", // text-shadow over video
      "routes/design-system.tsx", // shows the shadow scale
    ];
    expect(offenders(files, /(?<![\w-])(?:hover:|focus:|dark:)?shadow(?:-(?:xs|sm|md|lg|xl|2xl))?(?![\w-])/, floating)).toEqual([]);
  });

  it("dialogs, sheets and menus use the overlay token, not black", () => {
    expect(offenders(files, /bg-black(?:\/\d+| bg-opacity)/)).toEqual([]);
  });
});

describe("accessibility guard", () => {
  it("no clickable non-interactive elements (use a button or link); the post card's pointer shortcut is the one exception", () => {
    // onClick on div/span/li/p/img without a role is invisible to keyboards and screen readers. The one exception is
    // stopPropagation wrappers, which carry `onClick={stop}`.
    const bad = withoutUi.flatMap(([f, src]) =>
      [...src.matchAll(/<(div|span|li|p|img|section|article|h[1-6])\b[^>]*\bonClick=\{(?!stop\b)[^>]*>/g)]
        .filter((m) => !/role=|tabIndex|onKeyDown/.test(m[0]))
        .filter(() => !f.endsWith("components/amixof/post.tsx")) // <article onClick={open}>: not focusable; the timestamp link is the keyboard route
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("no focus ring is removed without a replacement", () => {
    // outline-none/hidden on a control is only OK inside a field-shell wrapper, a Radix primitive, or with a ring class
    const bad = withoutUi.flatMap(([f, src]) =>
      [...src.matchAll(/className=\{?["'`]([^"'`]*\boutline-(?:none|hidden)\b[^"'`]*)["'`]/g)]
        .filter((m) => !/ring-|field-shell|focus-visible:outline/.test(m[1]!))
        // these inputs sit inside a `field-shell` wrapper that draws the :focus-within ring
        .filter(() => !["components/amixof/chat.tsx", "components/amixof/shell.tsx", "routes/explore.tsx", "routes/live.index.tsx"].some((a) => f.endsWith(a)))
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("toggle buttons don't rename themselves when pressed", () => {
    // aria-pressed together with a label that flips (Unlike/Like, Remove/Add) double-announces the state
    const bad = files.filter(([, src]) => /aria-pressed=\{[^}]+\}[^>]*aria-label=\{\w+ \? "/.test(src)).map(([f]) => f.replace("/src/", ""));
    expect(bad).toEqual([]);
  });

  // Regression guards for the post-checkpoint a11y fixes (83f7557). Those screens (confirm step, activity refresh, balance
  // toggle) are not reachable in the stubbed e2e build, so they are enforced at source level.
  const openingTags = (src: string, tag: string) => [...src.matchAll(new RegExp(`<${tag}\\b(?:=>|[^>])*?>`, "gs"))];

  it("icon-only <button>s always have an accessible name (aria-label / aria-labelledby / title)", () => {
    const bad = withoutUi.flatMap(([f, src]) =>
      [...src.matchAll(/(<button\b(?:=>|[^>])*?>)([\s\S]*?)<\/button>/g)]
        .filter((m) => {
          const inner = m[2]!
            .replace(/\{[^{}]*<[A-Z]\w*[^>]*\/>[^{}]*\}/g, "") // {cond ? <IconA /> : <IconB />}
            .replace(/<[A-Z]\w*[^>]*\/>/g, "") // <Icon />
            .trim();
          return inner === "" && !/aria-label|aria-labelledby|\btitle=/.test(m[1]!);
        })
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("a button with aria-pressed never also changes its aria-label with the state (single or double quotes, multi-line)", () => {
    const bad = withoutUi.flatMap(([f, src]) =>
      openingTags(src, "button")
        // aria-label={cond ? "A" : "B"}: the label itself flips between two literal strings
        .filter((m) => /aria-pressed=/.test(m[0]) && /aria-label=\{[^}?]*\?\s*(["'`])[^"'`]*\1\s*:\s*(["'`])[^"'`]*\2\s*\}/.test(m[0]))
        // KNOWN DEBT (pre-dates the checkpoints): the multi-guest mic/camera toggles flip "Turn your mic off/on" AND set aria-pressed.
        // Fix = constant label ("Mic") + aria-pressed, then remove this line.
        .filter(() => !f.endsWith("components/amixof/multiguest.tsx"))
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("links inside running text are underlined, not distinguished by colour alone (WCAG 1.4.1)", () => {
    const bad = withoutUi.flatMap(([f, src]) =>
      openingTags(src, "a")
        .filter((m) => /href="https?:/.test(m[0]) && /\btext-brand\b/.test(m[0]) && !/(?<![:\w-])underline\b/.test(m[0]))
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });

  it("form fields have labels: <Input>/<textarea> need aria-label, aria-labelledby, an id (for a <label htmlFor>) or a wrapping <label>", () => {
    const bad = withoutUi.flatMap(([f, src]) =>
      [...src.matchAll(/<(Input|textarea|input)\b([^>]*?)\/?>/gs)]
        .filter((m) => !/type="(hidden|checkbox|radio|file)"/.test(m[2]!) && !/aria-label|aria-labelledby|\bid=/.test(m[2]!))
        .filter((m) => { const before = src.slice(0, m.index); return before.lastIndexOf("<label") <= before.lastIndexOf("</label>"); }) // not inside a wrapping label
        .map(() => f.replace("/src/", "")),
    );
    expect(bad).toEqual([]);
  });
});

describe("design system docs", () => {
  it("docs/design-system.md mentions every semantic colour family", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const doc = readFileSync(resolve(process.cwd(), "docs/design-system.md"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const names = [...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
    // chart-*, sidebar-* and the ring offset belong to shadcn plumbing, documented as a group
    const missing = names.filter((n) => !/^(chart|sidebar|ring-offset)/.test(n) && !doc.includes(n.replace(/-(foreground|subtle|text)$/, "")));
    expect(missing).toEqual([]);
  });
});
