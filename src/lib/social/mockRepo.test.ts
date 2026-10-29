import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SocialRepo } from "@/lib/social/types";

// the repo keeps module-level state, so load a fresh copy for every test
let repo: SocialRepo;
beforeEach(async () => {
  vi.resetModules();
  repo = (await import("@/lib/social/mockRepo")).mockRepo;
});

describe("mock social repo", () => {
  it("serves the sample feed with author data", async () => {
    const feed = await repo.listFeed({});
    expect(feed).toHaveLength(7);
    expect(feed[0]).toMatchObject({ source: "db", author: { handle: "kaydence" } });
    expect(feed.every((p) => p.text && p.author.name)).toBe(true);
  });

  it("creates a post attributed to the demo user, newest first", async () => {
    const me = await repo.ensureProfile({ id: "x", username: "anyone" });
    const p = await repo.createPost(me.id, "  hello world  ");
    expect(p).toMatchObject({ text: "hello world", author: { handle: "you" }, time: "now" });
    expect((await repo.listFeed({}))[0]!.id).toBe(p.id);
    expect(await repo.getPost(p.id)).toMatchObject({ text: "hello world" });
  });

  it("counts a reaction once, switches kinds, and removes it", async () => {
    const before = (await repo.getPost("p1"))!;
    const fire = before.reactions.fire!;
    await repo.setReaction("p1", "you", "fire");
    let p = (await repo.getPost("p1"))!;
    expect(p.myReaction).toBe("fire");
    expect(p.reactions.fire).toBe(fire + 1);

    await repo.setReaction("p1", "you", "heart"); // switching replaces, never double counts
    p = (await repo.getPost("p1"))!;
    expect(p.myReaction).toBe("heart");
    expect(p.reactions.fire).toBe(fire);
    expect(p.reactions.heart).toBe(before.reactions.heart! + 1);

    await repo.setReaction("p1", "you", null);
    p = (await repo.getPost("p1"))!;
    expect(p.myReaction).toBeNull();
    expect(p.reactions).toEqual(before.reactions);
  });

  it("bookmarks and filters bookmarked posts", async () => {
    expect(await repo.listFeed({ bookmarked: true })).toHaveLength(0);
    await repo.setBookmark("p2", "you", true);
    const saved = await repo.listFeed({ bookmarked: true });
    expect(saved.map((p) => p.id)).toEqual(["p2"]);
    expect(saved[0]!.bookmarked).toBe(true);
    await repo.setBookmark("p2", "you", false);
    expect(await repo.listFeed({ bookmarked: true })).toHaveLength(0);
  });

  it("follows and unfollows, adjusting the follower count by one", async () => {
    const start = (await repo.getProfile("solesmith"))!;
    expect(start.following).toBe(false);
    await repo.setFollow("you", "solesmith", true);
    const followed = (await repo.getProfile("solesmith"))!;
    expect(followed.following).toBe(true);
    expect(followed.followers).toBe(start.followers + 1);
    expect((await repo.listFeed({ following: true })).some((p) => p.author.handle === "solesmith")).toBe(true);
    await repo.setFollow("you", "solesmith", false);
    expect((await repo.getProfile("solesmith"))!.followers).toBe(start.followers);
  });

  it("filters by author and searches text case-insensitively", async () => {
    const byAuthor = await repo.listFeed({ authorHandle: "bpmbishop" });
    expect(byAuthor.length).toBeGreaterThan(0);
    expect(byAuthor.every((p) => p.author.handle === "bpmbishop")).toBe(true);
    expect((await repo.listFeed({ q: "SOUL SAMPLE" })).map((p) => p.id)).toContain("p2");
    expect(await repo.listFeed({ q: "zzzz-no-match" })).toEqual([]);
  });

  it("honours the limit, returns null for unknown posts and profiles", async () => {
    expect(await repo.listFeed({ limit: 3 })).toHaveLength(3);
    expect(await repo.getPost("nope")).toBeNull();
    expect(await repo.getProfile("nobody")).toBeNull();
  });

  it("lists creators for the follow suggestions", async () => {
    const creators = await repo.listCreators(undefined, 4);
    expect(creators).toHaveLength(4);
    expect(creators[0]).toHaveProperty("handle");
  });

  it("lists sample notifications with the actor's display data", async () => {
    const list = await repo.listNotifications("you");
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toMatchObject({ kind: "live", actor: { handle: "kaydence" }, mention: false });
    expect(list.some((n) => n.mention)).toBe(true);
  });

  it("renames the demo user", async () => {
    await repo.updateProfile("you", { name: "New Name" });
    expect((await repo.createPost("you", "hi")).author.name).toBe("New Name");
  });
});
