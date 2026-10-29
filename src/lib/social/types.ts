export type Media = { kind: "image" | "video" | "audio"; src: string; title?: string };

export type Profile = {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  banner: string;
  bio: string;
  category: string;
  verified: boolean;
  /** seeded sample creator, not a real StablePay user */
  isDemo: boolean;
  followers: number;
  /** does the signed-in viewer follow this profile */
  following: boolean;
};

export type PostView = {
  id: string;
  /** "db" posts are backed by the repository and are interactive; "local" posts (community demo) keep UI-only state */
  source: "db" | "local";
  author: Profile;
  title?: string | undefined;
  text: string;
  media?: Media | undefined;
  live: boolean;
  /** ISO timestamp, or null for demo posts that only have a relative label */
  createdAt: string | null;
  /** display label such as "4m" */
  time: string;
  reactions: Record<string, number>;
  myReaction: string | null;
  bookmarked: boolean;
  comments: number;
  reposts: number;
  community?: string | undefined;
};

export type NotificationKind = "live" | "tip" | "mention" | "follow" | "like" | "gift";

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  actor: { handle: string; name: string; avatar: string };
  /** what happened, without the actor's name: "followed you", "reacted 🔥 to your post" */
  text: string;
  /** relative label such as "4m" */
  time: string;
  /** ISO timestamp when known (real data); demo items only have a label */
  createdAt: string | null;
  mention: boolean;
  /** where tapping it should go */
  postId?: string | undefined;
};

export type FeedFilter = {
  following?: boolean;
  authorHandle?: string;
  bookmarked?: boolean;
  q?: string;
  limit?: number;
};

/** The signed-in StablePay user, as far as the social layer needs to know. */
export type ActorUser = { id: string; username: string; display_name?: string | undefined; avatar_url?: string | undefined };

export interface SocialRepo {
  readonly mode: "supabase" | "mock";
  ensureProfile(user: ActorUser): Promise<Profile>;
  listFeed(filter: FeedFilter, viewerId?: string): Promise<PostView[]>;
  getPost(id: string, viewerId?: string): Promise<PostView | null>;
  getProfile(handle: string, viewerId?: string): Promise<Profile | null>;
  listCreators(viewerId?: string, limit?: number): Promise<Profile[]>;
  createPost(authorId: string, text: string): Promise<PostView>;
  setReaction(postId: string, profileId: string, kind: string | null): Promise<void>;
  setBookmark(postId: string, profileId: string, on: boolean): Promise<void>;
  setFollow(followerId: string, followeeId: string, on: boolean): Promise<void>;
  updateProfile(profileId: string, changes: { name: string }): Promise<void>;
  /** Things other people did that involve this profile: new followers, reactions on its posts. */
  listNotifications(profileId: string): Promise<NotificationView[]>;
}

const MIN = 60_000;
/** "4m", "3h", "2d", or a short date for older posts */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MIN) return "now";
  if (diff < 60 * MIN) return `${Math.floor(diff / MIN)}m`;
  if (diff < 24 * 60 * MIN) return `${Math.floor(diff / (60 * MIN))}h`;
  if (diff < 7 * 24 * 60 * MIN) return `${Math.floor(diff / (24 * 60 * MIN))}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
