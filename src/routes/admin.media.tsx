import { createFileRoute, Link } from "@tanstack/react-router";
import { TabBar } from "@/components/ui/tab-bar";
import { ArrowLeft, Headphones, Play, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { mediaLibrary } from "@/data/mock";

export const Route = createFileRoute("/admin/media")({
  head: () => ({
    meta: [
      { title: "Media library — AMIXOF Admin" },
      { name: "description", content: "Images, videos and audio uploaded for AMIXOF blog posts." },
      { property: "og:title", content: "Media library — AMIXOF Admin" },
      { property: "og:description", content: "Images, videos and audio for blog posts." },
    ],
  }),
  component: Media,
});

function Media() {
  const [filter, setFilter] = useState<"all" | "image" | "video" | "audio">("all");
  const list = filter === "all" ? mediaLibrary : mediaLibrary.filter((m) => m.kind === filter);
  return (
    <div className="space-y-5 px-4 py-5 lg:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/admin" aria-label="Back to admin" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-surface-hover active:bg-surface-active"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="truncate type-title">Media library</h1>
        </div>
        <button onClick={() => toast("Upload started", { description: "Demo only" })} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"><Upload className="h-4 w-4" /> Upload</button>
      </div>
      <TabBar variant="pill" label="Media type" value={filter} onChange={setFilter} tabs={[{ value: "all", label: "All" }, { value: "image", label: "Images" }, { value: "video", label: "Videos" }, { value: "audio", label: "Audio" }]} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {list.map((m) => (
          <figure key={m.id} className="min-w-0">
            <div className="relative overflow-hidden rounded-md border">
              <img src={m.src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              {m.kind !== "image" && <span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">{m.kind === "video" ? <Play className="ml-0.5 h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}</span>}
            </div>
            <figcaption className="mt-1 truncate text-xs"><span className="font-medium">{m.name}</span> <span className="text-muted-foreground">· {m.size}</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
