import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRef, useState, type MouseEvent } from "react";
import { useViews } from "@/lib/views";
import {
  BadgeCheck, Bookmark, Gift, Headphones, MoreHorizontal, Heart, Image as ImageIcon, Link2, MessageCircle,
  Music, Play, Pause, Radio, Repeat2, Share, Users, Eye, SmilePlus, Flame, Video,
} from "lucide-react";
import { toast } from "sonner";
import { getCreator, type Post } from "@/data/mock";
import { TipDialog } from "@/components/amixof/tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { copyText, postUrl, shareLink } from "@/lib/share";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { useActor, useBookmark, useReact } from "@/lib/social/hooks";
import type { PostView } from "@/lib/social";
import { formatCount, POST_LIMIT, validatePost } from "@/lib/composer";
import { cn } from "@/lib/utils";

const stop = (e: MouseEvent) => e.stopPropagation();

/** Shows a view count; counts the view on mount when `count` is true (e.g. an opened article). */
export function ViewCount({ id, count = false, className }: { id: string; count?: boolean; className?: string }) {
  const views = useViews(id, { immediate: count });
  return <span className={cn("inline-flex items-center gap-1", className)} aria-label={`${views} views`}><Eye className="h-3.5 w-3.5" />{formatCount(views)} views</span>;
}

export const EXTRA_REACTIONS = ["😂", "😮", "🙌", "💯", "😢", "🔥"] as const;

/**
 * Reaction chips. Pass `onReact` (+ `counts`, `mine`) for a controlled bar backed by real data;
 * otherwise it keeps its own local state starting from `initial` (demo surfaces).
 */
export function ReactionBar({ initial, counts: controlledCounts, mine: controlledMine, onReact }: {
  initial?: Record<string, number>;
  counts?: Record<string, number>;
  mine?: string | null;
  onReact?: (kind: string) => void;
}) {
  const controlled = !!onReact;
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(initial ?? {});
  const [localMine, setLocalMine] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const counts = controlled ? (controlledCounts ?? {}) : localCounts;
  const mine = controlled ? (controlledMine ?? null) : localMine;
  const toggle = (k: string) => {
    if (controlled) return onReact(k);
    setLocalCounts((c) => ({ ...c, [k]: (c[k] ?? 0) + (localMine === k ? -1 : 1), ...(localMine && localMine !== k ? { [localMine]: (c[localMine] ?? 1) - 1 } : {}) }));
    setLocalMine(localMine === k ? null : k);
  };
  const items = [
    { k: "fire", icon: Flame, label: "Fire", cls: "text-chart-3" },
    { k: "heart", icon: Heart, label: "Love", cls: "text-brand" },
    { k: "headphones", icon: Headphones, label: "Listening", cls: "text-muted-foreground" },
  ];
  const chip = (_k: string, active: boolean) => cn("flex h-7 items-center gap-1 rounded-md border px-2 text-xs tabular-nums hover:bg-surface-hover active:bg-surface-active", active && "border-brand bg-brand/10");
  return (
    <div className="relative flex flex-wrap items-center gap-1.5" onClick={stop}>
      {items.map(({ k, icon: Icon, label, cls }) => (
        <button key={k} type="button" aria-pressed={mine === k} aria-label={`${label}, ${formatCount(counts[k] ?? 0)}`} onClick={() => toggle(k)} className={chip(k, mine === k)}>
          <Icon className={cn("h-3.5 w-3.5", cls)} /> {formatCount(counts[k] ?? 0)}
        </button>
      ))}
      {EXTRA_REACTIONS.filter((e) => (counts[e] ?? 0) > 0 || mine === e).map((e) => (
        <button key={e} type="button" aria-pressed={mine === e} aria-label={`${e}, ${formatCount(counts[e] ?? 0)}`} onClick={() => toggle(e)} className={chip(e, mine === e)}>
          <span aria-hidden>{e}</span> {formatCount(counts[e] ?? 0)}
        </button>
      ))}
      <button type="button" aria-label="Add reaction" aria-expanded={picker} onClick={() => setPicker(!picker)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover active:bg-surface-active"><SmilePlus className="h-4 w-4" /></button>
      {picker && (
        <div role="menu" className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-full border bg-popover p-1 shadow-md">
          {EXTRA_REACTIONS.map((e) => (
            <button key={e} type="button" role="menuitem" aria-label={`React ${e}`} className="grid h-8 w-8 place-items-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-surface-hover active:bg-surface-active"
              onClick={() => { if (mine !== e) toggle(e); setPicker(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconAction({ label, icon: Icon, count, onClick, active }: { label: string; icon: typeof Heart; count?: number; onClick?: () => void; active?: boolean }) {
  return (
    <button type="button" aria-label={count !== undefined ? `${label}, ${formatCount(count)}` : label} aria-pressed={active} onClick={(e) => { e.stopPropagation(); onClick?.(); }} className={cn("flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-surface-hover active:bg-surface-active hover:text-foreground", active && "text-brand")}>
      <Icon className="h-4 w-4" />{count !== undefined && <span className="tabular-nums">{formatCount(count)}</span>}
    </button>
  );
}

export function AudioPlayer({ cover, title, sub = "Audio" }: { cover: string; title: string; sub?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-surface-2 p-2" onClick={stop}>
      <img src={cover} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"><div className={cn("h-full bg-primary transition-all duration-[20s] ease-linear", playing ? "w-full" : "w-[8%]")} /></div>
        <p className="mt-1 type-caption">{sub}</p>
      </div>
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
    </div>
  );
}

/** Adapts a demo `Post` (communities) to the shared view model; these stay UI-only. */
export function fromMockPost(p: Post): PostView {
  const c = getCreator(p.author)!;
  return {
    id: p.id, source: "local", title: p.title, text: p.text, media: p.media, live: !!p.live, createdAt: null, time: p.time,
    reactions: { ...p.reactions }, myReaction: null, bookmarked: false, comments: p.comments, reposts: p.reposts, community: p.community,
    author: { id: c.handle, handle: c.handle, name: c.name, avatar: c.avatar, banner: c.banner, bio: c.bio, category: c.category, verified: c.verified, isDemo: true, followers: c.followers, following: false },
  };
}

export function PostCard({ post, expanded }: { post: PostView; expanded?: boolean }) {
  const navigate = useNavigate();
  const a = post.author;
  const live = post.source === "db";
  const react = useReact(post);
  const toggleBookmark = useBookmark(post);
  const [savedLocal, setSavedLocal] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const saved = live ? post.bookmarked : savedLocal;
  const [reposted, setReposted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const views = useViews(post.id, { ref, immediate: expanded });
  const open = () => !expanded && navigate({ to: "/post/$id", params: { id: post.id } });
  const copyLink = async () => ((await copyText(postUrl(post.id))) ? toast.success("Link copied") : toast.error("Couldn't copy the link"));
  const share = async () => {
    const r = await shareLink({ title: `${a.name} on AMIXOF`, text: post.text.slice(0, 120), url: postUrl(post.id) });
    if (r === "copied") toast.success("Link copied");
    else if (r === "failed") toast.error("Couldn't share this post");
  };
  return (
    <>
    <article
      ref={ref}
      onClick={open}
      aria-label={`Post by ${a.name}`}
      className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b px-4 py-3", !expanded && "cursor-pointer hover:bg-surface-hover active:bg-surface-active")}
    >
      <Link to="/profile/$handle" params={{ handle: a.handle }} onClick={stop} aria-label={`${a.name} profile`}>
        <ProfileAvatar src={a.avatar} name={a.name} className={cn(post.live && "ring-2 ring-live ring-offset-2 ring-offset-background")} />
      </Link>
      <div className="min-w-0">
        {post.community && (
          <Link to="/communities/$handle" params={{ handle: post.community }} onClick={stop} className="-my-1 mb-0 flex items-center gap-1 py-1 text-xs font-semibold text-brand hover:underline">
            <Users className="h-3.5 w-3.5" /> c/{post.community}
          </Link>
        )}
        {post.live && <p className="mb-0.5 flex items-center gap-1 text-xs font-bold text-live-text"><Radio className="h-3.5 w-3.5" /> LIVE NOW</p>}
        {/* name can shrink but never past ~60% of the row; the handle truncates next; the time never wraps or truncates */}
        <div className="flex min-w-0 items-baseline gap-1">
          <Link to="/profile/$handle" params={{ handle: a.handle }} onClick={stop} className="type-author -my-0.5 max-w-[60%] shrink-0 truncate py-0.5 hover:underline">{a.name}</Link>
          {a.verified && <BadgeCheck role="img" aria-label="Verified" className="size-4 shrink-0 self-center text-brand" />}
          <span className="type-meta min-w-0 truncate">@{a.handle}</span>
          <span className="type-meta shrink-0" aria-hidden>·</span>
          {/* the keyboard- and screen-reader route into the post (clicking the card is a pointer shortcut for it) */}
          {expanded ? (
            <time className="type-meta shrink-0 whitespace-nowrap">{post.time}</time>
          ) : (
            <Link to="/post/$id" params={{ id: post.id }} onClick={stop} aria-label={`Open post, ${post.time}`} className="type-meta -my-1 inline-flex min-w-6 shrink-0 justify-center whitespace-nowrap py-1 hover:underline"><time>{post.time}</time></Link>
          )}
        </div>
        {post.title && <h2 className="type-subheading wrap-anywhere mt-1">{post.title}</h2>}
        <p className={cn("type-body wrap-anywhere mt-0.5 whitespace-pre-wrap text-support", expanded && "text-lead")}>{post.text}</p>
        {post.media && (
          <div className="mt-2.5">
            {post.media.kind === "audio" ? (
              <AudioPlayer cover={post.media.src} title={post.media.title ?? "Audio"} />
            ) : (
              <div className="relative overflow-hidden rounded-lg border">
                <img src={post.media.src} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                {post.live && <Badge variant="live" className="absolute left-2 top-2">LIVE · {formatCount(getCreator(a.handle)?.viewers ?? 0)}</Badge>}
                {post.media.kind === "video" && !post.live && (
                  <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5 h-5 w-5" /></span></span>
                )}
              </div>
            )}
          </div>
        )}
        {post.live && (
          <Button asChild size="sm" className="mt-2.5">
            <Link to="/live/$channel" params={{ channel: a.handle }} onClick={stop}><Radio /> Join the room</Link>
          </Button>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1">
          <div className="flex items-center gap-3">
            {live ? <ReactionBar counts={post.reactions} mine={post.myReaction} onReact={react} /> : <ReactionBar initial={post.reactions} />}
            <span className="flex items-center gap-1 type-caption" title="Counted once per viewer when on screen for 1s" aria-label={`${views} views`}><Eye className="h-3.5 w-3.5" />{formatCount(views)}</span>
          </div>
          <div className="-mr-2 flex items-center">
            <IconAction label="Replies" icon={MessageCircle} count={post.comments} onClick={open} />
            <IconAction label="Repost" icon={Repeat2} count={post.reposts + (reposted ? 1 : 0)} active={reposted} onClick={() => setReposted(!reposted)} />
            <IconAction label="Bookmark" icon={Bookmark} active={saved} onClick={() => { if (live) return toggleBookmark(); setSavedLocal(!savedLocal); toast(saved ? "Removed from bookmarks" : "Saved to bookmarks"); }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="More actions" onClick={stop} className="flex h-8 items-center gap-1 rounded-full px-2 type-caption hover:bg-surface-hover active:bg-surface-active hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={stop}>
                <DropdownMenuItem onSelect={() => setGiftOpen(true)}><Gift className="h-4 w-4" /> Send a gift to {a.name}</DropdownMenuItem>
                <DropdownMenuItem onSelect={copyLink}><Link2 className="h-4 w-4" /> Copy link</DropdownMenuItem>
                {typeof navigator.share === "function" && <DropdownMenuItem onSelect={share}><Share className="h-4 w-4" /> Share…</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
    <TipDialog mode="gift" open={giftOpen} onOpenChange={setGiftOpen} name={a.name} surface="post" surfaceId={post.id} />
    </>
  );
}

export function Composer({ onPost, placeholder = "What's the word in the culture today?" }: { onPost: (text: string) => void | boolean | Promise<void | boolean>; placeholder?: string }) {
  const { actor } = useActor();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const v = validatePost(text);
  const submit = async () => {
    if (!v.ok) return;
    setBusy(true);
    try {
      // false means "not posted" (e.g. signed out): keep the draft
      if ((await onPost(text)) !== false) setText("");
    } catch {
      // onPost is responsible for telling the user what went wrong; keep the draft so nothing is lost
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b px-4 py-3">
      <ProfileAvatar src={actor?.avatar} name={actor?.name ?? "You"} />
      <div className="min-w-0">
        <textarea
          aria-label="Write a post"
          aria-invalid={!!v.error}
          aria-describedby="composer-count"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none bg-transparent py-1.5 text-lg placeholder:text-muted-foreground"
        />
        {v.error && <p role="alert" className="text-xs text-destructive-text">{v.error}</p>}
        <div className="mt-1 flex items-center justify-between border-t pt-2">
          <div className="flex gap-1 text-brand">
            {[[ImageIcon, "Add image"], [Video, "Add video"], [Music, "Add audio"]].map(([I, l]) => {
              const Icon = I as typeof ImageIcon;
              return <button key={l as string} type="button" aria-label={l as string} className="grid h-8 w-8 place-items-center rounded-full hover:bg-brand/10"><Icon className="h-[18px] w-[18px]" /></button>;
            })}
          </div>
          <div className="flex items-center gap-3">
            <span id="composer-count" className={cn("text-xs tabular-nums text-muted-foreground", v.remaining < 20 && "text-warning-text", v.remaining < 0 && "text-destructive-text")}>
              {v.remaining}<span className="sr-only"> of {POST_LIMIT} characters left</span>
            </span>
            <Button type="button" size="sm" shape="pill" disabled={!v.ok} loading={busy} onClick={submit}>{busy ? "Posting" : "Post"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
