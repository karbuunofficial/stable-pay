import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { PageHeader, SocialLayout } from "@/components/amixof/shell";
import { PostCard } from "@/components/amixof/post";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";
import { useActor, useFeed } from "@/lib/social/hooks";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — AMIXOF" },
      { name: "description", content: "Posts you saved on AMIXOF." },
      { property: "og:title", content: "Bookmarks — AMIXOF" },
      { property: "og:description", content: "Posts you saved on AMIXOF." },
    ],
  }),
  component: Bookmarks,
});

function Bookmarks() {
  const { actor } = useActor();
  const feed = useFeed({ bookmarked: true });
  const saved = feed.data ?? [];
  return (
    <SocialLayout>
      <PageHeader title="Bookmarks">{actor && <span className="type-caption">{saved.length} saved</span>}</PageHeader>
      {!actor ? (
        <EmptyState icon={Bookmark} title="Sign in to see your bookmarks" description="Posts you save are kept on your account." action={<Button asChild><Link to="/me">Sign in</Link></Button>} />
      ) : feed.isLoading ? (
        <SkeletonRows rows={3} label="Loading bookmarks…" />
      ) : feed.isError ? (
        <ErrorState title="Couldn't load your bookmarks" onRetry={() => feed.refetch()} retrying={feed.isFetching} />
      ) : saved.length ? (
        saved.map((p) => <PostCard key={p.id} post={p} />)
      ) : (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Tap the bookmark on a post to keep it here." />
      )}
    </SocialLayout>
  );
}
