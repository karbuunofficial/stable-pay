import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one button. Heights come from the control scale (--control-*), colours from tokens, and the focus ring
 * from the global :focus-visible rule. No shadows: depth is reserved for floating layers.
 *
 *  variant  default (primary action) · secondary · outline · ghost · subtle (brand tint) · destructive · link
 *  size     xs 24 · sm 32 · default 36 · lg 40 · xl 48 · icon-sm / icon / icon-lg (square)
 *  shape    default (6px) · pill (follow, post, chips)
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:bg-surface-2 disabled:text-muted-foreground",
        secondary: "bg-surface-2 text-foreground hover:bg-surface-hover active:bg-surface-active disabled:text-muted-foreground",
        outline: "border border-input bg-transparent text-foreground hover:bg-surface-hover active:bg-surface-active disabled:border-border disabled:text-muted-foreground",
        ghost: "text-foreground hover:bg-surface-hover active:bg-surface-active disabled:text-muted-foreground",
        subtle: "bg-brand-subtle text-brand hover:bg-brand/15 active:bg-brand/20 disabled:bg-surface-2 disabled:text-muted-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 disabled:bg-surface-2 disabled:text-muted-foreground",
        link: "h-auto rounded-none p-0 font-medium text-brand underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-control-xs px-2 text-xs",
        sm: "h-control-sm px-3 text-sm",
        default: "h-control-md px-4 text-sm",
        lg: "h-control-lg px-5 text-sm",
        xl: "h-control-xl px-6 text-base",
        "icon-sm": "size-control-sm p-0",
        icon: "size-control-md p-0",
        "icon-lg": "size-control-lg p-0",
      },
      shape: {
        default: "rounded-control",
        pill: "rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default", shape: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. Keep the label so the width doesn't jump. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const cls = cn(buttonVariants({ variant, size, shape }), className);
    if (asChild) {
      return <Slot className={cls} ref={ref} {...props}>{children}</Slot>;
    }
    return (
      <button className={cls} ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
