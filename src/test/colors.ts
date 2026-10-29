/** Minimal oklch -> sRGB conversion and WCAG contrast, for testing the design tokens. */
export type RGB = [number, number, number]; // linear-light sRGB, 0..1
export type Color = { rgb: RGB; alpha: number };

export function parseOklch(value: string): Color {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/.exec(value.trim());
  if (!m) throw new Error(`Not an oklch() colour: ${value}`);
  const [L, C, h] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, mm, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const lin: RGB = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return { rgb: lin.map((v) => Math.min(1, Math.max(0, v))) as RGB, alpha: m[4] === undefined ? 1 : Number(m[4]) };
}

/** Composite a (possibly translucent) colour over an opaque background. */
export function over(fg: Color, bg: Color): Color {
  return { rgb: fg.rgb.map((v, i) => v * fg.alpha + bg.rgb[i]! * (1 - fg.alpha)) as RGB, alpha: 1 };
}

const luminance = ({ rgb: [r, g, b] }: Color) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function contrast(a: Color, b: Color): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Variables declared inside the CSS block that starts with `selector {` (first match). */
export function readVars(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block`);
  const end = css.indexOf("\n}", start);
  const out: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) out[m[1]!] = m[2]!.trim();
  return out;
}
