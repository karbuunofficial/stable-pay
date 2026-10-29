import { describe, expect, it } from "vitest";
import { MAX_ON_STAGE, isFull, stageReducer, type Participant, type StageState } from "@/lib/multiguest";

const p = (id: string, role: "host" | "guest" = "guest"): Participant => ({ id, name: id, avatar: "", role, mic: true, cam: true, status: "live", mutedByHost: false, simulated: true });
const base = (n: number): StageState => ({
  live: true, layout: "adaptive", self: "viewer",
  participants: [p("host", "host"), ...Array.from({ length: n - 1 }, (_, i) => p(`g${i}`))],
  queue: [{ id: "v1", name: "v1", avatar: "", kind: "request", status: "pending" }],
});

describe("multi-guest stage", () => {
  it("allows 9 on stage: one host plus eight guests", () => {
    expect(MAX_ON_STAGE).toBe(9);
    expect(isFull(base(8))).toBe(false);
    expect(isFull(base(9))).toBe(true);
  });
  it("refuses to approve a request when the room is full", () => {
    const s = stageReducer(base(9), { type: "approve", id: "v1" });
    expect(s.participants).toHaveLength(9);
    expect(s.notice).toMatch(/full/i);
  });
  it("removing a guest keeps the broadcast live", () => {
    const s = stageReducer(base(3), { type: "remove", id: "g0" });
    expect(s.live).toBe(true);
    expect(s.participants.map((x) => x.id)).toEqual(["host", "g1"]);
  });
  it("host can't be removed", () => {
    expect(stageReducer(base(3), { type: "remove", id: "host" }).participants).toHaveLength(3);
  });
  it("host mute only turns a guest mic off, never on", () => {
    const muted = stageReducer(base(2), { type: "hostMute", id: "g0" });
    expect(muted.participants[1]!.mic).toBe(false);
    const again = stageReducer(muted, { type: "hostMute", id: "g0" });
    expect(again.participants[1]!.mic).toBe(false);
  });
  it("declining keeps the request visible as declined", () => {
    const s = stageReducer(base(2), { type: "decline", id: "v1" });
    expect(s.queue[0]!.status).toBe("declined");
  });
});
