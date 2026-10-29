import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Text field. Raised surface + control border, focus shown by the global ring, invalid by aria-invalid. */
const inputVariants = cva(
  "flex w-full rounded-control border border-input bg-surface-2 text-foreground transition-colors placeholder:text-muted-foreground hover:border-ring/50 aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-60 file:border-0 file:bg-transparent file:text-sm file:font-medium",
  {
    variants: {
      size: {
        sm: "h-control-sm px-2.5 text-sm",
        default: "h-control-md px-3 text-sm",
        lg: "h-control-lg px-3 text-sm",
        xl: "h-control-xl px-4 text-lg",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export interface InputProps extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, size, ...props }, ref) => (
  <input type={type} className={cn(inputVariants({ size }), className)} ref={ref} {...props} />
));
Input.displayName = "Input";

export { Input, inputVariants };
