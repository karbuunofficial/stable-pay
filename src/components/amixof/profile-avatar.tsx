import type { VariantProps } from "class-variance-authority";
import { Avatar, AvatarFallback, AvatarImage, type avatarVariants } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Size = NonNullable<VariantProps<typeof avatarVariants>["size"]>;

// initial letter scales with the avatar
const INITIAL: Record<Size, string> = { xs: "text-nano", sm: "text-xs", md: "text-sm", lg: "text-xl", xl: "text-3xl" };

/** Round avatar from the size scale (xs 24, sm 32, md 40, lg 56, xl 80) with an initial as fallback. */
export function ProfileAvatar({ src, name, size = "md", className }: { src?: string | undefined; name: string; size?: Size; className?: string }) {
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn("bg-primary font-bold text-primary-foreground", INITIAL[size])}>{name.trim()[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
