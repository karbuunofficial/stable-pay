import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach the merger our custom scales, otherwise `text-nano` is mistaken for a colour and a later `text-muted-foreground`
// silently removes it (and `h-control-md` would not be replaced by `h-control-lg`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["nano", "micro", "body", "lead"] }],
      h: [{ h: ["control-xs", "control-sm", "control-md", "control-lg", "control-xl"] }],
      size: [{ size: ["control-sm", "control-md", "control-lg", "avatar-xs", "avatar-sm", "avatar-md", "avatar-lg", "avatar-xl"] }],
      "rounded": [{ rounded: ["control", "card", "overlay"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
