import { PageContainer } from "@/components/amixof/page";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import RequireAuth from "@/components/stablepay/RequireAuth";
import UserSearch from "@/components/users/UserSearch";

export const Route = createFileRoute("/people")({
  head: () => ({ meta: [{ title: "Find people — StablePay" }] }),
  component: People,
});

function People() {
  const navigate = useNavigate();
  return (
    <RequireAuth>
      <PageContainer>
        <h1 className="type-title">Find people</h1>
        <div className={cn(cardVariants(), "p-4")}>
          <UserSearch onUserSelect={(u) => navigate({ to: "/pay", search: { to: u.username } })} />
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
