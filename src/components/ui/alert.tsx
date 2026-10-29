import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Inline message. Tinted background + matching border; the icon takes the status text colour.
 * `destructive` is announced assertively (role="alert"); the others politely (role="status").
 */
const alertVariants = cva(
  "relative w-full rounded-card border px-4 py-3 text-sm text-foreground [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-surface-2 [&>svg]:text-muted-foreground",
        info: "border-info/30 bg-info-subtle [&>svg]:text-info-text",
        success: "border-success/30 bg-success-subtle [&>svg]:text-success-text",
        warning: "border-warning/40 bg-warning-subtle [&>svg]:text-warning-text",
        destructive: "border-destructive/30 bg-destructive-subtle [&>svg]:text-destructive-text",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, role, ...props }, ref) => (
    <div ref={ref} role={role ?? (variant === "destructive" ? "alert" : "status")} className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-0.5 font-semibold leading-snug", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
