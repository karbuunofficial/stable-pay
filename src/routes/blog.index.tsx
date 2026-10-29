import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, Play } from "lucide-react";
import { ViewCount } from "@/components/amixof/post";
import { articles, getCreator } from "@/data/mock";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — AMIXOF" },
      { name: "description", content: "Stories, video features and podcast episodes from the AMIXOF editorial team." },
      { property: "og:title", content: "The AMIXOF Blog" },
      { property: "og:description", content: "Stories, video features and podcast episodes." },
    ],
  }),
  component: Blog,
});

function Blog() {
  const lead = articles[0]!;
  const rest = articles.slice(1);
  const la = getCreator(lead.author)!;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="type-title mb-4">Blog</h1>
      <Link to="/blog/$slug" params={{ slug: lead.slug }} className="group grid gap-4 border-b pb-6 md:grid-cols-[3fr_2fr]">
        <img src={lead.media.src} alt="" className="aspect-video w-full rounded-lg border object-cover" />
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Feature</p>
          <h2 className="type-title mt-1 group-hover:text-brand">{lead.title}</h2>
          <p className="mt-2 text-muted-foreground">{lead.excerpt}</p>
          <p className="mt-3 type-caption">{la.name} · {lead.date} · {lead.readTime} · <ViewCount id={`blog:${lead.slug}`} /></p>
        </div>
      </Link>
      <div className="divide-y">
        {rest.map((a) => {
          const au = getCreator(a.author)!;
          return (
            <Link key={a.slug} to="/blog/$slug" params={{ slug: a.slug }} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-5">
              <div className="min-w-0">
                <h2 className="type-heading group-hover:text-brand">{a.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</p>
                <p className="mt-2 type-caption">{au.name} · {a.date} · {a.readTime} · <ViewCount id={`blog:${a.slug}`} /></p>
              </div>
              <div className="relative w-32 shrink-0 sm:w-48">
                <img src={a.media.src} alt="" loading="lazy" className="aspect-video w-full rounded-md border object-cover" />
                <span className="absolute bottom-1.5 left-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                  {a.media.kind === "audio" ? <Headphones className="h-3.5 w-3.5" /> : a.media.kind === "video" ? <Play className="ml-0.5 h-3.5 w-3.5" /> : null}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
