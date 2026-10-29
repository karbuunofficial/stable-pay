import { createFileRoute, Link } from "@tanstack/react-router";
import { TabBar } from "@/components/ui/tab-bar";
import { Button } from "@/components/ui/button";
import { AtSign, Bell, Coins, Flame, Gift, Radio, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, SocialLayout } from "@/components/amixof/shell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { markNotificationsSeen } from "@/lib/unread";
import { useActor, useNotifications } from "@/lib/social/hooks";
import type { NotificationKind, NotificationView } from "@/lib/social";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — AMIXOF" },
      { name: "description", content: "Tips, gifts, mentions, follows and go-live alerts on AMIXOF." },
      { property: "og:title", content: "Notifications — AMIXOF" },
      { property: "og:description", content: "Tips, gifts, mentions, follows and go-live alerts." },
    ],
  }),
  component: Notifications,
});

const icons: Record<NotificationKind, readonly [typeof Radio, string]> = { live: [Radio, "text-live-text"], tip: [Coins, "text-chart-3"], mention: [AtSign, "text-brand"], follow: [UserPlus, "text-brand"], like: [Flame, "text-chart-3"], gift: [Gift, "text-chart-2"] };

function destination(n: NotificationView) {
  if (n.kind === "live") return { to: "/live/$channel", params: { channel: n.actor.handle } } as const;
  if (n.postId) return { to: "/post/$id", params: { id: n.postId } } as const;
  return { to: "/profile/$handle", params: { handle: n.actor.handle } } as const;
}

function Notifications() {
  const [tab, setTab] = useState<"all" | "mentions">("all");
  const { actor, loading } = useActor();
  const q = useNotifications();
  const all = q.data ?? [];
  const list = tab === "all" ? all : all.filter((n) => n.mention);

  // opening the page clears the bell badge
  useEffect(() => {
    if (actor && q.isSuccess) markNotificationsSeen(actor.id);
  }, [actor, q.isSuccess]);

  return (
    <SocialLayout>
      <PageHeader title="Notifications" />
      <TabBar label="Notification filter" value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, { value: "mentions", label: "Mentions" }]} />
      {!actor && !loading ? (
        <EmptyState icon={Bell} title="Sign in to see your notifications" description="New followers and reactions on your posts show up here." action={<Button asChild><Link to="/me">Sign in</Link></Button>} />
      ) : q.isLoading || loading ? (
        <SkeletonRows rows={5} label="Loading notifications…" />
      ) : q.isError ? (
        <ErrorState title="Couldn't load notifications" onRetry={() => q.refetch()} retrying={q.isFetching} />
      ) : list.length === 0 ? (
        <EmptyState icon={Bell} title={tab === "mentions" ? "No mentions yet" : "No notifications yet"} description="New followers and reactions on your posts show up here." />
      ) : (
        list.map((n) => {
          const [Icon, cls] = icons[n.kind];
          const d = destination(n);
          return (
            <Link key={n.id} {...d} className="flex items-start gap-3 border-b px-4 py-3 hover:bg-surface-hover active:bg-surface-active">
              <span className="relative shrink-0">
                <ProfileAvatar src={n.actor.avatar} name={n.actor.name} />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-background ring-2 ring-background"><Icon className={cn("h-3.5 w-3.5", cls)} aria-hidden /></span>
              </span>
              <span className="min-w-0">
                <span className="block text-body"><span className="font-semibold">{n.actor.name}</span> <span className="text-support">{n.text}</span></span>
                <span className="block type-caption">{n.time}</span>
              </span>
            </Link>
          );
        })
      )}
    </SocialLayout>
  );
}
