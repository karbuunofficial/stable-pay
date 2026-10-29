import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TabBar } from "@/components/ui/tab-bar";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import {
  Check, Crown, Grid3x3, LayoutGrid, LogOut, Mic, MicOff, MoreVertical, PanelTop, UserMinus, UserPlus,
  Users, Video, VideoOff, WifiOff, X, Loader2, Hand, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { avatar, creators, img, type Creator } from "@/data/mock";
import {
  MAX_ON_STAGE, gridCols, isFull, onStageCount, stageReducer,
  type Layout, type Participant, type StageState,
} from "@/lib/multiguest";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ME = { id: "me", name: "You", avatar: avatar(32) };

const audience = [
  { id: "v-ari", name: "Ari Bands", avatar: avatar(20) },
  { id: "v-dre", name: "Dre Cuts", avatar: avatar(52) },
  { id: "v-nia", name: "Nia Waves", avatar: avatar(9) },
  { id: "v-jo", name: "Jo Static", avatar: avatar(61) },
  { id: "v-tay", name: "Tay Verse", avatar: avatar(44) },
];

function initial(host: Creator): StageState {
  const guests = creators.filter((c) => c.handle !== host.handle).slice(0, 4);
  return {
    live: true,
    layout: "adaptive",
    self: "viewer",
    participants: [
      { id: host.handle, name: host.name, avatar: host.avatar, role: "host", mic: true, cam: true, status: "live", mutedByHost: false, simulated: true },
      ...guests.map((g, i) => ({ id: g.handle, name: g.name, avatar: g.avatar, role: "guest" as const, mic: i !== 2, cam: i !== 1, status: "live" as const, mutedByHost: false, simulated: true })),
    ],
    queue: [
      { ...audience[0]!, kind: "request", status: "pending" },
      { ...audience[1]!, kind: "request", status: "pending", audioOnly: true },
    ],
  };
}

export type StageApi = { names: string[] };

export function MultiGuestStage({ host, onParticipantsChange, modeSwitch }: { host: Creator; onParticipantsChange?: (names: string[]) => void; modeSwitch?: React.ReactNode }) {
  const [s, dispatch] = useReducer(stageReducer, host, initial);
  const [asHost, setAsHost] = useState(true);
  const [speaking, setSpeaking] = useState<string | null>(host.handle);
  const [queueOpen, setQueueOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const count = onStageCount(s);
  const full = isFull(s);
  const pending = s.queue.filter((q) => q.status === "pending");
  const me = s.participants.find((p) => p.id === "me");

  // Report on-stage names for tip/gift recipient selection.
  const names = useMemo(() => s.participants.filter((p) => p.status === "live").map((p) => p.name), [s.participants]);
  const namesKey = names.join("|");
  const cb = useRef(onParticipantsChange);
  cb.current = onParticipantsChange;
  useEffect(() => { cb.current?.(names); }, [namesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated active-speaker detection.
  useEffect(() => {
    const t = setInterval(() => {
      const talkers = s.participants.filter((p) => p.mic && p.status === "live");
      setSpeaking(talkers.length ? talkers[Math.floor(Math.random() * talkers.length)]!.id : null);
    }, 1800);
    return () => clearInterval(t);
  }, [s.participants]);

  // Joining → live after a short simulated connection.
  useEffect(() => {
    const joining = s.participants.filter((p) => p.status === "joining");
    const ts = joining.map((p) => setTimeout(() => {
      dispatch({ type: "connected", id: p.id });
      if (p.id === "me") dispatch({ type: "self", self: "onstage" });
    }, 1400));
    return () => ts.forEach(clearTimeout);
  }, [s.participants]);

  useEffect(() => {
    if (s.notice) { toast.error(s.notice); dispatch({ type: "clearNotice" }); }
  }, [s.notice]);

  // Viewer perspective: simulate the host answering your request.
  useEffect(() => {
    if (asHost || s.self !== "pending") return;
    const t = setTimeout(() => {
      if (isFull(s)) {
        dispatch({ type: "decline", id: "me" });
        dispatch({ type: "self", self: "declined" });
        toast("The stage is full right now", { description: "Your request was declined. Try again when a seat opens." });
      } else {
        dispatch({ type: "self", self: "previewing" });
        setPreviewOpen(true);
        toast.success(`${host.name} approved your request`, { description: "Check your mic and camera before joining." });
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [asHost, s.self, s, host.name]);

  const requestToJoin = () => {
    if (full) { toast.error(`Room full — ${MAX_ON_STAGE} of ${MAX_ON_STAGE} on stage`); return; }
    dispatch({ type: "request", req: ME });
    dispatch({ type: "self", self: "pending" });
  };

  const cancelRequest = () => {
    dispatch({ type: "decline", id: "me" });
    dispatch({ type: "self", self: "viewer" });
    toast("Request cancelled");
  };

  const joinFromPreview = (mic: boolean, cam: boolean) => {
    setPreviewOpen(false);
    dispatch({ type: "admit", p: { ...ME, mic, cam, simulated: false } });
    dispatch({ type: "self", self: "joining" });
  };

  const leave = () => {
    dispatch({ type: "leave", id: "me" });
    dispatch({ type: "self", self: "viewer" });
    toast("You left the stage", { description: "You're back in the audience." });
  };

  const remove = (p: Participant) => {
    dispatch({ type: "remove", id: p.id });
    toast(`${p.name} was removed from the stage`, { description: "The broadcast continues." });
  };

  const tiles = s.participants;
  const hostP = tiles.find((p) => p.role === "host")!;
  const guests = tiles.filter((p) => p.role === "guest");

  return (
    <div className="flex flex-col">
      {/* Stage toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-brand" /> Multi-guest</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", full ? "bg-live/15 text-live-text" : "bg-surface-2")} aria-live="polite">
          {count}/{MAX_ON_STAGE} on stage{full && " · Room full"}
        </span>
        <div role="radiogroup" aria-label="Stage layout" className="flex rounded-md border p-0.5">
          {([["adaptive", LayoutGrid, "Adaptive"], ["grid", Grid3x3, "3×3"], ["focus", PanelTop, "Host focus"]] as const).map(([k, Icon, l]) => (
            <button key={k} role="radio" aria-checked={s.layout === k} onClick={() => dispatch({ type: "layout", layout: k as Layout })} className={cn("flex h-7 items-center gap-1 rounded px-2 text-xs", s.layout === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-hover active:bg-surface-active")}>
              <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {modeSwitch}
          {/* Everything that only exists to preview the demo lives in one clearly labelled place */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex h-7 items-center gap-1 rounded-md border px-2 type-caption hover:bg-surface-hover active:bg-surface-active hover:text-foreground">Demo controls</button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>Preview the stage as</span>
                <span className="flex items-center gap-1.5 type-caption">
                  <span className={cn(!asHost && "font-semibold text-foreground")}>Viewer</span>
                  <Switch checked={asHost} onCheckedChange={setAsHost} aria-label="Preview as host" />
                  <span className={cn(asHost && "font-semibold text-foreground")}>Host</span>
                </span>
              </label>
              {asHost && <SimMenu participants={guests} onStatus={(id, st) => dispatch({ type: "status", id, status: st })} />}
              <p className="type-caption">All participants are simulated. These controls only preview how the stage behaves.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stage */}
      <div className="bg-background p-1.5">
        {s.layout === "focus" ? (
          <div className="grid gap-1.5 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <Tile p={hostP} speaking={speaking === hostP.id} asHost={asHost} large onMute={() => {}} onRemove={() => {}} onToggle={() => {}} onLeave={() => {}} />
            <div className="grid grid-cols-4 content-start gap-1.5 md:grid-cols-2">
              {guests.map((p) => (
                <Tile key={p.id} p={p} small speaking={speaking === p.id} asHost={asHost}
                  onMute={() => dispatch({ type: "hostMute", id: p.id })} onRemove={() => remove(p)}
                  onToggle={(d) => dispatch({ type: "selfToggle", id: p.id, device: d })} onLeave={leave} />
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-1.5", s.layout === "grid" ? "grid-cols-3" : { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" }[gridCols(tiles.length, s.layout)])}>
            {tiles.map((p) => (
              <Tile key={p.id} p={p} speaking={speaking === p.id} asHost={asHost}
                onMute={() => dispatch({ type: "hostMute", id: p.id })} onRemove={() => remove(p)}
                onToggle={(d) => dispatch({ type: "selfToggle", id: p.id, device: d })} onLeave={leave} />
            ))}
            {s.layout === "grid" && Array.from({ length: MAX_ON_STAGE - tiles.length }, (_, i) => (
              <div key={`open-${i}`} className="grid aspect-video place-items-center rounded-md border border-dashed type-caption">Open seat</div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {asHost ? (
          <>
            <button onClick={() => setQueueOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
              <UserPlus className="h-4 w-4" /> Requests & invites
              {pending.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-foreground px-1 text-micro font-bold text-primary">{pending.length}</span>}
            </button>
          </>
        ) : (
          <ViewerActions self={s.self} full={full} me={me} onRequest={requestToJoin} onCancel={cancelRequest}
            onAcceptInvite={() => { dispatch({ type: "self", self: "previewing" }); setPreviewOpen(true); }}
            onDeclineInvite={() => { dispatch({ type: "decline", id: "me" }); dispatch({ type: "self", self: "viewer" }); }}
            onToggle={(d) => dispatch({ type: "selfToggle", id: "me", device: d })} onLeave={leave}
            onPreview={() => setPreviewOpen(true)} />
        )}
      </div>

      <QueueSheet open={queueOpen} onOpenChange={setQueueOpen} state={s} full={full}
        onApprove={(id) => { dispatch({ type: "approve", id }); }}
        onDecline={(id) => dispatch({ type: "decline", id })}
        onInvite={(v) => { dispatch({ type: "invite", req: v }); toast(`Invite sent to ${v.name}`); }}
        onInviteSelf={() => { dispatch({ type: "invite", req: ME }); dispatch({ type: "self", self: "invited" }); toast("Invite sent to You", { description: "Switch to Viewer to answer it." }); }}
      />

      <JoinPreview open={previewOpen} onOpenChange={(v) => { setPreviewOpen(v); if (!v && s.self === "previewing") { dispatch({ type: "self", self: "viewer" }); toast("You didn't join the stage"); } }} full={full} onJoin={joinFromPreview} />
    </div>
  );
}

function Tile({ p, speaking, asHost, large, small, onMute, onRemove, onToggle, onLeave }: {
  p: Participant; speaking: boolean; asHost: boolean; large?: boolean; small?: boolean;
  onMute: () => void; onRemove: () => void; onToggle: (d: "mic" | "cam") => void; onLeave: () => void;
}) {
  const isMe = p.id === "me";
  const showVideo = p.cam && p.status === "live";
  return (
    <div className={cn("group relative overflow-hidden rounded-md border bg-surface", large ? "aspect-video" : "aspect-video", speaking && p.mic && p.status === "live" && "ring-2 ring-brand")}
      aria-label={`${p.name}${p.role === "host" ? ", host" : ""}, mic ${p.mic ? "on" : "off"}${speaking ? ", speaking" : ""}`}>
      {showVideo ? (
        <img src={img(`stage-${p.id}`, 640, 360)} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center bg-surface-2">
          <div className="text-center">
            <ProfileAvatar src={p.avatar} name={p.name} size={small ? "sm" : "lg"} className={cn("mx-auto", speaking && p.mic && "ring-2 ring-brand ring-offset-2 ring-offset-surface-2")} />
            {!small && p.status === "live" && <p className="mt-1 text-micro text-muted-foreground">Audio only</p>}
          </div>
        </div>
      )}

      {p.status !== "live" && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            {p.status === "joining" && <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</>}
            {p.status === "reconnecting" && <><Loader2 className="h-4 w-4 animate-spin" /> Reconnecting…</>}
            {p.status === "disconnected" && <><WifiOff className="h-4 w-4 text-live-text" /> Disconnected</>}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-background/90 to-transparent px-1.5 pb-1 pt-4">
        {p.mic ? <Mic className={cn("h-3.5 w-3.5 shrink-0", speaking ? "text-brand" : "text-foreground")} aria-hidden /> : <MicOff className="h-3.5 w-3.5 shrink-0 text-live-text" aria-hidden />}
        <span className={cn("truncate font-medium", small ? "text-nano" : "text-xs")}>{p.name}</span>
        {p.role === "host" && <span className="flex shrink-0 items-center gap-0.5 rounded bg-primary px-1 text-nano font-bold text-primary-foreground"><Crown className="h-2.5 w-2.5" />HOST</span>}
        {p.mutedByHost && !small && <span className="shrink-0 text-nano text-muted-foreground">muted by host</span>}
      </div>
      {p.simulated && !small && <span className="absolute left-1.5 top-1.5 rounded bg-background/70 px-1 text-nano text-muted-foreground">Simulated</span>}

      {/* Host controls on guests (mute is one-way: off only) */}
      {asHost && p.role === "guest" && !isMe && (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`Manage ${p.name}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/70 hover:bg-background">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!p.mic} onSelect={onMute}><MicOff className="mr-2 h-4 w-4" />{p.mic ? "Mute mic" : "Muted — only they can unmute"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemove} className="text-destructive-text focus:text-destructive-text"><UserMinus className="mr-2 h-4 w-4" />Remove from stage</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Own device controls */}
      {isMe && !small && p.status === "live" && (
        <div className="absolute right-1 top-1 flex gap-1">
          <button aria-label="Your microphone" aria-pressed={p.mic} onClick={() => onToggle("mic")} className="grid h-7 w-7 place-items-center rounded-full bg-background/70">{p.mic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-live-text" />}</button>
          <button aria-label="Your camera" aria-pressed={p.cam} onClick={() => onToggle("cam")} className="grid h-7 w-7 place-items-center rounded-full bg-background/70">{p.cam ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-live-text" />}</button>
          <button aria-label="Leave the stage" onClick={onLeave} className="grid h-7 w-7 place-items-center rounded-full bg-live text-live-foreground"><LogOut className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}

function ViewerActions({ self, full, me, onRequest, onCancel, onAcceptInvite, onDeclineInvite, onToggle, onLeave, onPreview }: {
  self: StageState["self"]; full: boolean; me?: Participant | undefined;
  onRequest: () => void; onCancel: () => void; onAcceptInvite: () => void; onDeclineInvite: () => void;
  onToggle: (d: "mic" | "cam") => void; onLeave: () => void; onPreview: () => void;
}) {
  const btn = "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm";
  switch (self) {
    case "viewer":
      return full
        ? <span className="flex h-8 items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Room full — requests reopen when a seat frees up</span>
        : <button onClick={onRequest} className={cn(btn, "bg-primary font-semibold text-primary-foreground")}><Hand className="h-4 w-4" /> Request to join</button>;
    case "pending":
      return <span className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Request pending — waiting for the host <button onClick={onCancel} className={cn(btn, "border")}>Cancel request</button></span>;
    case "declined":
      return <span className="flex items-center gap-2 text-sm text-muted-foreground"><X className="h-4 w-4 text-live-text" /> Your request was declined <button onClick={onRequest} disabled={full} className={cn(btn, "border text-foreground disabled:opacity-50 disabled:cursor-not-allowed")}><RotateCcw className="h-4 w-4" /> Ask again</button></span>;
    case "invited":
      return <span className="flex items-center gap-2 text-sm">The host invited you to the stage <button onClick={onAcceptInvite} className={cn(btn, "bg-primary font-semibold text-primary-foreground")}>Accept</button><button onClick={onDeclineInvite} className={cn(btn, "border")}>Not now</button></span>;
    case "previewing":
      return <button onClick={onPreview} className={cn(btn, "bg-primary font-semibold text-primary-foreground")}>Check devices & join</button>;
    case "joining":
      return <span className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Joining the stage…</span>;
    case "onstage":
      return me ? (
        <div className="flex gap-1.5">
          <button onClick={() => onToggle("mic")} aria-pressed={me.mic} className={cn(btn, "border")}>{me.mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-live-text" />}{me.mic ? "Mic on" : "Mic off"}</button>
          <button onClick={() => onToggle("cam")} aria-pressed={me.cam} className={cn(btn, "border")}>{me.cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-live-text" />}{me.cam ? "Camera on" : "Audio only"}</button>
          <button onClick={onLeave} className={cn(btn, "bg-live font-semibold text-live-foreground")}><LogOut className="h-4 w-4" /> Leave stage</button>
          {me.mutedByHost && <span className="self-center type-caption">The host muted you. Unmute when ready.</span>}
        </div>
      ) : null;
  }
}

function QueueSheet({ open, onOpenChange, state, full, onApprove, onDecline, onInvite, onInviteSelf }: {
  open: boolean; onOpenChange: (v: boolean) => void; state: StageState; full: boolean;
  onApprove: (id: string) => void; onDecline: (id: string) => void;
  onInvite: (v: { id: string; name: string; avatar: string }) => void; onInviteSelf: () => void;
}) {
  const [tab, setTab] = useState<"requests" | "invite">("requests");
  const onStage = new Set(state.participants.map((p) => p.id));
  const queued = new Map(state.queue.map((q) => [q.id, q]));
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle>Stage guests</SheetTitle>
          <SheetDescription>{onStageCount(state)}/{MAX_ON_STAGE} on stage{full ? " · Room full — remove a guest to approve more" : ""}</SheetDescription>
        </SheetHeader>
        <TabBar label="Stage queue" value={tab} onChange={setTab} tabs={[{ value: "requests", label: `Requests (${state.queue.filter((q) => q.status === "pending" && q.kind === "request").length})` }, { value: "invite", label: "Invite viewers" }]} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "requests" ? (
            state.queue.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No requests yet.</p> :
            state.queue.map((q) => (
              <div key={q.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
                <ProfileAvatar src={q.avatar} name={q.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{q.name}</p>
                  <p className="type-caption">
                    {q.status === "declined" ? "Declined" : q.kind === "invite" ? "Invite sent · waiting" : "Wants to join"}{q.audioOnly && " · audio only"}
                  </p>
                </div>
                {q.status === "pending" && q.kind === "request" ? (
                  <div className="flex gap-1">
                    <button aria-label={`Approve ${q.name}`} disabled={full} title={full ? "Room full" : undefined} onClick={() => onApprove(q.id)} className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"><Check className="h-4 w-4" /></button>
                    <button aria-label={`Decline ${q.name}`} onClick={() => onDecline(q.id)} className="grid h-8 w-8 place-items-center rounded-full border"><X className="h-4 w-4" /></button>
                  </div>
                ) : <span className="type-caption">{q.status === "declined" ? "—" : "Pending"}</span>}
              </div>
            ))
          ) : (
            <>
              {[...audience, ME].map((v) => {
                const q = queued.get(v.id);
                const disabled = full || onStage.has(v.id) || q?.status === "pending";
                return (
                  <div key={v.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
                    <ProfileAvatar src={v.avatar} name={v.name} size="sm" />
                    <p className="truncate text-sm font-semibold">{v.name}{v.id === "me" && <span className="ml-1 text-xs font-normal text-muted-foreground">(demo: you as viewer)</span>}</p>
                    <button disabled={disabled} onClick={() => (v.id === "me" ? onInviteSelf() : onInvite(v))} className="h-8 rounded-md border px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {onStage.has(v.id) ? "On stage" : q?.status === "pending" ? "Invited" : full ? "Full" : "Invite"}
                    </button>
                  </div>
                );
              })}
              <p className="p-4 type-caption">Invited viewers choose their own mic and camera before joining. Hosts can never turn a guest's devices on.</p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JoinPreview({ open, onOpenChange, full, onJoin }: { open: boolean; onOpenChange: (v: boolean) => void; full: boolean; onJoin: (mic: boolean, cam: boolean) => void }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!open || !mic) { setLevel(0); return; }
    const t = setInterval(() => setLevel(Math.random()), 180);
    return () => clearInterval(t);
  }, [open, mic]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check your mic and camera</DialogTitle>
          <DialogDescription>Nothing is shared until you join. Simulated preview.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-md border bg-surface-2">
          {cam ? <img src={img("preview-me", 640, 360)} alt="Your camera preview" className="h-full w-full object-cover" /> : (
            <div className="grid h-full place-items-center text-center"><div><ProfileAvatar src={ME.avatar} name={ME.name} size="lg" className="mx-auto" /><p className="mt-1 type-caption">Camera off — you'll join audio only</p></div></div>
          )}
          <div className="absolute bottom-2 left-2 flex h-6 items-center gap-1.5 rounded bg-background/80 px-2 text-xs">
            {mic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-live-text" />}
            <span className="flex h-2 w-16 overflow-hidden rounded-full bg-border" aria-label="Mic level"><span className="bg-online transition-all" style={{ width: `${level * 100}%` }} /></span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button aria-pressed={mic} onClick={() => setMic(!mic)} className={cn("flex h-9 items-center justify-center gap-1.5 rounded-md border text-sm", !mic && "border-live text-live-text")}>{mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}{mic ? "Mic on" : "Mic off"}</button>
          <button aria-pressed={cam} onClick={() => setCam(!cam)} className={cn("flex h-9 items-center justify-center gap-1.5 rounded-md border text-sm", !cam && "border-live text-live-text")}>{cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}{cam ? "Camera on" : "Audio only"}</button>
        </div>
        {full && <p role="alert" className="text-xs text-destructive-text">The stage just filled up. You can't join right now.</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => onOpenChange(false)} className="h-9 rounded-md border px-4 text-sm">Cancel</button>
          <button disabled={full} onClick={() => onJoin(mic, cam)} className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">Join stage</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Lets you trigger network states on simulated guests to preview the UI. */
function SimMenu({ participants, onStatus }: { participants: Participant[]; onStatus: (id: string, s: Participant["status"]) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-surface-hover active:bg-surface-active"><WifiOff className="h-4 w-4" /> Simulate network</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {participants.filter((p) => p.simulated).map((p) => (
          <div key={p.id}>
            <p className="px-2 pt-2 text-xs font-semibold text-muted-foreground">{p.name}</p>
            {(["live", "reconnecting", "disconnected"] as const).map((st) => (
              <DropdownMenuItem key={st} disabled={p.status === st} onSelect={() => onStatus(p.id, st)} className="capitalize">{st === "live" ? "Connected" : st}</DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
