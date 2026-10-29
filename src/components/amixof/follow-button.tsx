import { useFollow } from "@/lib/social/hooks";
import type { Profile } from "@/lib/social";
import { Button } from "@/components/ui/button";

/**
 * Follow / Following toggle backed by the social repository. The name is the visible word plus who it is for
 * ("Following Kaydence"), so what people read is always part of what assistive tech announces.
 */
export function FollowButton({ profile, className }: { profile: Profile; className?: string }) {
  const toggle = useFollow(profile);
  return (
    <Button type="button" size="sm" shape="pill" variant={profile.following ? "outline" : "default"} onClick={toggle} className={className}>
      {profile.following ? "Following" : "Follow"}
      <span className="sr-only"> {profile.name}</span>
    </Button>
  );
}
