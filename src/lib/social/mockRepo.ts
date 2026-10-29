/**
 * In-memory social repository: used when Supabase isn't configured (or VITE_SOCIAL_SOURCE=mock).
 * Same interface as the real one, so the UI doesn't care. State resets on reload.
 */
import { creators, me, notifications as seedNotifications, posts as seedPosts, streams, type Creator, type Post } from "@/data/mock";
import type { NotificationKind, NotificationView, PostView, Profile, SocialRepo } from "./types";

export const MOCK_ACTOR_ID = "you";

const toProfile = (c: Creator): Profile => ({
  id: c.handle, handle: c.handle, name: c.name, avatar: c.avatar, banner: c.banner, bio: c.bio,
  category: c.category, verified: c.verified, isDemo: true, followers: c.followers, following: false,
});

const actor: Profile = { id: MOCK_ACTOR_ID, handle: "you", name: me.name, avatar: me.avatar, banner: "", bio: "", category: "", verified: false, isDemo: true, followers: 0, following: false };

const baseProfiles = new Map<string, Profile>([...creators.map((c) => [c.handle, toProfile(c)] as const), [actor.handle, actor]]);
const initialFollows = new Set<string>(streams.filter((s) => s.following).map((s) => s.channel));
const follows = new Set<string>(initialFollows);
const myReactions = new Map<string, string>();
const bookmarks = new Set<string>();
const created: PostView[] = [];

const seed = (p: Post): PostView => ({
  id: p.id, source: "db", author: baseProfiles.get(p.author)!, title: p.title, text: p.text, media: p.media, live: !!p.live,
  createdAt: null, time: p.time, reactions: { ...p.reactions }, myReaction: null, bookmarked: false,
  comments: p.comments, reposts: p.reposts,
});

const base: PostView[] = seedPosts.filter((p) => !p.community).map(seed);

const profileFor = (h: string): Profile => {
  const p = baseProfiles.get(h)!;
  const delta = (follows.has(h) ? 1 : 0) - (initialFollows.has(h) ? 1 : 0);
  return { ...p, following: follows.has(h), followers: p.followers + delta };
};

const view = (p: PostView): PostView => {
  const mine = myReactions.get(p.id) ?? null;
  const reactions = { ...p.reactions };
  // stored counts never include the viewer's own reaction; add it back on read
  if (mine) reactions[mine] = (reactions[mine] ?? 0) + 1;
  return { ...p, author: profileFor(p.author.handle), reactions, myReaction: mine, bookmarked: bookmarks.has(p.id) };
};

const all = () => [...created, ...base];

export const mockRepo: SocialRepo = {
  mode: "mock",
  async ensureProfile() { return profileFor(actor.handle); },
  async listFeed(f) {
    let list = all();
    if (f.following) list = list.filter((p) => follows.has(p.author.handle) || p.author.handle === actor.handle);
    if (f.authorHandle) list = list.filter((p) => p.author.handle === f.authorHandle);
    if (f.bookmarked) list = list.filter((p) => bookmarks.has(p.id));
    if (f.q) list = list.filter((p) => p.text.toLowerCase().includes(f.q!.toLowerCase()));
    return list.slice(0, f.limit ?? 50).map(view);
  },
  async getPost(id) {
    const p = all().find((x) => x.id === id);
    return p ? view(p) : null;
  },
  async getProfile(handle) { return baseProfiles.has(handle) ? profileFor(handle) : null; },
  async listCreators(_v, limit = 10) { return creators.slice(0, limit).map((c) => profileFor(c.handle)); },
  async createPost(_a, text) {
    const p: PostView = { id: `n${Date.now()}`, source: "db", author: actor, text: text.trim(), live: false, createdAt: new Date().toISOString(), time: "now", reactions: {}, myReaction: null, bookmarked: false, comments: 0, reposts: 0 };
    created.unshift(p);
    return view(p);
  },
  async setReaction(postId, _p, kind) { if (kind === null) myReactions.delete(postId); else myReactions.set(postId, kind); },
  async setBookmark(postId, _p, on) { if (on) bookmarks.add(postId); else bookmarks.delete(postId); },
  async setFollow(_f, followeeId, on) { if (on) follows.add(followeeId); else follows.delete(followeeId); },
  async updateProfile(_id, changes) { actor.name = changes.name; },
  async listNotifications() {
    return seedNotifications.flatMap((n): NotificationView[] => {
      const c = baseProfiles.get(n.who);
      return c ? [{ id: n.id, kind: n.kind as NotificationKind, actor: { handle: c.handle, name: c.name, avatar: c.avatar }, text: n.text, time: n.time, createdAt: null, mention: n.mention }] : [];
    });
  },
};
