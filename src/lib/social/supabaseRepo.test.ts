import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "@/test/fakeSupabase";

const fake = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import("@/test/fakeSupabase").createFakeSupabase> }));
vi.mock("@/utils/supabase", () => ({ get supabase() { return fake.current!.client; } }));

import { supabaseRepo as repo } from "@/lib/social/supabaseRepo";

let f: ReturnType<typeof createFakeSupabase>;
beforeEach(() => { f = createFakeSupabase(); fake.current = f; });

const profileRow = (over = {}) => ({ id: "prof-1", handle: "kaydence", name: "Kaydence", avatar_url: "a.png", banner_url: null, bio: "b", category: "c", verified: true, is_demo: true, follower_baseline: 100, ...over });
const postRow = (over = {}) => ({
  id: "p1", title: null, body: "hello", media: null, is_live: false, reaction_baseline: { fire: 10 }, comments_count: 2, reposts_count: 1,
  created_at: new Date().toISOString(), author: profileRow(), reactions: [], ...over,
});

describe("listFeed", () => {
  it("combines baseline and real reactions, finds the viewer's own, and counts followers and bookmarks", async () => {
    f.respond("posts", f.ok([postRow({ reactions: [{ profile_id: "me", kind: "fire" }, { profile_id: "x", kind: "fire" }, { profile_id: "y", kind: "💯" }] })]));
    f.respond("follows", f.ok([{ followee_id: "prof-1" }, { followee_id: "prof-1" }]), f.ok([{ followee_id: "prof-1" }]));
    f.respond("bookmarks", f.ok([{ post_id: "p1" }]));

    const [p] = await repo.listFeed({}, "me");
    expect(p).toMatchObject({ id: "p1", source: "db", text: "hello", myReaction: "fire", bookmarked: true, comments: 2, reposts: 1 });
    expect(p!.reactions).toEqual({ fire: 12, "💯": 1 }); // baseline 10 + 2 real fire, plus the emoji
    expect(p!.author).toMatchObject({ handle: "kaydence", followers: 102, following: true, avatar: "a.png", banner: "" });
  });

  it("returns an empty feed without hitting the network when nothing matches", async () => {
    f.respond("posts", f.ok([]));
    expect(await repo.listFeed({})).toEqual([]);
    expect(f.on("follows")).toHaveLength(0);
  });

  it("a signed-out viewer has no bookmarks and no following feed (and no queries are made)", async () => {
    expect(await repo.listFeed({ bookmarked: true })).toEqual([]);
    expect(await repo.listFeed({ following: true })).toEqual([]);
    expect(f.calls).toHaveLength(0);
  });

  it("returns nothing for a viewer with no bookmarks, without querying posts", async () => {
    f.respond("bookmarks", f.ok([]));
    expect(await repo.listFeed({ bookmarked: true }, "me")).toEqual([]);
    expect(f.on("posts")).toHaveLength(0);
  });

  it("'following' includes the viewer's own posts", async () => {
    f.respond("follows", f.ok([{ followee_id: "a" }, { followee_id: "b" }]));
    f.respond("posts", f.ok([]));
    await repo.listFeed({ following: true }, "me");
    const q = f.on("posts")[0]!;
    expect(f.args(q, "in")).toEqual(["author_id", ["a", "b", "me"]]);
  });

  it("escapes LIKE wildcards in search so '50%' doesn't match everything", async () => {
    f.respond("posts", f.ok([]));
    await repo.listFeed({ q: "50%_off\\" });
    expect(f.args(f.on("posts")[0]!, "ilike")).toEqual(["body", "%50\\%\\_off\\\\%"]);
  });

  it("filters by author handle and applies the limit, newest first", async () => {
    f.respond("posts", f.ok([]));
    await repo.listFeed({ authorHandle: "kaydence", limit: 5 });
    const q = f.on("posts")[0]!;
    expect(f.args(q, "eq")).toEqual(["author.handle", "kaydence"]);
    expect(f.args(q, "limit")).toEqual([5]);
    expect(f.args(q, "order")).toEqual(["created_at", { ascending: false }]);
  });

  it("surfaces database errors with their message", async () => {
    f.respond("posts", f.fail("connection refused"));
    await expect(repo.listFeed({})).rejects.toThrow("connection refused");
  });
});

describe("getPost / getProfile / listCreators", () => {
  it("returns null for a missing post or profile", async () => {
    f.respond("posts", f.ok(null));
    f.respond("profiles", f.ok(null));
    expect(await repo.getPost("nope")).toBeNull();
    expect(await repo.getProfile("nobody")).toBeNull();
  });

  it("maps a profile with followers = baseline + real follows", async () => {
    f.respond("profiles", f.ok(profileRow({ follower_baseline: 5 })));
    f.respond("follows", f.ok([{ followee_id: "prof-1" }]), f.ok([]));
    expect(await repo.getProfile("kaydence", "me")).toMatchObject({ handle: "kaydence", followers: 6, following: false });
  });

  it("lists creators biggest first", async () => {
    f.respond("profiles", f.ok([profileRow(), profileRow({ id: "prof-2", handle: "b" })]));
    f.respond("follows", f.ok([]), f.ok([]));
    expect((await repo.listCreators("me", 2)).map((p) => p.handle)).toEqual(["kaydence", "b"]);
    expect(f.args(f.on("profiles")[0]!, "order")).toEqual(["follower_baseline", { ascending: false }]);
  });
});

describe("ensureProfile", () => {
  const user = { id: "user-1", username: "Hustle Big!", display_name: "Hustle Big" };

  it("returns the existing profile without creating one", async () => {
    f.respond("profiles", f.ok(profileRow({ handle: "hustle_big_" })));
    f.respond("follows", f.ok([]), f.ok([]));
    const p = await repo.ensureProfile(user);
    expect(p.handle).toBe("hustle_big_");
    expect(f.on("profiles", "insert")).toHaveLength(0);
  });

  it("creates one from the username, linked to the user, with a handle that satisfies the DB constraint", async () => {
    f.respond("profiles", f.ok(null), f.ok(profileRow({ handle: "hustle_big_", name: "Hustle Big" })));
    f.respond("follows", f.ok([]), f.ok([]));
    await repo.ensureProfile(user);
    const [payload] = f.args(f.on("profiles", "insert")[0]!, "insert") as [Record<string, unknown>];
    expect(payload).toMatchObject({ handle: "hustle_big_", name: "Hustle Big", user_id: "user-1" });
    expect(payload.handle).toMatch(/^[a-z0-9_]{2,30}$/);
    expect(payload).not.toHaveProperty("verified");
    expect(payload).not.toHaveProperty("follower_baseline");
  });

  it("pads very short usernames and truncates very long ones to a valid handle", async () => {
    for (const [username, test] of [["a", /^user_a$/], ["x".repeat(60), /^x{30}$/]] as const) {
      f.reset();
      f.respond("profiles", f.ok(null), f.ok(profileRow()));
      f.respond("follows", f.ok([]), f.ok([]));
      await repo.ensureProfile({ id: "u", username });
      const [payload] = f.args(f.on("profiles", "insert")[0]!, "insert") as [{ handle: string }];
      expect(payload.handle).toMatch(test);
    }
  });

  it("retries with a numeric suffix when the handle is taken", async () => {
    f.respond("profiles", f.ok(null), f.fail("duplicate", "23505"), f.ok(profileRow({ handle: "hustle_big_1234" })));
    f.respond("follows", f.ok([]), f.ok([]));
    await repo.ensureProfile(user);
    const inserts = f.on("profiles", "insert").map((c) => (f.args(c, "insert") as [{ handle: string }])[0].handle);
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).toMatch(/^hustle_big_\d{4}$/);
  });

  it("gives up with an error if the database refuses for another reason", async () => {
    f.respond("profiles", f.ok(null), f.fail("permission denied", "42501"));
    await expect(repo.ensureProfile(user)).rejects.toThrow("permission denied");
  });
});

describe("writes", () => {
  it("creates a post as the given profile and returns it hydrated", async () => {
    f.respond("posts", f.ok(postRow({ body: "new one", reaction_baseline: {} })));
    f.respond("follows", f.ok([]), f.ok([]));
    f.respond("bookmarks", f.ok([]));
    const p = await repo.createPost("prof-1", "  new one  ");
    expect(f.args(f.on("posts", "insert")[0]!, "insert")).toEqual([{ author_id: "prof-1", body: "new one" }]);
    expect(p.text).toBe("new one");
  });

  it("removes a reaction with a DELETE", async () => {
    f.respond("reactions", f.ok([]));
    await repo.setReaction("p1", "me", null);
    expect(f.on("reactions", "delete")).toHaveLength(1);
  });

  it("switches an existing reaction with an UPDATE and doesn't insert", async () => {
    f.respond("reactions", f.ok([{ kind: "heart" }]));
    await repo.setReaction("p1", "me", "heart");
    expect(f.on("reactions", "update")).toHaveLength(1);
    expect(f.on("reactions", "insert")).toHaveLength(0);
  });

  it("inserts a new reaction when there was none to update", async () => {
    f.respond("reactions", f.ok([]), f.ok([{ kind: "fire" }]));
    await repo.setReaction("p1", "me", "fire");
    expect(f.args(f.on("reactions", "insert")[0]!, "insert")).toEqual([{ post_id: "p1", profile_id: "me", kind: "fire" }]);
  });

  it("recovers when another tab inserted the reaction in between", async () => {
    f.respond("reactions", f.ok([]), f.fail("duplicate", "23505"), f.ok([{ kind: "fire" }]));
    await expect(repo.setReaction("p1", "me", "fire")).resolves.toBeUndefined();
    expect(f.on("reactions", "update")).toHaveLength(2);
  });

  it("surfaces other reaction errors", async () => {
    f.respond("reactions", f.ok([]), f.fail("row-level security", "42501"));
    await expect(repo.setReaction("p1", "me", "fire")).rejects.toThrow("row-level security");
  });

  it("bookmarks and follows with idempotent upserts (no UPDATE privilege needed), and un-does with DELETE", async () => {
    await repo.setBookmark("p1", "me", true);
    expect(f.args(f.on("bookmarks", "upsert")[0]!, "upsert")).toEqual([{ post_id: "p1", profile_id: "me" }, { onConflict: "post_id,profile_id", ignoreDuplicates: true }]);
    await repo.setBookmark("p1", "me", false);
    expect(f.on("bookmarks", "delete")).toHaveLength(1);

    await repo.setFollow("me", "them", true);
    expect(f.args(f.on("follows", "upsert")[0]!, "upsert")).toEqual([{ follower_id: "me", followee_id: "them" }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true }]);
    await repo.setFollow("me", "them", false);
    expect(f.on("follows", "delete")).toHaveLength(1);
  });
});

describe("notifications", () => {
  const who = (handle: string) => ({ handle, name: handle.toUpperCase(), avatar_url: null });
  const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

  it("merges new followers and reactions on my posts, newest first, without my own reactions", async () => {
    f.respond("follows", f.ok([{ created_at: iso(30), follower: who("ann") }]));
    f.respond("reactions", f.ok([{ post_id: "p9", kind: "🔥", created_at: iso(5), reactor: who("bob") }, { post_id: "p8", kind: "fire", created_at: iso(60), reactor: who("cy") }]));
    const list = await repo.listNotifications("me");
    expect(list.map((n) => `${n.actor.handle}:${n.kind}`)).toEqual(["bob:like", "ann:follow", "cy:like"]);
    expect(list[0]).toMatchObject({ text: "reacted 🔥 to your post", postId: "p9", time: "5m", mention: false });
    expect(list[1]).toMatchObject({ text: "followed you", actor: { name: "ANN", avatar: "" } });
    const q = f.on("reactions")[0]!;
    expect(f.args(q, "eq")).toEqual(["post.author_id", "me"]);
    expect(f.args(q, "neq")).toEqual(["profile_id", "me"]); // reacting to your own post is not news
  });

  it("is empty when nothing has happened (no invented events)", async () => {
    f.respond("follows", f.ok([]));
    f.respond("reactions", f.ok([]));
    expect(await repo.listNotifications("me")).toEqual([]);
  });

  it("surfaces database errors", async () => {
    f.respond("follows", f.fail("boom"));
    await expect(repo.listNotifications("me")).rejects.toThrow("boom");
  });
});

describe("updateProfile", () => {
  it("renames only my profile", async () => {
    f.respond("profiles", f.ok([{ id: "prof-1" }]));
    await repo.updateProfile("prof-1", { name: "New" });
    const q = f.on("profiles", "update")[0]!;
    expect(f.args(q, "update")).toEqual([{ name: "New" }]);
    expect(f.args(q, "eq")).toEqual(["id", "prof-1"]);
  });
  it("fails loudly when nothing was updated (e.g. someone else's profile)", async () => {
    f.respond("profiles", f.ok([]));
    await expect(repo.updateProfile("prof-2", { name: "x" })).rejects.toThrow(/couldn't update/i);
  });
});
