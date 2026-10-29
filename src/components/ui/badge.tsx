import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Small status or label chip. Tinted variants (brand, success, warning, info, destructive) use the
 * `-subtle` background with the `-text` colour; solid variants (default, live) are for the loudest cases only.
 */
const badgeVariants = cva("inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold [&_svg]:size-3 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      brand: "bg-brand-subtle text-brand",
      secondary: "bg-surface-2 text-muted-foreground",
      outline: "border text-foreground",
      success: "bg-success-subtle text-success-text",
      warning: "bg-warning-subtle text-warning-text",
      info: "bg-info-subtle text-info-text",
      destructive: "bg-destructive-subtle text-destructive-text",
      live: "bg-live text-live-foreground",
    },
  },
  defaultVariants: { variant: "secondary" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
