import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DiscoverRail, PageHeader, SocialLayout } from "@/components/amixof/shell";
import { PostCard } from "@/components/amixof/post";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";
import { FollowButton } from "@/components/amixof/follow-button";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { categories, trending } from "@/data/mock";
import { useCreators, useFeed } from "@/lib/social/hooks";
import { formatCount } from "@/lib/composer";

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s.q === "string" && s.q ? { q: s.q } : {}),
  head: () => ({
    meta: [
      { title: "Explore — AMIXOF" },
      { name: "description", content: "Trending topics, communities and creators to follow on AMIXOF." },
      { property: "og:title", content: "Explore AMIXOF" },
      { property: "og:description", content: "Trending topics, communities and creators to follow." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { q: qParam } = Route.useSearch();
  const [q, setQ] = useState(qParam ?? "");
  // the top-bar search navigates here with ?q=
  useEffect(() => { setQ(qParam ?? ""); }, [qParam]);
  // search as you type, but only hit the backend once typing pauses
  const [term, setTerm] = useState(q.trim());
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const search = useFeed({ q: term }, { enabled: term.length > 0 });
  const creators = useCreators(8);
  return (
    <SocialLayout rail={<DiscoverRail hideTrending />}>
      <PageHeader title="Explore" />
      <div className="border-b p-3">
        <label className="flex h-10 items-center gap-2 rounded-full border bg-surface-2 px-4 field-shell">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input aria-label="Search posts" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts" className="min-w-0 flex-1 bg-transparent text-sm outline-hidden" />
        </label>
      </div>
      {q.trim() ? (
        search.isLoading || term !== q.trim() ? (
          <SkeletonRows rows={3} label="Searching…" />
        ) : search.isError ? (
          <ErrorState title="Search failed" description="Check your connection and try again." onRetry={() => search.refetch()} retrying={search.isFetching} />
        ) : search.data?.length ? (
          search.data.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <EmptyState icon={Search} title={`No posts match “${q}”`} description="Try a different word or check the spelling." />
        )
      ) : (
        <>
          <section className="border-b">
            <h2 className="type-heading px-4 pt-3">Trending</h2>
            {trending.map((t, i) => (
              <button key={t.topic} onClick={() => setQ(t.topic.replace("#", "").split(" ")[0] ?? "")} className="block w-full px-4 py-2.5 text-left hover:bg-surface-hover active:bg-surface-active">
                <span className="type-caption">{i + 1} · {t.cat}</span>
                <span className="block font-semibold">{t.topic}</span>
                <span className="type-caption">{t.posts}</span>
              </button>
            ))}
          </section>
          <section className="border-b p-4">
            <h2 className="type-heading mb-3">Community topics</h2>
            <div className="flex flex-wrap gap-2">{categories.map((c) => <Link key={c} to="/live" className="rounded-md border px-2.5 py-1 text-sm hover:border-brand hover:text-brand">{c}</Link>)}</div>
          </section>
          <section>
            <h2 className="type-heading px-4 pt-3">Creators to follow</h2>
            {creators.isLoading && <SkeletonRows rows={3} label="Loading creators…" />}
            {creators.isError && <ErrorState title="Couldn't load creators" onRetry={() => creators.refetch()} retrying={creators.isFetching} />}
            {creators.data?.map((c) => (
              <div key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                <ProfileAvatar src={c.avatar} name={c.name} />
                <Link to="/profile/$handle" params={{ handle: c.handle }} className="min-w-0"><span className="block truncate type-author hover:underline">{c.name}</span><span className="block truncate type-caption">@{c.handle} · {formatCount(c.followers)} followers</span></Link>
                <FollowButton profile={c} />
              </div>
            ))}
          </section>
        </>
      )}
    </SocialLayout>
  );
}
