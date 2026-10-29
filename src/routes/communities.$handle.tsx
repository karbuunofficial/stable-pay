import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { useMemo, useState } from "react";
import { Check, Crown, Lock, Radio, Shield, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { BackButton, PageHeader, SocialLayout } from "@/components/amixof/shell";
import { EmptyState } from "@/components/amixof/states";
import { Composer, PostCard, fromMockPost } from "@/components/amixof/post";
import { ChatPanel } from "@/components/amixof/chat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approve, canManage, canViewContent, communityStore, decline, join, joinAction, leave, removeMember, roleOf, setRole, useCommunities,
} from "@/lib/communities";
import { communityPosts, getCreator, me, posts, streams, type Post } from "@/data/mock";
import { PRIVACY } from "./communities.index";

export const Route = createFileRoute("/communities/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `c/${params.handle} — AMIXOF Communities` },
      { name: "description", content: `Feed, chat and LIVE rooms in the c/${params.handle} community on AMIXOF.` },
      { property: "og:title", content: `c/${params.handle} — AMIXOF` },
      { property: "og:description", content: `Join c/${params.handle} on AMIXOF.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

const nameOf = (h: string) => (h === me.handle ? me.name : getCreator(h)?.name ?? h);
const avatarOf = (h: string) => (h === me.handle ? me.avatar : getCreator(h)?.avatar);

function CommunityPage() {
  const { handle } = Route.useParams();
  const all = useCommunities();
  const c = all.find((x) => x.handle === handle);
  const [extra, setExtra] = useState<Post[]>([]);
  const feed = useMemo(() => [...extra, ...posts, ...communityPosts].filter((p) => p.community === handle), [extra, handle]);
  const chatSeed = useMemo(() => feed.slice(0, 4).map((p, i) => ({ user: nameOf(p.author), text: p.text.slice(0, 70), color: `text-chart-${(i % 5) + 1}` })), [feed]);

  if (!c) return <SocialLayout><PageHeader title="Community not found" /><p className="p-4 text-sm text-muted-foreground"><Link to="/communities" className="text-brand underline">Browse communities</Link></p></SocialLayout>;

  const role = roleOf(c, me.handle);
  const canView = canViewContent(c, me.handle);
  const manager = canManage(c, me.handle);
  const P = PRIVACY[c.privacy];
  const live = c.liveHost ? streams.find((s) => s.channel === c.liveHost) : undefined;

  const onJoin = () => {
    const a = joinAction(c, me.handle);
    if (a === "needs-invite") { toast.error("This community is invite-only."); return; }
    communityStore.update(c.handle, (x) => join(x, me.handle));
    toast.success(a === "joined" ? `Joined c/${c.handle}` : "Request sent — a moderator will review it");
  };
  const requested = c.requests.includes(me.handle);

  return (
    <SocialLayout>
      <PageHeader title={c.name} back={<BackButton to="/communities" />} />
      <img src={c.cover} alt="" className="aspect-[3/1] w-full object-cover" />
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="type-title min-w-0 truncate">{c.name}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>c/{c.handle}</span><span className="flex items-center gap-1"><P.icon className="h-3.5 w-3.5" />{P.label}</span><span>{c.members.length} members</span>
              {role && <span className="rounded bg-secondary px-1.5 text-xs capitalize text-secondary-foreground">{role}</span>}
            </p>
          </div>
          {role ? (
            role !== "owner" && <Button variant="outline" size="sm" onClick={() => { communityStore.update(c.handle, (x) => leave(x, me.handle)); toast(`Left c/${c.handle}`); }}>Leave</Button>
          ) : (
            <Button size="sm" disabled={requested} onClick={onJoin}>{requested ? "Requested" : c.privacy === "private" ? "Request to join" : "Join"}</Button>
          )}
        </div>
        <p className="mt-2 text-sm text-support">{c.description}</p>
        {c.topics.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.topics.map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t}</span>)}</div>}
      </div>

      {!canView ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{c.suspended ? "This community is suspended" : "Members only"}</p>
          <p className="text-sm text-muted-foreground">{requested ? "Your request is waiting for a moderator." : "Join to see the feed, chat and LIVE rooms."}</p>
        </div>
      ) : (
        <Tabs defaultValue="feed">
          <TabsList className="sticky top-[6.5rem] z-20 h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-background/90 p-0 backdrop-blur">
            {["feed", "chat", "live", "about", "members"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent px-2.5 py-3 capitalize sm:px-4 data-[state=active]:border-primary data-[state=active]:shadow-none">
                {t}{t === "members" && manager && c.requests.length > 0 ? ` (${c.requests.length})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="feed" className="mt-0">
            {role ? (
              <Composer placeholder={`Post to c/${c.handle}`} onPost={(text) => {
                if (c.postApproval && !manager) { toast.success("Post submitted — waiting for moderator approval"); return; }
                setExtra((e) => [{ id: `n${Date.now()}`, community: c.handle, author: "kaydence", time: "now", text, reactions: { fire: 0, heart: 0, headphones: 0 }, comments: 0, reposts: 0 }, ...e]);
                toast.success("Posted");
              }} />
            ) : <p className="border-b px-4 py-3 text-sm text-muted-foreground">Join to post, react and chat.</p>}
            {feed.length === 0 ? <EmptyState title="No posts yet" description="Start the conversation." /> : feed.map((p) => <PostCard key={p.id} post={fromMockPost(p)} />)}
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <p className="border-b px-4 py-2 type-caption">Persistent community chat (demo). Tips go to the member you pick, never to the owner by default.</p>
            <ChatPanel surface="post" surfaceId={c.handle} className="h-[60vh]" seed={chatSeed} title={`c/${c.handle} chat`} tipTo={nameOf(c.members[0]!.handle)} recipients={c.members.map((m) => nameOf(m.handle))} welcome={`Welcome to c/${c.handle}. ${c.rules[0] ?? ""}`} placeholder={role ? "Message the community" : "Join to chat"} />
          </TabsContent>

          <TabsContent value="live" className="mt-0 p-4">
            {live ? (
              <Link to="/live/$channel" params={{ channel: live.channel }} className="block overflow-hidden rounded-xl border hover:bg-surface-hover active:bg-surface-active">
                <div className="relative"><img src={live.thumb} alt="" className="aspect-video w-full object-cover" />
                  <Badge variant="live" className="absolute left-2 top-2 flex items-center gap-1"><Radio className="h-3 w-3" />LIVE</Badge></div>
                <div className="p-3"><p className="font-semibold">{live.title}</p><p className="type-caption">Hosted by {nameOf(live.channel)} · up to 1 host + 8 guests on stage · own audience chat</p></div>
              </Link>
            ) : <p className="text-center text-sm text-muted-foreground">No community LIVE right now.</p>}
            {manager && <Button className="mt-3 w-full" variant="outline" onClick={() => toast("Demo: community LIVE scheduling comes with live-video integration")}>Start a community LIVE</Button>}
          </TabsContent>

          <TabsContent value="about" className="mt-0 space-y-3 p-4 text-sm">
            <div><h3 className="type-subheading">Privacy</h3><p className="text-muted-foreground">{P.hint}</p></div>
            <div><h3 className="type-subheading">Posting</h3><p className="text-muted-foreground">{c.postApproval ? "Member posts need moderator approval." : "Members can post freely."}</p></div>
            <div><h3 className="type-subheading">Rules</h3><ol className="list-decimal pl-5 text-support">{c.rules.map((r) => <li key={r}>{r}</li>)}</ol></div>
            <p className="type-caption">Tips on posts support the post's creator; LIVE gifts go to the host or guest you select. Platform admins can suspend communities.</p>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            {manager && c.requests.length > 0 && (
              <div className="border-b"><h3 className="type-subheading px-4 pt-3">Join requests</h3>
                {c.requests.map((u) => (
                  <div key={u} className="flex items-center gap-3 px-4 py-2">
                    <ProfileAvatar src={avatarOf(u)} name={nameOf(u)} size="sm" /><span className="flex-1 text-sm font-medium">{nameOf(u)}</span>
                    <Button size="icon" variant="ghost" aria-label={`Approve ${nameOf(u)}`} onClick={() => communityStore.update(c.handle, (x) => approve(x, me.handle, u))}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Decline ${nameOf(u)}`} onClick={() => communityStore.update(c.handle, (x) => decline(x, me.handle, u))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
            {c.members.map((m) => (
              <div key={m.handle} className="flex items-center gap-3 border-b px-4 py-2.5">
                <ProfileAvatar src={avatarOf(m.handle)} name={nameOf(m.handle)} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{nameOf(m.handle)}</p>
                  <p className="flex items-center gap-1 text-xs capitalize text-muted-foreground">{m.role === "owner" ? <Crown className="h-3 w-3" /> : m.role === "moderator" ? <Shield className="h-3 w-3" /> : null}{m.role}</p></div>
                {role === "owner" && m.role !== "owner" && (
                  <Button size="sm" variant="ghost" onClick={() => communityStore.update(c.handle, (x) => setRole(x, me.handle, m.handle, m.role === "moderator" ? "member" : "moderator"))}>
                    {m.role === "moderator" ? "Remove mod" : "Make mod"}
                  </Button>
                )}
                {manager && m.handle !== me.handle && (role === "owner" ? m.role !== "owner" : m.role === "member") && (
                  <Button size="icon" variant="ghost" aria-label={`Remove ${nameOf(m.handle)}`} onClick={() => { communityStore.update(c.handle, (x) => removeMember(x, me.handle, m.handle)); toast(`Removed ${nameOf(m.handle)}`); }}><UserMinus className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </SocialLayout>
  );
}
