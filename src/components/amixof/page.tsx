import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one column used by utility pages (wallet, pay, activity, people, account, settings): same width, same
 * gutters, same spacing, title in the same place. Feed-style pages use SocialLayout instead; wide media
 * pages (live, blog, dashboard) manage their own width.
 */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-2xl space-y-5 px-4 py-5", className)}>{children}</div>;
}
