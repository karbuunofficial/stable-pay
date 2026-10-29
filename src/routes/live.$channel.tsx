import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { BadgeCheck, Bell, Gift, Heart, Maximize, MessageSquare, PanelLeftClose, PanelLeftOpen, PanelRightClose, Pause, Play, Share, Users, Volume2, VolumeX, Coins } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/amixof/chat";
import { ReactionBar } from "@/components/amixof/post";
import { useShell } from "@/components/amixof/shell";
import { getCreator, streams } from "@/data/mock";
import { formatCount } from "@/lib/composer";
import { cn } from "@/lib/utils";
import { TipDialog } from "@/components/amixof/tip";
import { MultiGuestStage } from "@/components/amixof/multiguest";

export const Route = createFileRoute("/live/$channel")({
  loader: ({ params }) => {
    const creator = getCreator(params.channel);
    if (!creator) throw notFound();
    const stream = streams.find((s) => s.channel === params.channel);
    return { creator, stream };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.creator.name}${loaderData.stream ? " — " + loaderData.stream.title : ""} | AMIXOF` : "Live room — AMIXOF";
    const d = loaderData?.creator.bio ?? "Watch live on AMIXOF.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  component: LiveRoom,
});

function LiveRoom() {
  const { creator: c, stream } = Route.useLoaderData();
  const { navCollapsed, setNavCollapsed } = useShell();
  const [chatOpen, setChatOpen] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [following, setFollowing] = useState(!!stream?.following);
  const [tipOpen, setTipOpen] = useState(false);
  const live = c.live && stream;
  const [multi, setMulti] = useState(!!live);
  const [stageNames, setStageNames] = useState<string[]>([c.name]);
  const [giftOpen, setGiftOpen] = useState(false);
  const recipients = multi ? stageNames : [c.name];
  // one Solo / Multi-guest switch; it sits in the stage toolbar when the stage is open, above the player otherwise
  const modeSwitch = (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden text-muted-foreground sm:inline">Stage mode</span>
      <div role="radiogroup" aria-label="Stage mode" className="flex rounded-md border p-0.5">
        <button role="radio" aria-checked={!multi} onClick={() => setMulti(false)} className={cn("h-6 rounded px-2", !multi ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-hover active:bg-surface-active")}>Solo</button>
        <button role="radio" aria-checked={multi} onClick={() => setMulti(true)} className={cn("h-6 rounded px-2", multi ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-hover active:bg-surface-active")}>Multi-guest</button>
      </div>
    </div>
  );

  return (
    <div className="flex lg:h-[calc(100dvh-3.5rem)]">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <h1 className="sr-only">{stream ? `${c.name} — ${stream.title}` : `${c.name} — offline`}</h1>
        {live && !multi && <div className="flex justify-end border-b px-3 py-1.5">{modeSwitch}</div>}
        {multi && live ? <MultiGuestStage host={c} onParticipantsChange={setStageNames} modeSwitch={modeSwitch} /> : (
        <div className="relative bg-background">
          <div className="relative mx-auto aspect-video max-h-[calc(100dvh-12rem)] w-full overflow-hidden bg-surface">
            {live ? (
              <img src={stream.thumb.replace("800/450", "1280/720")} alt={`${c.name} live stream`} className={cn("h-full w-full object-cover", !playing && "opacity-60")} />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">{c.name} is offline</div>
            )}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              {live && <Badge variant="live">LIVE</Badge>}
              <span className="rounded bg-background/70 px-1.5 py-0.5 text-xs">Simulated broadcast</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-background/90 to-transparent px-2 pb-2 pt-8">
              <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</button>
              <button aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)} className="grid h-9 w-9 place-items-center rounded hover:bg-surface-hover active:bg-surface-active">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
              <div className="flex-1" />
              <button aria-label={navCollapsed ? "Show menu" : "Hide menu"} onClick={() => setNavCollapsed(!navCollapsed)} className="hidden h-9 w-9 place-items-center rounded hover:bg-surface-hover active:bg-surface-active md:grid">{navCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
              {!chatOpen && <button aria-label="Show chat" onClick={() => setChatOpen(true)} className="hidden h-9 w-9 place-items-center rounded hover:bg-surface-hover active:bg-surface-active lg:grid"><MessageSquare className="h-5 w-5" /></button>}
              <button aria-label="Fullscreen" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="grid h-9 w-9 place-items-center rounded hover:bg-surface-hover active:bg-surface-active"><Maximize className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
        )}

        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Link to="/profile/$handle" params={{ handle: c.handle }} aria-label={`${c.name}’s profile`}><ProfileAvatar src={c.avatar} name={c.name} size="lg" className="ring-2 ring-live ring-offset-2 ring-offset-background" /></Link>
            <div className="min-w-0">
              <p className="type-heading flex items-center gap-1"><span className="truncate">{c.name}</span>{c.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" />}</p>
              <p className="truncate text-sm">{stream?.title ?? "Offline"}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs"><span className="text-brand">{c.category}</span>{stream?.tags.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2">{t}</span>)}</div>
            </div>
            <div className="col-span-2 flex flex-col items-start gap-2 sm:col-span-1 sm:items-end">
              <div className="flex gap-1.5">
                <button onClick={() => { setFollowing(!following); toast(following ? `Unfollowed ${c.name}` : `Following ${c.name}`); }} className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold", following ? "border bg-surface-2" : "bg-primary text-primary-foreground hover:bg-primary/90")}><Heart className={cn("h-4 w-4", following && "fill-current text-brand")} />{following ? "Following" : "Follow"}</button>
                <button aria-label="Notify me when live" onClick={() => toast("You'll be notified when " + c.name + " goes live")} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-surface-hover active:bg-surface-active"><Bell className="h-4 w-4" /></button>
                <button onClick={() => setGiftOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-surface-hover active:bg-surface-active"><Gift className="h-4 w-4" /> Gift</button>
                <button onClick={() => setTipOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-surface-hover active:bg-surface-active"><Coins className="h-4 w-4" /> Tip</button>
              </div>
              {live && <p className="flex items-center gap-3 text-sm"><span className="flex items-center gap-1 text-live-text"><Users className="h-4 w-4" />{formatCount(c.viewers)}</span><span className="tabular-nums text-muted-foreground">{stream.uptime}</span><Button variant="ghost" size="icon-sm" aria-label="Share stream" onClick={() => toast.success("Link copied")} className="-my-1 text-muted-foreground hover:text-foreground"><Share /></Button></p>}
            </div>
          </div>
          <div className="mt-3"><ReactionBar initial={{ fire: 1200, heart: 640, headphones: 210 }} /></div>
        </div>
        <section className="max-w-3xl px-4 py-5">
          <h2 className="type-heading">About {c.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.bio}</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatCount(c.followers)} followers</p>
        </section>
        {/* Mobile/tablet: chat below */}
        <ChatPanel title="STREAM CHAT" surface="live" surfaceId={c.handle} tipTo={c.name} recipients={recipients} simulate={!!live} className="h-[60vh] border-t lg:hidden" />
      </div>

      {chatOpen && (
        <aside aria-label="Stream chat" className="hidden w-[340px] shrink-0 flex-col border-l lg:flex">
          <div className="flex h-11 shrink-0 items-center border-b px-2">
            <button aria-label="Hide chat" onClick={() => setChatOpen(false)} className="grid h-8 w-8 place-items-center rounded hover:bg-surface-hover active:bg-surface-active"><PanelRightClose className="h-4 w-4" /></button>
            <span className="flex-1 text-center text-xs font-bold tracking-wider">STREAM CHAT</span>
            <span className="w-8" />
          </div>
          <ChatPanel surface="live" surfaceId={c.handle} tipTo={c.name} recipients={recipients} simulate={!!live} className="flex-1" />
        </aside>
      )}

      <TipDialog surface="live" surfaceId={c.handle} open={tipOpen} onOpenChange={setTipOpen} name={c.name} recipients={recipients} />
      <TipDialog surface="live" surfaceId={c.handle} mode="gift" open={giftOpen} onOpenChange={setGiftOpen} name={c.name} recipients={recipients} />
    </div>
  );
}
