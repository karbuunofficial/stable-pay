// Pure community rules + a tiny in-memory store (mock; no backend yet).
import { useSyncExternalStore } from "react";
import { img } from "@/data/mock";

export type Privacy = "public" | "private" | "invite";
export type Role = "owner" | "moderator" | "member";
export type Member = { handle: string; role: Role };

export type Community = {
  handle: string;
  name: string;
  description: string;
  cover: string;
  topics: string[];
  rules: string[];
  privacy: Privacy;
  postApproval: boolean;
  members: Member[];
  requests: string[];
  invited: string[];
  liveHost?: string;
  suspended?: boolean;
};

export const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

export function validateCommunity(input: { name: string; handle: string }, existing: string[]): string | null {
  if (input.name.trim().length < 3) return "Name must be at least 3 characters.";
  if (input.name.trim().length > 50) return "Name must be 50 characters or fewer.";
  if (!HANDLE_RE.test(input.handle)) return "Handle: 3–24 lowercase letters, numbers or underscores.";
  if (existing.includes(input.handle)) return "That handle is already taken.";
  return null;
}

export const roleOf = (c: Community, user: string): Role | null => c.members.find((m) => m.handle === user)?.role ?? null;
export const canManage = (c: Community, user: string) => { const r = roleOf(c, user); return r === "owner" || r === "moderator"; };

/** Can the user read the feed/chat/live? Public: anyone. Private/invite: members only. */
export function canViewContent(c: Community, user: string): boolean {
  if (c.suspended) return false;
  return c.privacy === "public" || roleOf(c, user) !== null;
}

/** Is the community listed in discovery? Invite-only is hidden unless you're a member or invited. */
export function isDiscoverable(c: Community, user: string): boolean {
  if (c.privacy !== "invite") return true;
  return roleOf(c, user) !== null || c.invited.includes(user);
}

/** What happens when a user taps Join. */
export function joinAction(c: Community, user: string): "joined" | "requested" | "needs-invite" | "already" {
  if (roleOf(c, user)) return "already";
  if (c.privacy === "public") return "joined";
  if (c.privacy === "private") return "requested";
  return c.invited.includes(user) ? "joined" : "needs-invite";
}

export function join(c: Community, user: string): Community {
  const a = joinAction(c, user);
  if (a === "joined") return { ...c, members: [...c.members, { handle: user, role: "member" }], invited: c.invited.filter((u) => u !== user) };
  if (a === "requested" && !c.requests.includes(user)) return { ...c, requests: [...c.requests, user] };
  return c;
}

export function leave(c: Community, user: string): Community {
  if (roleOf(c, user) === "owner") return c; // owner can't abandon the community
  return { ...c, members: c.members.filter((m) => m.handle !== user) };
}

export function approve(c: Community, by: string, user: string): Community {
  if (!canManage(c, by) || !c.requests.includes(user)) return c;
  return { ...c, requests: c.requests.filter((u) => u !== user), members: [...c.members, { handle: user, role: "member" }] };
}
export function decline(c: Community, by: string, user: string): Community {
  if (!canManage(c, by)) return c;
  return { ...c, requests: c.requests.filter((u) => u !== user) };
}
/** Only the owner can appoint or demote moderators. */
export function setRole(c: Community, by: string, user: string, role: "moderator" | "member"): Community {
  if (roleOf(c, by) !== "owner" || roleOf(c, user) === "owner" || !roleOf(c, user)) return c;
  return { ...c, members: c.members.map((m) => (m.handle === user ? { ...m, role } : m)) };
}
/** Owners remove anyone but themselves; moderators remove plain members only. */
export function removeMember(c: Community, by: string, user: string): Community {
  const br = roleOf(c, by), ur = roleOf(c, user);
  if (!ur || ur === "owner" || by === user) return c;
  if (br === "owner" || (br === "moderator" && ur === "member")) return { ...c, members: c.members.filter((m) => m.handle !== user) };
  return c;
}

const M = (h: string, role: Role = "member"): Member => ({ handle: h, role });
let state: Community[] = [
  { handle: "atlhiphop", name: "Atlanta Hip-Hop", description: "The home of ATL rap, R&B and the people building it. Showcases, cyphers and studio sessions.", cover: img("atl-skyline", 1200, 400), topics: ["Hip-Hop", "Atlanta", "R&B"], rules: ["Respect the culture", "No spam or self-promo outside Friday threads", "Credit producers"], privacy: "public", postApproval: false, members: [M("kaydence", "owner"), M("chainrhymes", "moderator"), M("you"), M("courtvision"), M("lowendlexi")], requests: [], invited: [], liveHost: "kaydence" },
  { handle: "beatmakers", name: "Beatmakers", description: "Producers swapping loops, mix notes and beat reviews. Members-only feedback room.", cover: img("mpc-pads", 1200, 400), topics: ["Production", "MPC", "Samples"], rules: ["Feedback must be constructive", "Clear your samples"], privacy: "private", postApproval: true, members: [M("bpmbishop", "owner"), M("lowendlexi", "moderator"), M("kaydence")], requests: ["southsidecast"], invited: [], liveHost: "bpmbishop" },
  { handle: "sneakerculture", name: "Sneaker Culture", description: "Restorations, customs, release-day chaos.", cover: img("sneaker-wall", 1200, 400), topics: ["Sneakers", "Streetwear"], rules: ["No fakes", "Price-check threads only"], privacy: "public", postApproval: false, members: [M("solesmith", "owner"), M("courtvision")], requests: [], invited: [] },
  { handle: "labelroom", name: "Indie Label Room", description: "Invite-only room for indie label owners.", cover: img("label-office", 1200, 400), topics: ["Business", "Labels"], rules: ["What's said here stays here"], privacy: "invite", postApproval: true, members: [M("southsidecast", "owner"), M("bpmbishop")], requests: [], invited: ["you"], liveHost: "southsidecast" },
];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const communityStore = {
  get: () => state,
  find: (h: string) => state.find((c) => c.handle === h),
  add: (c: Community) => { state = [c, ...state]; emit(); },
  update: (h: string, fn: (c: Community) => Community) => { state = state.map((c) => (c.handle === h ? fn(c) : c)); emit(); },
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
};
export const useCommunities = () => useSyncExternalStore(communityStore.subscribe, communityStore.get, communityStore.get);
