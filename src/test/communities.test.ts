import { describe, expect, it } from "vitest";
import { approve, canViewContent, communityStore, isDiscoverable, join, joinAction, leave, removeMember, setRole, validateCommunity } from "@/lib/communities";

const get = (h: string) => communityStore.find(h)!;

describe("communities", () => {
  it("rejects a taken handle", () => expect(validateCommunity({ name: "Beat Room", handle: "beatmakers" }, ["beatmakers"])).toMatch(/taken/));
  it("public content readable by non-members", () => expect(canViewContent(get("sneakerculture"), "stranger")).toBe(true));
  it("private content hidden from non-members", () => expect(canViewContent(get("beatmakers"), "stranger")).toBe(false));
  it("private join creates a request, not membership", () => {
    const c = join(get("beatmakers"), "stranger");
    expect(c.requests).toContain("stranger");
    expect(canViewContent(c, "stranger")).toBe(false);
    expect(canViewContent(approve(c, "bpmbishop", "stranger"), "stranger")).toBe(true);
  });
  it("members cannot approve requests", () => expect(approve(get("beatmakers"), "kaydence", "southsidecast").requests).toContain("southsidecast"));
  it("invite-only needs an invite and is hidden otherwise", () => {
    expect(joinAction(get("labelroom"), "stranger")).toBe("needs-invite");
    expect(isDiscoverable(get("labelroom"), "stranger")).toBe(false);
    expect(joinAction(get("labelroom"), "you")).toBe("joined");
  });
  it("only owner appoints moderators", () => {
    expect(setRole(get("atlhiphop"), "chainrhymes", "you", "moderator").members.find((m) => m.handle === "you")!.role).toBe("member");
    expect(setRole(get("atlhiphop"), "kaydence", "you", "moderator").members.find((m) => m.handle === "you")!.role).toBe("moderator");
  });
  it("moderator cannot remove the owner; owner cannot leave", () => {
    expect(removeMember(get("atlhiphop"), "chainrhymes", "kaydence").members.length).toBe(5);
    expect(leave(get("atlhiphop"), "kaydence").members.length).toBe(5);
  });
});
