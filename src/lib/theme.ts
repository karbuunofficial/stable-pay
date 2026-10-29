export type Theme = "dark" | "light";
export const THEME_KEY = "amixof-theme";

/** Dark for first-time visitors; a saved preference wins. */
export function resolveTheme(saved: string | null | undefined): Theme {
  return saved === "light" ? "light" : "dark";
}

/** Runs inline in <head> before first paint. Must stay self-contained. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
