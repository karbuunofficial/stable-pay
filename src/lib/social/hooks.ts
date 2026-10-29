import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { socialRepo, type FeedFilter, type PostView, type Profile } from "./index";

const mode = socialRepo.mode;

type AuthUser = { id: string; username?: string | undefined; display_name?: string | undefined; avatar_url?: string | undefined } | null;

const actorQuery = (user: AuthUser) => ({
  queryKey: ["actor", mode, user?.id ?? "anon"],
  staleTime: Infinity,
  queryFn: () => socialRepo.ensureProfile({ id: user?.id ?? "", username: user?.username ?? "you", display_name: user?.display_name, avatar_url: user?.avatar_url }),
});
const canHaveActor = (user: AuthUser) => mode === "mock" || !!user?.username;

/** The signed-in user's social profile (created on first use). In demo mode it's always the demo user. */
export function useActor() {
  const { user } = useAuth();
  const q = useQuery({ ...actorQuery(user), enabled: canHaveActor(user) });
  const waiting = mode === "supabase" && !!user?.username && q.isLoading;
  return { actor: q.data ?? null, loading: waiting };
}

/**
 * Returns an async guard to call before a write: resolves to the profile, or toasts and resolves to null.
 * If the profile is still being created (first visit, slow connection) it waits for that instead of telling a
 * signed-in user to sign in, so an early click is honoured rather than lost.
 */
export function useRequireActor() {
  const { user } = useAuth();
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useCallback(
    async (what = "do that"): Promise<Profile | null> => {
      if (actor) return actor;
      if (canHaveActor(user)) {
        try {
          return await qc.fetchQuery(actorQuery(user)); // joins the request already in flight
        } catch {
          toast.error("Couldn't load your profile. Please try again.");
          return null;
        }
      }
      toast(`Sign in to ${what}`, { action: { label: "Sign in", onClick: () => navigate({ to: "/me" }) } });
      return null;
    },
    [actor, user, qc, navigate],
  );
}

export function useFeed(filter: FeedFilter = {}, opts: { enabled?: boolean } = {}) {
  const { actor, loading } = useActor();
  return useQuery({
    queryKey: ["feed", mode, filter, actor?.id ?? null],
    enabled: !loading && (opts.enabled ?? true),
    queryFn: () => socialRepo.listFeed(filter, actor?.id),
  });
}

export function usePost(id: string) {
  const { actor, loading } = useActor();
  return useQuery({ queryKey: ["post", mode, id, actor?.id ?? null], enabled: !loading, queryFn: () => socialRepo.getPost(id, actor?.id) });
}

export function useProfile(handle: string) {
  const { actor, loading } = useActor();
  return useQuery({ queryKey: ["profile", mode, handle, actor?.id ?? null], enabled: !loading, queryFn: () => socialRepo.getProfile(handle, actor?.id) });
}

export function useNotifications() {
  const { actor, loading } = useActor();
  return useQuery({
    queryKey: ["notifications", mode, actor?.id ?? null],
    enabled: !loading && !!actor,
    queryFn: () => socialRepo.listNotifications(actor!.id),
  });
}

export function useCreators(limit = 10) {
  const { actor, loading } = useActor();
  return useQuery({ queryKey: ["creators", mode, limit, actor?.id ?? null], enabled: !loading, queryFn: () => socialRepo.listCreators(actor?.id, limit) });
}

// --- optimistic updates: patch every cached copy of a post / profile, roll back by refetching on error ---

function patchPost(qc: QueryClient, id: string, fn: (p: PostView) => PostView) {
  qc.setQueriesData<PostView[]>({ queryKey: ["feed"] }, (old) => old?.map((p) => (p.id === id ? fn(p) : p)));
  qc.setQueriesData<PostView | null>({ queryKey: ["post"] }, (old) => (old && old.id === id ? fn(old) : old));
}

function patchProfile(qc: QueryClient, id: string, fn: (p: Profile) => Profile) {
  qc.setQueriesData<PostView[]>({ queryKey: ["feed"] }, (old) => old?.map((p) => (p.author.id === id ? { ...p, author: fn(p.author) } : p)));
  qc.setQueriesData<PostView | null>({ queryKey: ["post"] }, (old) => (old && old.author.id === id ? { ...old, author: fn(old.author) } : old));
  qc.setQueriesData<Profile | null>({ queryKey: ["profile"] }, (old) => (old && old.id === id ? fn(old) : old));
  qc.setQueriesData<Profile[]>({ queryKey: ["creators"] }, (old) => old?.map((p) => (p.id === id ? fn(p) : p)));
}

const refetchSocial = (qc: QueryClient) => {
  for (const k of ["feed", "post", "profile", "creators", "notifications"]) qc.invalidateQueries({ queryKey: [k] });
};

/** (kind) => toggles/switches the viewer's reaction on a post. */
export function useReact(post: PostView) {
  const qc = useQueryClient();
  const need = useRequireActor();
  const m = useMutation({
    mutationFn: ({ actorId, kind }: { actorId: string; kind: string | null }) => socialRepo.setReaction(post.id, actorId, kind),
    onMutate: ({ kind }) => {
      patchPost(qc, post.id, (p) => {
        const reactions = { ...p.reactions };
        if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] ?? 1) - 1);
        if (kind) reactions[kind] = (reactions[kind] ?? 0) + 1;
        return { ...p, reactions, myReaction: kind };
      });
    },
    onError: () => {
      toast.error("Couldn't save your reaction");
      refetchSocial(qc);
    },
  });
  return async (kind: string) => {
    const a = await need("react");
    if (a) m.mutate({ actorId: a.id, kind: post.myReaction === kind ? null : kind });
  };
}

export function useBookmark(post: PostView) {
  const qc = useQueryClient();
  const need = useRequireActor();
  const m = useMutation({
    mutationFn: ({ actorId, on }: { actorId: string; on: boolean }) => socialRepo.setBookmark(post.id, actorId, on),
    onMutate: ({ on }) => patchPost(qc, post.id, (p) => ({ ...p, bookmarked: on })),
    onSuccess: (_d, { on }) => {
      toast(on ? "Saved to bookmarks" : "Removed from bookmarks");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      toast.error("Couldn't update your bookmark");
      refetchSocial(qc);
    },
  });
  return async () => {
    const a = await need("save posts");
    if (a) m.mutate({ actorId: a.id, on: !post.bookmarked });
  };
}

export function useFollow(profile: Profile) {
  const qc = useQueryClient();
  const need = useRequireActor();
  const m = useMutation({
    mutationFn: ({ actorId, on }: { actorId: string; on: boolean }) => socialRepo.setFollow(actorId, profile.id, on),
    onMutate: ({ on }) => patchProfile(qc, profile.id, (p) => ({ ...p, following: on, followers: Math.max(0, p.followers + (on ? 1 : -1)) })),
    onSuccess: (_d, { on }) => {
      toast(on ? `Following ${profile.name}` : `Unfollowed ${profile.name}`);
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      toast.error("Couldn't update follow");
      refetchSocial(qc);
    },
  });
  return async () => {
    const a = await need("follow creators");
    if (!a) return;
    if (a.id === profile.id) return toast("That's you");
    m.mutate({ actorId: a.id, on: !profile.following });
  };
}

export function useCreatePost() {
  const qc = useQueryClient();
  const need = useRequireActor();
  const m = useMutation({
    mutationFn: ({ actorId, text }: { actorId: string; text: string }) => socialRepo.createPost(actorId, text),
    onSuccess: () => {
      toast.success("Posted");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't post. Try again."),
  });
  return {
    pending: m.isPending,
    post: async (text: string) => {
      const a = await need("post");
      if (!a) return false;
      try {
        await m.mutateAsync({ actorId: a.id, text });
        return true;
      } catch {
        return false; // onError already showed the toast; false keeps the draft in the composer
      }
    },
  };
}
