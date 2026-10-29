import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/** Underline tabs: the same look as <TabBar>, for content that has real panels. */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("flex w-full items-stretch border-b bg-transparent text-muted-foreground", className)} {...props} />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex h-control-lg flex-1 cursor-pointer items-center justify-center whitespace-nowrap px-3 text-sm font-medium transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:font-semibold data-[state=active]:text-foreground",
        "after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-10 after:-translate-x-1/2 after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-0", className)} {...props} />,
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
