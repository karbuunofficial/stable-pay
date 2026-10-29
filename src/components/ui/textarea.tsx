import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-control border border-input bg-surface-2 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-ring/50 aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
