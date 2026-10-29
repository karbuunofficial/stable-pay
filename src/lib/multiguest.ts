/**
 * Multi-guest stage state. Pure reducer so it can later be driven by a real
 * live-video SDK (participant join/leave/track events map onto these actions).
 */
export const MAX_ON_STAGE = 9; // 1 host + 8 guests; audience never counts.

export type ConnStatus = "joining" | "live" | "reconnecting" | "disconnected";
export type Participant = {
  id: string;
  name: string;
  avatar: string;
  role: "host" | "guest";
  mic: boolean;
  cam: boolean;
  status: ConnStatus;
  mutedByHost: boolean;
  simulated: boolean;
};
export type Request = { id: string; name: string; avatar: string; kind: "request" | "invite"; status: "pending" | "declined"; audioOnly?: boolean };
export type SelfState = "viewer" | "pending" | "declined" | "invited" | "previewing" | "joining" | "onstage";
export type Layout = "adaptive" | "grid" | "focus";

export type StageState = {
  live: boolean;
  layout: Layout;
  participants: Participant[];
  queue: Request[];
  self: SelfState;
  notice?: string | undefined;
};

export type Action =
  | { type: "layout"; layout: Layout }
  | { type: "request"; req: Omit<Request, "status" | "kind"> }
  | { type: "invite"; req: Omit<Request, "status" | "kind"> }
  | { type: "approve"; id: string }
  | { type: "decline"; id: string }
  | { type: "admit"; p: Omit<Participant, "status" | "mutedByHost" | "role"> } // participant passed preview
  | { type: "connected"; id: string }
  | { type: "status"; id: string; status: ConnStatus }
  | { type: "hostMute"; id: string }
  | { type: "remove"; id: string }
  | { type: "selfToggle"; id: string; device: "mic" | "cam" }
  | { type: "leave"; id: string }
  | { type: "self"; self: SelfState }
  | { type: "clearNotice" };

export const onStageCount = (s: StageState) => s.participants.filter((p) => p.status !== "disconnected").length;
export const isFull = (s: StageState) => onStageCount(s) >= MAX_ON_STAGE;

export function stageReducer(s: StageState, a: Action): StageState {
  switch (a.type) {
    case "layout":
      return { ...s, layout: a.layout };
    case "request":
    case "invite": {
      if (s.queue.some((q) => q.id === a.req.id && q.status === "pending")) return s;
      const kind = a.type === "request" ? "request" : "invite";
      return { ...s, queue: [...s.queue.filter((q) => q.id !== a.req.id), { ...a.req, kind, status: "pending" }] };
    }
    case "approve": {
      if (isFull(s)) return { ...s, notice: `Room full — ${MAX_ON_STAGE} of ${MAX_ON_STAGE} on stage` };
      const q = s.queue.find((x) => x.id === a.id);
      if (!q) return s;
      const queue = s.queue.filter((x) => x.id !== a.id);
      // Approved viewers must still pass their own device preview before joining.
      return {
        ...s,
        queue,
        participants: [...s.participants, { id: q.id, name: q.name, avatar: q.avatar, role: "guest", mic: !q.audioOnly ? true : true, cam: !q.audioOnly, status: "joining", mutedByHost: false, simulated: q.id !== "me" }],
      };
    }
    case "decline":
      return { ...s, queue: s.queue.map((q) => (q.id === a.id ? { ...q, status: "declined" } : q)) };
    case "admit": {
      if (isFull(s) && !s.participants.some((p) => p.id === a.p.id)) return { ...s, notice: "Room full" };
      const rest = s.participants.filter((p) => p.id !== a.p.id);
      return { ...s, queue: s.queue.filter((q) => q.id !== a.p.id), participants: [...rest, { ...a.p, role: "guest", status: "joining", mutedByHost: false }] };
    }
    case "connected":
      return { ...s, participants: s.participants.map((p) => (p.id === a.id ? { ...p, status: "live" } : p)) };
    case "status":
      return { ...s, participants: s.participants.map((p) => (p.id === a.id ? { ...p, status: a.status } : p)) };
    case "hostMute":
      // Host can only turn a guest's mic OFF. Never on.
      return { ...s, participants: s.participants.map((p) => (p.id === a.id && p.role === "guest" ? { ...p, mic: false, mutedByHost: true } : p)) };
    case "remove":
    case "leave": {
      const target = s.participants.find((p) => p.id === a.id);
      if (!target || target.role === "host") return s; // removing a guest never ends the broadcast
      return { ...s, live: true, participants: s.participants.filter((p) => p.id !== a.id) };
    }
    case "selfToggle":
      return {
        ...s,
        participants: s.participants.map((p) =>
          p.id === a.id ? { ...p, [a.device]: !p[a.device], ...(a.device === "mic" ? { mutedByHost: false } : {}) } : p,
        ),
      };
    case "self":
      return { ...s, self: a.self };
    case "clearNotice":
      return { ...s, notice: undefined };
  }
}

export function gridCols(count: number, layout: Layout): number {
  if (layout === "grid") return 3;
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}
