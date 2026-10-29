import { createFileRoute, Link } from "@tanstack/react-router";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { BadgeCheck, Bookmark, Coins, ChevronDown, ChevronUp, Gift, Heart, MessageCircle, Music2, Play, Share, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clipComments, clips, getCreator } from "@/data/mock";
import { ChatPanel } from "@/components/amixof/chat";
import { TipDialog } from "@/components/amixof/tip";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCount } from "@/lib/composer";
import { cn } from "@/lib/utils";
import { FollowButton } from "@/components/amixof/follow-button";
import { useProfile } from "@/lib/social/hooks";

/** Real follow state for the clip author (the author is a profile in the social data like anyone else). */
function ClipFollow({ handle }: { handle: string }) {
  const p = useProfile(handle);
  return p.data ? <FollowButton profile={p.data} className="h-7 shrink-0 px-2.5 text-xs" /> : null;
}

export const Route = createFileRoute("/clips")({
  head: () => ({
    meta: [
      { title: "Clips — AMIXOF" },
      { name: "description", content: "Short vertical videos from hip-hop and culture creators on AMIXOF." },
      { property: "og:title", content: "Clips — AMIXOF" },
      { property: "og:description", content: "Short vertical videos from hip-hop and culture creators." },
    ],
  }),
  component: ClipsPage,
});

const EMPTY: { user: string; text: string; color: string }[] = [];

function ClipsPage() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset["index"]));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (d: number) => {
    const i = Math.min(clips.length - 1, Math.max(0, active + d));
    scroller.current?.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="relative flex justify-center">
      <h1 className="sr-only">Clips</h1>
      <div ref={scroller} className="h-[calc(100dvh-3.5rem-3.5rem)] w-full snap-y snap-mandatory overflow-y-auto scrollbar-none md:h-[calc(100dvh-3.5rem)]">
        {clips.map((c, i) => (
          <ClipItem key={c.id} clip={c} index={i} active={i === active} muted={muted} onToggleMute={() => setMuted(!muted)} />
        ))}
      </div>
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
        <button aria-label="Previous clip" disabled={active === 0} onClick={() => go(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 hover:bg-surface-hover active:bg-surface-active disabled:opacity-50 disabled:cursor-not-allowed"><ChevronUp className="h-5 w-5" /></button>
        <button aria-label="Next clip" disabled={active === clips.length - 1} onClick={() => go(1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 hover:bg-surface-hover active:bg-surface-active disabled:opacity-50 disabled:cursor-not-allowed"><ChevronDown className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

function ClipItem({ clip, index, active, muted, onToggleMute }: { clip: (typeof clips)[number]; index: number; active: boolean; muted: boolean; onToggleMute: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const a = getCreator(clip.author)!;
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipped, setTipped] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (active && !paused) { el.play().catch(() => setPaused(true)); } else { el.pause(); }
    if (!active) el.currentTime = 0;
  }, [active, paused]);

  useEffect(() => { if (!active) setPaused(false); }, [active]);

  // on phones the rail sits over the video, so the labels need a shadow to stay readable on bright footage
  const action = "flex flex-col items-center gap-0.5 text-xs font-semibold text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.8)] sm:text-foreground sm:[text-shadow:none]";
  const bubble = "grid h-11 w-11 place-items-center rounded-full bg-surface-2/80 backdrop-blur hover:bg-surface-hover active:bg-surface-active";

  return (
    <section data-index={index} aria-label={`Clip by ${a.name}`} className="flex h-full snap-start snap-always items-center justify-center gap-4 py-3 md:py-4">
      <div className="relative h-full max-h-full aspect-[9/16] max-w-full overflow-hidden rounded-none bg-surface sm:rounded-lg sm:border">
        <video
          ref={v}
          src={clip.src}
          poster={clip.poster}
          muted={muted}
          loop
          playsInline
          preload={active ? "auto" : "metadata"}
          onClick={() => setPaused((p) => !p)}
          onDoubleClick={() => { if (!liked) setLiked(true); }}
          className="h-full w-full cursor-pointer object-cover"
        />
        {paused && (
          <button aria-label="Play" onClick={() => setPaused(false)} className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-1 h-7 w-7" /></span>
          </button>
        )}
        <button aria-label={muted ? "Unmute" : "Mute"} onClick={onToggleMute} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/60 backdrop-blur">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* phones: the action rail overlays the video, so darken that edge to keep counts readable on bright footage */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-black/60 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 via-background/40 to-transparent p-4 pr-16 pt-16 sm:pr-4">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <Link to="/profile/$handle" params={{ handle: a.handle }} className="flex min-w-0 items-center gap-2">
              <ProfileAvatar src={a.avatar} name={a.name} size="sm" />
              <span className="truncate font-semibold">{a.name}</span>
              {a.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" />}
            </Link>
            <ClipFollow handle={a.handle} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-support">{clip.caption}</p>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Music2 className="h-3.5 w-3.5 shrink-0" />{clip.sound}</p>
        </div>

        {/* Mobile: actions overlay on the video */}
        <div className="absolute bottom-24 right-2 flex flex-col gap-3 sm:hidden">
          <Actions />
        </div>
      </div>

      {/* Tablet/desktop: actions beside the video */}
      <div className="hidden flex-col gap-4 self-end pb-4 sm:flex">
        <Actions />
      </div>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="flex h-[75dvh] flex-col gap-0 p-0 sm:h-full sm:max-w-sm">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Comments · {formatCount(clip.comments)}</SheetTitle>
            <SheetDescription className="truncate">{clip.caption}</SheetDescription>
          </SheetHeader>
          <ChatPanel seed={clipComments[clip.id] ?? EMPTY} tipTo={a.name} surface="clip" surfaceId={clip.id} placeholder="Add a comment" welcome="" className="min-h-0 flex-1" />
        </SheetContent>
      </Sheet>
      <TipDialog open={tipOpen} onOpenChange={setTipOpen} name={a.name} surface="clip" surfaceId={clip.id} onTipped={(n) => setTipped((t) => t + n)} />
    </section>
  );

  function Actions() {
    return (
      <>
        <button aria-pressed={liked} aria-label={`Like, ${formatCount(clip.likes + (liked ? 1 : 0))}`} onClick={() => setLiked(!liked)} className={action}>
          <span className={bubble}><Heart className={cn("h-5 w-5", liked && "fill-brand text-brand")} /></span>{formatCount(clip.likes + (liked ? 1 : 0))}
        </button>
        <button aria-label={`Comments, ${formatCount(clip.comments)}`} onClick={() => setChatOpen(true)} className={action}>
          <span className={bubble}><MessageCircle className="h-5 w-5" /></span>{formatCount(clip.comments)}
        </button>
        <button aria-label={tipped ? `Tip ${a.name}, $${tipped} tipped` : `Tip ${a.name}`} onClick={() => setTipOpen(true)} className={action}>
          <span className={bubble}><Coins className="h-5 w-5 text-chart-3" /></span>{tipped ? `$${tipped}` : "Tip"}
        </button>
        <button aria-label="Gift" onClick={() => toast("Gift sent to " + a.name, { description: "Mic Drop · $2.00", action: { label: "Undo", onClick: () => toast("Gift cancelled") } })} className={action}>
          <span className={bubble}><Gift className="h-5 w-5 text-brand" /></span>Gift
        </button>
        <button aria-pressed={saved} aria-label="Save" onClick={() => { setSaved(!saved); toast(saved ? "Removed from bookmarks" : "Saved to bookmarks"); }} className={action}>
          <span className={bubble}><Bookmark className={cn("h-5 w-5", saved && "fill-current text-brand")} /></span>Save
        </button>
        <button aria-label={`Share, ${formatCount(clip.shares)}`} onClick={() => toast.success("Link copied")} className={action}>
          <span className={bubble}><Share className="h-5 w-5" /></span>{formatCount(clip.shares)}
        </button>
      </>
    );
  }
}
