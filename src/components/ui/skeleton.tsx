import { cn } from "@/lib/utils";

/** Neutral placeholder block (not brand-tinted). Pulse is switched off for reduced-motion users globally. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-control bg-surface-2", className)} {...props} />;
}

export { Skeleton };
