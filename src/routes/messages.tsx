import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { Mail } from "lucide-react";
import { conversations, getCreator } from "@/data/mock";
import { EmptyState } from "@/components/amixof/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — AMIXOF" },
      { name: "description", content: "Your direct messages on AMIXOF." },
      { property: "og:title", content: "Messages — AMIXOF" },
      { property: "og:description", content: "Your direct messages on AMIXOF." },
    ],
  }),
  component: MessagesLayout,
});

function MessagesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const inThread = path !== "/messages";
  return (
    <div className="flex h-[calc(100dvh-3.5rem-3.5rem)] md:h-[calc(100dvh-3.5rem)]">
      <aside aria-label="Conversations" className={cn("w-full shrink-0 overflow-y-auto border-r md:w-[340px]", inThread && "hidden md:block")}>
        <h1 className="type-title flex h-12 items-center border-b px-4">Messages</h1>
        {conversations.length === 0 && <EmptyState icon={Mail} title="No messages yet" description="Start a conversation from someone’s profile." />}
        {conversations.map((cv) => {
          const c = getCreator(cv.with)!;
          return (
            <Link key={cv.id} to="/messages/$id" params={{ id: cv.id }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 hover:bg-surface-hover active:bg-surface-active" activeProps={{ className: "bg-accent" }}>
              <ProfileAvatar src={c.avatar} name={c.name} size="md" />
              <span className="min-w-0"><span className="block truncate type-author">{c.name}</span><span className="block truncate text-sm text-muted-foreground">{cv.last}</span></span>
              <span className="flex flex-col items-end gap-1 type-caption">{cv.time}{cv.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-micro font-bold text-primary-foreground">{cv.unread}</span>}</span>
            </Link>
          );
        })}
      </aside>
      <section className={cn("min-w-0 flex-1", !inThread && "hidden md:block")}><Outlet /></section>
    </div>
  );
}
