import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { Play } from "lucide-react";
import { ChatPanel } from "@/components/amixof/chat";
import { AudioPlayer, ReactionBar, ViewCount } from "@/components/amixof/post";
import { getArticle, getCreator } from "@/data/mock";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    const t = a ? `${a.title} — AMIXOF Blog` : "Article — AMIXOF Blog";
    const d = a?.excerpt ?? "An article on AMIXOF.";
    const meta = [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }];
    if (a) meta.push({ property: "og:image", content: a.media.src }, { name: "twitter:image", content: a.media.src } as never);
    return { meta };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article: a } = Route.useLoaderData();
  const au = getCreator(a.author)!;
  return (
    <div className="flex flex-col xl:h-[calc(100dvh-3.5rem)] xl:flex-row">
      <article className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-6">
          {a.media.kind === "audio" ? (
            <AudioPlayer cover={a.media.src} title={a.title} sub={a.readTime} />
          ) : (
            <div className="relative overflow-hidden rounded-lg border">
              <img src={a.media.src} alt="" className="aspect-video w-full object-cover" />
              {a.media.kind === "video" && <span className="absolute inset-0 grid place-items-center"><button aria-label="Play video" className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-1 h-6 w-6" /></button></span>}
            </div>
          )}
          <h1 className="type-display mt-4">{a.title}</h1>
          <Link to="/profile/$handle" params={{ handle: au.handle }} className="mt-3 flex min-w-0 items-center gap-2 text-sm">
            <ProfileAvatar src={au.avatar} name={au.name} size="sm" />
            <span className="type-author shrink-0">{au.name}</span><span className="type-meta min-w-0 truncate">· {a.date} · {a.readTime} · <ViewCount id={`blog:${a.slug}`} count /></span>
          </Link>
          <div className="measure wrap-anywhere mt-5 space-y-4 text-lead text-support">
            {a.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-6 border-t pt-4"><ReactionBar initial={{ fire: 320, heart: 210, headphones: 88 }} /></div>
        </div>
      </article>
      <aside aria-label="Discussion" className="flex h-[70vh] flex-col border-t xl:h-auto xl:w-[360px] xl:border-l xl:border-t-0">
        <ChatPanel surface="blog" surfaceId={a.slug} title="DISCUSSION" tipTo={au.name} placeholder="Join the discussion" welcome="Keep it respectful. The author reads every message." className="flex-1" />
      </aside>
    </div>
  );
}
