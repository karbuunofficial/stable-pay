import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { TabBar } from "@/components/ui/tab-bar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Coins, Mail, Radio, Video } from "lucide-react";
import { useState } from "react";
import { BackButton, PageHeader, SocialLayout } from "@/components/amixof/shell";
import { PostCard } from "@/components/amixof/post";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";
import { FollowButton } from "@/components/amixof/follow-button";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { TipDialog } from "@/components/amixof/tip";
import { getCreator, streams } from "@/data/mock";
import { formatCount } from "@/lib/composer";
import { useActor, useFeed, useProfile } from "@/lib/social/hooks";

export const Route = createFileRoute("/profile/$handle")({
  head: ({ params }) => {
    const t = `@${params.handle} — AMIXOF`;
    return { meta: [{ title: t }, { name: "description", content: `Posts and streams from @${params.handle} on AMIXOF.` }, { property: "og:title", content: t }, { property: "og:type", content: "profile" }] };
  },
  component: Profile,
});

function Profile() {
  const { handle } = Route.useParams();
  const router = useRouter();
  const { actor } = useActor();
  const profile = useProfile(handle);
  const feed = useFeed({ authorHandle: handle });
  const [tab, setTab] = useState<"posts" | "media" | "streams">("posts");
  const [tipOpen, setTipOpen] = useState(false);

  const back = <BackButton onClick={() => router.history.back()} />;

  if (profile.isLoading) {
    return <SocialLayout><PageHeader title={`@${handle}`} back={back} /><SkeletonRows rows={3} label="Loading profile…" /></SocialLayout>;
  }
  if (profile.isError) {
    return <SocialLayout><PageHeader title={`@${handle}`} back={back} /><ErrorState title="Couldn't load this profile" onRetry={() => profile.refetch()} retrying={profile.isFetching} /></SocialLayout>;
  }
  const c = profile.data;
  if (!c) {
    return <SocialLayout><PageHeader title="Profile" back={back} /><EmptyState title="Profile not found" description={`There's no one with the handle @${handle}.`} action={<Button asChild><Link to="/explore">Explore creators</Link></Button>} /></SocialLayout>;
  }

  const isMe = actor?.id === c.id;
  const demo = getCreator(c.handle); // live status and streams are still demo data
  const posts = feed.data ?? [];
  const withMedia = posts.filter((p) => p.media?.kind === "image" || p.media?.kind === "video");
  const myStreams = streams.filter((s) => s.channel === c.handle);

  return (
    <SocialLayout>
      <PageHeader title={c.name} back={back} />
      {c.banner ? <img src={c.banner} alt="" className="aspect-[3/1] w-full object-cover" /> : <div className="aspect-[3/1] w-full bg-gradient-to-br from-primary/40 to-brand/20" aria-hidden />}
      <div className="border-b px-4 pb-4">
        <div className="-mt-10 flex items-end justify-between">
          <ProfileAvatar src={c.avatar} name={c.name} size="xl" className="border-4 border-background" />
          {!isMe && (
            <div className="flex gap-2">
              <Link to="/messages" aria-label={`Message ${c.name}`} className="grid h-9 w-9 place-items-center rounded-full border hover:bg-surface-hover active:bg-surface-active"><Mail className="h-4 w-4" /></Link>
              <button onClick={() => setTipOpen(true)} className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold hover:bg-surface-hover active:bg-surface-active"><Coins className="h-4 w-4 text-chart-3" /> Tip</button>
              <FollowButton profile={c} />
            </div>
          )}
        </div>
        <p className="type-title mt-2 flex min-w-0 items-center gap-1">{c.name}{c.verified && <BadgeCheck role="img" className="h-5 w-5 text-brand" aria-label="Verified" />}</p>
        <p className="type-meta">@{c.handle}{c.category && ` · ${c.category}`}</p>
        {c.bio && <p className="mt-2 text-body text-support">{c.bio}</p>}
        <p className="mt-2 text-sm"><b>{formatCount(c.followers)}</b> <span className="text-muted-foreground">{c.followers === 1 ? "follower" : "followers"}</span></p>
        {demo?.live && <Link to="/live/$channel" params={{ channel: c.handle }} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-live px-3 text-sm font-semibold text-live-foreground"><Radio className="h-4 w-4" /> Live now · {formatCount(demo.viewers)}</Link>}
      </div>
      <TabBar label="Profile sections" value={tab} onChange={setTab} tabs={[{ value: "posts", label: "Posts" }, { value: "media", label: "Media" }, { value: "streams", label: "Streams" }]} />
      {tab === "posts" && (feed.isLoading ? <SkeletonRows rows={3} label="Loading posts…" /> : feed.isError ? <ErrorState title="Couldn't load posts" onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <EmptyState title="No posts yet" description={isMe ? "Share something from the Home tab." : `${c.name} hasn’t posted anything.`} />)}
      {tab === "media" && (withMedia.length ? <div className="grid grid-cols-3 gap-0.5">{withMedia.map((p) => <Link key={p.id} to="/post/$id" params={{ id: p.id }} aria-label={`Open post: ${p.text.slice(0, 40)}`}><img src={p.media!.src} alt="" loading="lazy" className="aspect-square w-full object-cover" /></Link>)}</div> : <EmptyState icon={Video} title="No photos or videos yet" />)}
      {tab === "streams" && (myStreams.length ? myStreams.map((s, i) => (
        <Link key={i} to="/live/$channel" params={{ channel: c.handle }} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b p-4 hover:bg-surface-hover active:bg-surface-active">
          <img src={s.thumb} alt="" className="aspect-video w-full rounded object-cover" />
          <div className="min-w-0"><p className="truncate type-author">{s.title}</p><p className="type-caption">{demo?.live ? "Live now" : "Recent"} · {s.uptime}</p></div>
        </Link>
      )) : <EmptyState icon={Radio} title="No streams yet" description="Live streams appear here once there are any." />)}
      <TipDialog open={tipOpen} onOpenChange={setTipOpen} name={c.name} surface="profile" surfaceId={c.handle} />
    </SocialLayout>
  );
}
