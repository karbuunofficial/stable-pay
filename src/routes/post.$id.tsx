import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BackButton, PageHeader, SocialLayout } from "@/components/amixof/shell";
import { Composer, PostCard } from "@/components/amixof/post";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/amixof/states";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { getCreator, replies as seedReplies } from "@/data/mock";
import { useActor, usePost, useRequireActor } from "@/lib/social/hooks";

export const Route = createFileRoute("/post/$id")({
  head: () => ({ meta: [{ title: "Post — AMIXOF" }, { property: "og:type", content: "article" }] }),
  component: PostPage,
});

type Reply = { name: string; handle: string; avatar: string; time: string; text: string };

function PostPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const post = usePost(id);
  const { actor } = useActor();
  const need = useRequireActor();
  const [added, setAdded] = useState<Reply[]>([]);

  const back = <BackButton onClick={() => router.history.back()} />;
  if (post.isLoading) return <SocialLayout><PageHeader title="Post" back={back} /><SkeletonRows rows={2} label="Loading post…" /></SocialLayout>;
  if (post.isError) return <SocialLayout><PageHeader title="Post" back={back} /><ErrorState title="Couldn't load this post" onRetry={() => post.refetch()} retrying={post.isFetching} /></SocialLayout>;
  const p = post.data;
  if (!p) return <SocialLayout><PageHeader title="Post" back={back} /><EmptyState title="Post not found" description="It may have been removed." action={<Button asChild><Link to="/">Back to Home</Link></Button>} /></SocialLayout>;

  // Replies aren't stored yet. Sample replies appear only under sample posts; yours stay on this page until reload.
  const sample: Reply[] = p.author.isDemo
    ? seedReplies.flatMap((r) => { const a = getCreator(r.author); return a ? [{ name: a.name, handle: a.handle, avatar: a.avatar, time: r.time, text: r.text }] : []; })
    : [];
  const replies = [...sample, ...added];

  return (
    <SocialLayout>
      <PageHeader title="Post" back={back} />
      <PostCard post={p} expanded />
      <Composer
        placeholder="Post your reply"
        onPost={async (t) => {
          const a = await need("reply");
          if (!a) return false;
          setAdded((r) => [...r, { name: a.name, handle: a.handle, avatar: a.avatar, time: "now", text: t }]);
        }}
      />
      <p className="border-b px-4 py-1.5 type-caption">Replies aren't saved yet{actor ? "" : ". Sign in to reply"}.</p>
      {replies.map((r, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b px-4 py-3">
          <ProfileAvatar src={r.avatar} name={r.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm"><span className="font-semibold">{r.name}</span> <span className="text-muted-foreground">@{r.handle} · {r.time}</span></p>
            <p className="text-body text-support">{r.text}</p>
          </div>
        </div>
      ))}
    </SocialLayout>
  );
}
