import { cn } from "@/lib/utils";

export type TabBarItem<T extends string> = { value: T; label: string };

/**
 * Controlled tab strip for views that swap content in place (feed tabs, profile tabs).
 * Plain role="tablist"/"tab" markup: arrow keys and roving tabindex come from src/lib/a11y.ts.
 *  variant  underline (default, full width, indicator bar) · pill (compact filter chips)
 */
export function TabBar<T extends string>({
  tabs, value, onChange, label, variant = "underline", className, sticky = false,
}: {
  tabs: readonly TabBarItem<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  variant?: "underline" | "pill";
  className?: string;
  /** stick under the top bar (feed pages) */
  sticky?: boolean;
}) {
  if (variant === "pill") {
    return (
      <div role="tablist" aria-label={label} className={cn("flex gap-1", className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={cn("h-control-sm rounded-full border px-3 text-sm font-medium capitalize transition-colors", value === t.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={label} className={cn("grid border-b bg-background/85 backdrop-blur", sticky && "sticky top-14 z-30", className)} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn("relative h-control-xl text-sm font-medium capitalize text-muted-foreground transition-colors hover:bg-surface-hover", value === t.value && "font-semibold text-foreground")}
        >
          {t.label}
          <span aria-hidden className={cn("absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary transition-opacity", value === t.value ? "opacity-100" : "opacity-0")} />
        </button>
      ))}
    </div>
  );
}
