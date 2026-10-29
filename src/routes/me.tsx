import { PageContainer } from "@/components/amixof/page";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/stablepay/RequireAuth";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "My profile — StablePay" }] }),
  component: () => (
    <RequireAuth>
      <MyProfile />
    </RequireAuth>
  ),
});

function MyProfile() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <PageContainer>
      <h1 className="type-title">My account</h1>
      <div className={cn(cardVariants(), "p-4 space-y-4")}>
        <div className="flex items-center gap-4">
          <ProfileAvatar src={user.avatar_url} name={user.display_name || user.username || "U"} size="lg" />
          <div className="min-w-0">
            <h2 className="type-heading truncate">{user.display_name || user.username}</h2>
            <p className="type-meta truncate">@{user.username}</p>
            <p className="type-meta truncate">{user.email}</p>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <h3 className="type-ui mb-1.5 text-foreground/80">Wallet Address</h3>
          <p className="break-all rounded-md bg-surface-2 p-3 font-mono type-caption">{user.wallet_address}</p>
        </div>
        <button onClick={logout} className="h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover active:bg-surface-active">Sign out</button>
      </div>
    </PageContainer>
  );
}
