import { supabase } from "@/utils/supabase";
import { timeAgo, type ActorUser, type FeedFilter, type Media, type NotificationView, type PostView, type Profile, type SocialRepo } from "./types";

interface ProfileRow {
  id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  category: string;
  verified: boolean;
  is_demo: boolean;
  follower_baseline: number;
}

interface PostRow {
  id: string;
  title: string | null;
  body: string;
  media: Media | null;
  is_live: boolean;
  reaction_baseline: Record<string, number>;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  author: ProfileRow;
  reactions: { profile_id: string; kind: string }[];
}

const PROFILE_COLS = "id,handle,name,avatar_url,banner_url,bio,category,verified,is_demo,follower_baseline";
const POST_COLS = `id,title,body,media,is_live,reaction_baseline,comments_count,reposts_count,created_at,author:profiles!posts_author_id_fkey!inner(${PROFILE_COLS}),reactions(profile_id,kind)`;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Follower totals and "does the viewer follow" for a set of profiles. */
async function followStats(profileIds: string[], viewerId?: string) {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (!profileIds.length) return { counts, mine };
  const all = check(await supabase.from("follows").select("followee_id").in("followee_id", profileIds)) ?? [];
  for (const r of all as { followee_id: string }[]) counts.set(r.followee_id, (counts.get(r.followee_id) ?? 0) + 1);
  if (viewerId) {
    const m = check(await supabase.from("follows").select("followee_id").eq("follower_id", viewerId).in("followee_id", profileIds)) ?? [];
    for (const r of m as { followee_id: string }[]) mine.add(r.followee_id);
  }
  return { counts, mine };
}

const toProfile = (r: ProfileRow, stats: Awaited<ReturnType<typeof followStats>>): Profile => ({
  id: r.id,
  handle: r.handle,
  name: r.name,
  avatar: r.avatar_url ?? "",
  banner: r.banner_url ?? "",
  bio: r.bio,
  category: r.category,
  verified: r.verified,
  isDemo: r.is_demo,
  followers: r.follower_baseline + (stats.counts.get(r.id) ?? 0),
  following: stats.mine.has(r.id),
});

function toPost(r: PostRow, author: Profile, viewerId: string | undefined, bookmarked: Set<string>): PostView {
  const reactions: Record<string, number> = { ...r.reaction_baseline };
  let myReaction: string | null = null;
  for (const x of r.reactions) {
    reactions[x.kind] = (reactions[x.kind] ?? 0) + 1;
    if (x.profile_id === viewerId) myReaction = x.kind;
  }
  return {
    id: r.id,
    source: "db",
    author,
    title: r.title ?? undefined,
    text: r.body,
    media: r.media ?? undefined,
    live: r.is_live,
    createdAt: r.created_at,
    time: timeAgo(r.created_at),
    reactions,
    myReaction,
    bookmarked: bookmarked.has(r.id),
    comments: r.comments_count,
    reposts: r.reposts_count,
  };
}

async function hydrate(rows: PostRow[], viewerId?: string): Promise<PostView[]> {
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.map((r) => r.author.id))];
  const stats = await followStats(authorIds, viewerId);
  const authors = new Map(rows.map((r) => [r.author.id, toProfile(r.author, stats)]));
  const bookmarked = new Set<string>();
  if (viewerId) {
    const b = check(await supabase.from("bookmarks").select("post_id").eq("profile_id", viewerId).in("post_id", rows.map((r) => r.id))) ?? [];
    for (const x of b as { post_id: string }[]) bookmarked.add(x.post_id);
  }
  return rows.map((r) => toPost(r, authors.get(r.author.id)!, viewerId, bookmarked));
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const slug = (s: string) => {
  const v = s.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30);
  return v.length >= 2 ? v : `user_${v}`;
};

export const supabaseRepo: SocialRepo = {
  mode: "supabase",

  async ensureProfile(user: ActorUser) {
    const existing = check(await supabase.from("profiles").select(PROFILE_COLS).eq("user_id", user.id).maybeSingle()) as ProfileRow | null;
    let row = existing;
    for (let attempt = 0; !row && attempt < 4; attempt++) {
      const handle = attempt === 0 ? slug(user.username) : `${slug(user.username).slice(0, 25)}${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await supabase
        .from("profiles")
        .insert({ handle, name: user.display_name || user.username, avatar_url: user.avatar_url ?? null, user_id: user.id })
        .select(PROFILE_COLS)
        .single();
      if (res.error?.code === "23505") continue; // handle taken, or another tab created the profile first
      row = check(res) as ProfileRow;
    }
    if (!row) row = check(await supabase.from("profiles").select(PROFILE_COLS).eq("user_id", user.id).single()) as ProfileRow;
    return toProfile(row, await followStats([row.id], row.id));
  },

  async listFeed(f: FeedFilter, viewerId) {
    let ids: string[] | null = null;
    if (f.bookmarked) {
      if (!viewerId) return [];
      const b = check(await supabase.from("bookmarks").select("post_id").eq("profile_id", viewerId).order("created_at", { ascending: false })) ?? [];
      ids = (b as { post_id: string }[]).map((x) => x.post_id);
      if (!ids.length) return [];
    }
    let authorIds: string[] | null = null;
    if (f.following) {
      if (!viewerId) return [];
      const fl = check(await supabase.from("follows").select("followee_id").eq("follower_id", viewerId)) ?? [];
      authorIds = [...(fl as { followee_id: string }[]).map((x) => x.followee_id), viewerId];
    }
    let q = supabase.from("posts").select(POST_COLS).order("created_at", { ascending: false }).limit(f.limit ?? 50);
    if (ids) q = q.in("id", ids);
    if (authorIds) q = q.in("author_id", authorIds);
    if (f.authorHandle) q = q.eq("author.handle", f.authorHandle);
    if (f.q) q = q.ilike("body", `%${escapeLike(f.q)}%`);
    return hydrate((check(await q) ?? []) as unknown as PostRow[], viewerId);
  },

  async getPost(id, viewerId) {
    const row = check(await supabase.from("posts").select(POST_COLS).eq("id", id).maybeSingle()) as unknown as PostRow | null;
    return row ? (await hydrate([row], viewerId))[0]! : null;
  },

  async getProfile(handle, viewerId) {
    const row = check(await supabase.from("profiles").select(PROFILE_COLS).eq("handle", handle).maybeSingle()) as ProfileRow | null;
    return row ? toProfile(row, await followStats([row.id], viewerId)) : null;
  },

  async listCreators(viewerId, limit = 10) {
    const rows = (check(await supabase.from("profiles").select(PROFILE_COLS).order("follower_baseline", { ascending: false }).limit(limit)) ?? []) as ProfileRow[];
    const stats = await followStats(rows.map((r) => r.id), viewerId);
    return rows.map((r) => toProfile(r, stats));
  },

  async createPost(authorId, text) {
    const row = check(await supabase.from("posts").insert({ author_id: authorId, body: text.trim() }).select(POST_COLS).single()) as unknown as PostRow;
    return (await hydrate([row], authorId))[0]!;
  },

  async setReaction(postId, profileId, kind) {
    if (kind === null) {
      check(await supabase.from("reactions").delete().eq("post_id", postId).eq("profile_id", profileId).select());
      return;
    }
    // Only `kind` is updatable, so switch an existing reaction with UPDATE and fall back to INSERT.
    const updated = check(await supabase.from("reactions").update({ kind }).eq("post_id", postId).eq("profile_id", profileId).select()) ?? [];
    if (updated.length) return;
    const ins = await supabase.from("reactions").insert({ post_id: postId, profile_id: profileId, kind }).select();
    if (ins.error?.code === "23505") {
      // another tab inserted between our UPDATE and INSERT
      check(await supabase.from("reactions").update({ kind }).eq("post_id", postId).eq("profile_id", profileId).select());
    } else check(ins);
  },

  async setBookmark(postId, profileId, on) {
    if (on) check(await supabase.from("bookmarks").upsert({ post_id: postId, profile_id: profileId }, { onConflict: "post_id,profile_id", ignoreDuplicates: true }).select());
    else check(await supabase.from("bookmarks").delete().eq("post_id", postId).eq("profile_id", profileId).select());
  },

  async listNotifications(profileId) {
    type Who = { handle: string; name: string; avatar_url: string | null };
    const who = (p: Who) => ({ handle: p.handle, name: p.name, avatar: p.avatar_url ?? "" });
    const follows = (check(
      await supabase.from("follows").select("created_at, follower:profiles!follows_follower_id_fkey(handle,name,avatar_url)").eq("followee_id", profileId).order("created_at", { ascending: false }).limit(30),
    ) ?? []) as unknown as { created_at: string; follower: Who }[];
    const reactions = (check(
      await supabase
        .from("reactions")
        .select("post_id, kind, created_at, reactor:profiles!reactions_profile_id_fkey(handle,name,avatar_url), post:posts!inner(author_id)")
        .eq("post.author_id", profileId)
        .neq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(30),
    ) ?? []) as unknown as { post_id: string; kind: string; created_at: string; reactor: Who }[];

    const items: NotificationView[] = [
      ...follows.map((f) => ({ id: `f:${f.follower.handle}:${f.created_at}`, kind: "follow" as const, actor: who(f.follower), text: "followed you", time: timeAgo(f.created_at), createdAt: f.created_at, mention: false })),
      ...reactions.map((r) => ({ id: `r:${r.post_id}:${r.reactor.handle}`, kind: "like" as const, actor: who(r.reactor), text: `reacted ${r.kind} to your post`, time: timeAgo(r.created_at), createdAt: r.created_at, mention: false, postId: r.post_id })),
    ];
    return items.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 40);
  },

  async updateProfile(profileId, changes) {
    const rows = check(await supabase.from("profiles").update({ name: changes.name }).eq("id", profileId).select("id")) ?? [];
    if (!(rows as unknown[]).length) throw new Error("Couldn't update your profile");
  },

  async setFollow(followerId, followeeId, on) {
    if (on) check(await supabase.from("follows").upsert({ follower_id: followerId, followee_id: followeeId }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true }).select());
    else check(await supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId).select());
  },
};
