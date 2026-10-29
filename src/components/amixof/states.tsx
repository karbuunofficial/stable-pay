import type { ReactNode } from "react";
import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared empty / error / loading states. Use these instead of ad-hoc <p> tags so every
 * screen reads the same and screen readers get the right announcement:
 *  - EmptyState   nothing to show yet (not an error)
 *  - ErrorState   something failed; always offer a retry when one exists (role="alert")
 *  - LoadingState short spinner for a whole region (role="status")
 *  - SkeletonRows placeholder rows shaped like the final list, to avoid layout jump
 */

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {Icon && <Icon className="mb-3 h-10 w-10 text-muted-foreground/60" aria-hidden />}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, retrying, className }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <AlertCircle className="mb-3 h-10 w-10 text-destructive-text/70" aria-hidden />
      <p className="font-semibold text-destructive-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm font-medium hover:bg-surface-hover active:bg-surface-active disabled:opacity-50">
          {retrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 4, label = "Loading…", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("divide-y", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-4" aria-hidden>
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}
