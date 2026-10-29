import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { categories, getCreator, img, streams } from "@/data/mock";
import { formatCount } from "@/lib/composer";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live — AMIXOF" },
      { name: "description", content: "Watch live studio sessions, watch parties and podcasts on AMIXOF." },
      { property: "og:title", content: "Live on AMIXOF" },
      { property: "og:description", content: "Live studio sessions, watch parties and podcasts." },
    ],
  }),
  component: LiveDiscovery,
});

function LiveDiscovery() {
  const [sort, setSort] = useState("viewers");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const l = streams.map((s) => ({ ...s, c: getCreator(s.channel)! })).filter((s) => (s.title + s.c.name + s.c.category).toLowerCase().includes(q.toLowerCase()));
    return sort === "viewers" ? l.sort((a, b) => b.c.viewers - a.c.viewers) : l.sort((a, b) => a.c.viewers - b.c.viewers);
  }, [q, sort]);
  const featured = list.slice(0, 2);

  return (
    <div className="space-y-8 px-4 py-5 lg:px-6">
      <h1 className="type-title">Live now</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {featured.map((s) => (
          <Link key={s.channel} to="/live/$channel" params={{ channel: s.channel }} className="group relative overflow-hidden rounded-lg border">
            <img src={s.thumb} alt="" className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]" />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/95 via-background/60 to-transparent p-4">
              <Badge variant="live">LIVE · {formatCount(s.c.viewers)}</Badge>
              <p className="type-subheading mt-2 truncate">{s.title}</p>
              <p className="truncate text-sm text-muted-foreground">{s.c.name} · {s.c.category}</p>
            </div>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="type-heading mb-3">Categories</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setQ(c.split(/[ ,&]/)[0] ?? "")} className="w-28 shrink-0 text-left">
              <img src={img("cat-" + c, 240, 320)} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-md border object-cover hover:opacity-90" />
              <span className="mt-1 line-clamp-2 block text-xs font-medium">{c}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <h2 className="type-heading">All live channels</h2>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <select aria-label="Sort channels" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-md border bg-surface-2 px-2 text-sm">
              <option value="viewers">Viewers (high to low)</option>
              <option value="low">Viewers (low to high)</option>
            </select>
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-surface-2 px-3 field-shell sm:w-56">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input aria-label="Search live" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search live" className="min-w-0 flex-1 bg-transparent text-sm outline-hidden" />
            </label>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">No live channels match "{q}". <button className="text-brand underline" onClick={() => setQ("")}>Clear search</button></p>
        ) : (
          <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((s) => (
              <Link key={s.channel} to="/live/$channel" params={{ channel: s.channel }} className="group block min-w-0">
                <div className="relative overflow-hidden rounded-md border">
                  <img src={s.thumb} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  <Badge variant="live" className="absolute left-2 top-2">LIVE</Badge>
                  {s.following && <span className="absolute right-2 top-2 rounded bg-primary px-1.5 py-0.5 text-micro font-semibold text-primary-foreground">Following</span>}
                  <span className="absolute bottom-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-xs">{formatCount(s.c.viewers)} viewers</span>
                </div>
                <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <ProfileAvatar src={s.c.avatar} name={s.c.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-brand">{s.title}</p>
                    <p className="truncate type-caption">{s.c.name} · {s.c.category}</p>
                    <div className="mt-1 flex gap-1">{s.tags.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-micro">{t}</span>)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
