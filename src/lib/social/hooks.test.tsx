import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
const navigate = vi.fn();
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

let authUser: { id: string; username: string } | null = null;
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: authUser }) }));

const wrapper = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

describe("social hooks (demo repository)", () => {
  beforeEach(() => {
    vi.resetModules();
    toast.mockClear(); toast.success.mockClear(); toast.error.mockClear(); navigate.mockClear();
    authUser = null;
  });

  async function setup() {
    const hooks = await import("@/lib/social/hooks");
    const qc = newClient();
    return { hooks, qc, w: wrapper(qc) };
  }

  it("loads the feed", async () => {
    const { hooks, w } = await setup();
    const { result } = renderHook(() => hooks.useFeed({}), { wrapper: w });
    await waitFor(() => expect(result.current.data).toHaveLength(7));
  });

  it("optimistically updates a reaction in every cached copy of the post", async () => {
    const { hooks, w } = await setup();
    const { result } = renderHook(() => ({ feed: hooks.useFeed({}), post: hooks.usePost("p1") }), { wrapper: w });
    await waitFor(() => expect(result.current.feed.data && result.current.post.data).toBeTruthy());
    const p1 = result.current.post.data!;

    const { result: react } = renderHook(() => hooks.useReact(p1), { wrapper: w });
    await waitFor(() => expect(renderHook(() => hooks.useActor(), { wrapper: w }).result.current.actor).toBeTruthy());
    await act(async () => { await react.current("fire"); });

    await waitFor(() => expect(result.current.post.data?.myReaction).toBe("fire"));
    expect(result.current.feed.data!.find((p) => p.id === "p1")!.reactions.fire).toBe(p1.reactions.fire! + 1);
  });

  it("toggles a bookmark and says so", async () => {
    const { hooks, w } = await setup();
    const { result } = renderHook(() => hooks.usePost("p2"), { wrapper: w });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const { result: bm } = renderHook(() => hooks.useBookmark(result.current.data!), { wrapper: w });
    await waitFor(() => expect(renderHook(() => hooks.useActor(), { wrapper: w }).result.current.actor).toBeTruthy());
    await act(async () => { await bm.current(); });
    await waitFor(() => expect(result.current.data?.bookmarked).toBe(true));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saved to bookmarks"));
  });

  it("follows a creator, updating the profile and follower count", async () => {
    const { hooks, w } = await setup();
    const { result } = renderHook(() => hooks.useProfile("solesmith"), { wrapper: w });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const start = result.current.data!;
    const { result: follow } = renderHook(() => hooks.useFollow(start), { wrapper: w });
    await waitFor(() => expect(renderHook(() => hooks.useActor(), { wrapper: w }).result.current.actor).toBeTruthy());
    await act(async () => { await follow.current(); });
    await waitFor(() => expect(result.current.data?.following).toBe(true));
    expect(result.current.data?.followers).toBe(start.followers + 1);
  });

  it("creates a post and refreshes the feed", async () => {
    const { hooks, w } = await setup();
    const { result } = renderHook(() => ({ feed: hooks.useFeed({}), create: hooks.useCreatePost() }), { wrapper: w });
    await waitFor(() => expect(result.current.feed.data).toHaveLength(7));
    await waitFor(() => expect(renderHook(() => hooks.useActor(), { wrapper: w }).result.current.actor).toBeTruthy());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.create.post("a brand new post"); });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.feed.data![0]!.text).toBe("a brand new post"));
    expect(toast.success).toHaveBeenCalledWith("Posted");
  });
});

describe("acting before the profile has finished loading", () => {
  it("waits for the profile instead of telling a signed-in user to sign in", async () => {
    vi.resetModules(); toast.mockClear();
    authUser = { id: "u1", username: "me" };
    let finish: (p: { id: string }) => void = () => {};
    const setFollow = vi.fn().mockResolvedValue(undefined);
    const repo = {
      mode: "supabase",
      ensureProfile: vi.fn().mockImplementation(() => new Promise((r) => (finish = r))), // slow first-time profile creation
      getProfile: vi.fn().mockResolvedValue(null),
      listFeed: vi.fn().mockResolvedValue([]),
      setFollow,
    };
    vi.doMock("@/lib/social/index", () => ({ socialRepo: repo }));
    const hooks = await import("@/lib/social/hooks");
    const target = { id: "c1", handle: "c", name: "Creator", avatar: "", banner: "", bio: "", category: "", verified: false, isDemo: true, followers: 1, following: false };
    const { result } = renderHook(() => hooks.useFollow(target), { wrapper: wrapper(newClient()) });

    await act(async () => { await Promise.resolve(); });
    let clicked: Promise<unknown> = Promise.resolve();
    act(() => { clicked = result.current(); });                // click while the profile is still being created
    await act(async () => { await Promise.resolve(); });
    expect(toast).not.toHaveBeenCalledWith(expect.stringMatching(/sign in/i), expect.anything()); // never "sign in" for a signed-in user
    expect(setFollow).not.toHaveBeenCalled();                  // and it hasn't acted on a profile that doesn't exist yet

    await act(async () => { finish({ id: "me-profile" }); await clicked; });  // profile ready
    await waitFor(() => expect(setFollow).toHaveBeenCalledWith("me-profile", "c1", true)); // the click is honoured, not lost
    vi.doUnmock("@/lib/social/index");
    authUser = null;
  });
});

describe("failed writes", () => {
  it("returns false (keeping the draft) and shows an error when creating a post fails", async () => {
    vi.resetModules(); toast.error.mockClear();
    vi.doMock("@/lib/social/index", () => ({ socialRepo: { mode: "mock", ensureProfile: vi.fn().mockResolvedValue({ id: "me" }), createPost: vi.fn().mockRejectedValue(new Error("db down")) } }));
    const hooks = await import("@/lib/social/hooks");
    const w = wrapper(newClient());
    const { result } = renderHook(() => ({ create: hooks.useCreatePost(), actor: hooks.useActor() }), { wrapper: w });
    await waitFor(() => expect(result.current.actor.actor).toBeTruthy());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.create.post("hi"); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("db down");
    vi.doUnmock("@/lib/social/index");
  });
});

describe("write guard when signed out (real backend mode)", () => {
  beforeEach(() => {
    vi.resetModules();
    toast.mockClear(); navigate.mockClear();
    authUser = null;
  });

  it("refuses to write, tells the user to sign in, and offers a sign-in action", async () => {
    // pretend Supabase is configured: the repo reports "supabase" mode and there is no signed-in user
    vi.doMock("@/lib/social/index", () => ({ socialRepo: { mode: "supabase", ensureProfile: vi.fn(), listFeed: vi.fn().mockResolvedValue([]) } }));
    const hooks = await import("@/lib/social/hooks");
    const { result } = renderHook(() => hooks.useRequireActor(), { wrapper: wrapper(newClient()) });
    expect(await result.current("react")).toBeNull();
    expect(toast).toHaveBeenCalledWith("Sign in to react", expect.objectContaining({ action: expect.objectContaining({ label: "Sign in" }) }));
    (toast.mock.calls[0]![1] as { action: { onClick: () => void } }).action.onClick();
    expect(navigate).toHaveBeenCalledWith({ to: "/me" });
    vi.doUnmock("@/lib/social/index");
  });

  it("does not call the backend to create a post when signed out", async () => {
    const createPost = vi.fn();
    vi.doMock("@/lib/social/index", () => ({ socialRepo: { mode: "supabase", ensureProfile: vi.fn(), createPost } }));
    const hooks = await import("@/lib/social/hooks");
    const { result } = renderHook(() => hooks.useCreatePost(), { wrapper: wrapper(newClient()) });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.post("hi"); });
    expect(ok).toBe(false);
    expect(createPost).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/social/index");
  });
});
