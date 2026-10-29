import { createFileRoute, Link } from "@tanstack/react-router";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { FileAudio, FileImage, FileVideo, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { articles, creators, getCreator, reports as seed } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — AMIXOF" },
      { name: "description", content: "Manage blog posts, reports and users on AMIXOF." },
      { property: "og:title", content: "Admin — AMIXOF" },
      { property: "og:description", content: "Manage blog posts, reports and users." },
    ],
  }),
  component: Admin,
});

const kindIcon = { image: FileImage, video: FileVideo, audio: FileAudio };

function Admin() {
  const [reports, setReports] = useState(seed);
  const resolve = (id: string) => {
    const prev = reports;
    setReports((r) => r.map((x) => (x.id === id ? { ...x, status: "Resolved" } : x)));
    toast("Report resolved", { action: { label: "Undo", onClick: () => setReports(prev) } });
  };
  return (
    <div className="space-y-6 px-4 py-5 lg:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate type-title">Admin</h1>
        <div className="flex gap-2">
          <Link to="/admin/media" className="h-9 rounded-md border px-3 text-sm leading-9 hover:bg-surface-hover active:bg-surface-active">Media library</Link>
          <button onClick={() => toast("New blog post draft created")} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> New post</button>
        </div>
      </div>
      <section>
        <h2 className="type-subheading mb-2">Blog posts</h2>
        <div className="divide-y rounded-lg border">
          {articles.map((a) => {
            const Icon = kindIcon[a.media.kind];
            return (
              <div key={a.slug} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <Icon className="h-5 w-5 text-brand" aria-label={a.media.kind} />
                <Link to="/blog/$slug" params={{ slug: a.slug }} className="min-w-0"><span className="block truncate font-medium hover:underline">{a.title}</span><span className="type-caption">{getCreator(a.author)?.name} · {a.date}</span></Link>
                <span className="rounded-full bg-success-subtle px-2 py-0.5 text-xs text-success-text">Published</span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="type-subheading mb-2">Reports</h2>
          <div className="divide-y rounded-lg border">
            {reports.map((r) => (
              <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{r.target}</p><p className="type-caption">{r.reason} · {r.time}</p></div>
                {r.status === "Open" ? <button onClick={() => resolve(r.id)} className="h-8 rounded-md border px-3 text-sm hover:bg-surface-hover active:bg-surface-active">Resolve</button> : <span className="type-caption">Resolved</span>}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="type-subheading mb-2">Users</h2>
          <div className="divide-y rounded-lg border">
            {creators.slice(0, 5).map((c) => (
              <div key={c.handle} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <ProfileAvatar src={c.avatar} name={c.name} size="sm" />
                <span className="min-w-0 truncate text-sm"><b>{c.name}</b> <span className="text-muted-foreground">@{c.handle}</span></span>
                <span className={cn("text-xs", c.verified ? "text-brand" : "text-muted-foreground")}>{c.verified ? "Verified" : "Member"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
