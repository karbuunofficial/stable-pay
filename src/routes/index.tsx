import { createFileRoute, Link } from "@tanstack/react-router";
import { TabBar } from "@/components/ui/tab-bar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LiveNowStrip, SocialLayout } from "@/components/amixof/shell";
import { Composer, PostCard } from "@/components/amixof/post";
import { useActor, useCreatePost, useFeed } from "@/lib/social/hooks";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — AMIXOF" },
      { name: "description", content: "Your AMIXOF feed: posts, beats and live rooms from the creators you follow." },
      { property: "og:title", content: "Home — AMIXOF" },
      { property: "og:description", content: "Posts, beats and live rooms from hip-hop and culture creators." },
    ],
  }),
  component: Home,
});

function Home() {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const { actor } = useActor();
  const feed = useFeed({ following: tab === "following" });
  const create = useCreatePost();
  const shown = feed.data ?? [];

  return (
    <SocialLayout>
      <h1 className="sr-only">Home</h1>
      <TabBar sticky label="Feed" value={tab} onChange={setTab} tabs={[{ value: "foryou", label: "For You" }, { value: "following", label: "Following" }]} />
      <LiveNowStrip className="lg:hidden" />
      <Composer onPost={create.post} />
      {feed.isLoading ? (
        <SkeletonRows rows={4} label="Loading posts…" />
      ) : feed.isError ? (
        <ErrorState title="Couldn't load posts" description="Check your connection and try again." onRetry={() => feed.refetch()} retrying={feed.isFetching} />
      ) : shown.length === 0 ? (
        tab === "following" && !actor ? (
          <EmptyState title="Sign in to see people you follow" description="Follow creators and their posts show up here." action={<Button asChild><Link to="/me">Sign in</Link></Button>} />
        ) : (
          <EmptyState title="Nothing here yet" description={tab === "following" ? "Follow creators to see their posts in this tab." : "Be the first to post."} />
        )
      ) : (
        <>
          {shown.map((p) => <PostCard key={p.id} post={p} />)}
          <p className="py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
        </>
      )}
    </SocialLayout>
  );
}
