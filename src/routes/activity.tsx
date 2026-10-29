import { PageContainer } from "@/components/amixof/page";
import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/stablepay/RequireAuth";
import TransactionHistory from "@/components/transactions/TransactionHistory";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity — StablePay" }] }),
  component: () => (
    <RequireAuth>
      <PageContainer>
        <h1 className="type-title">Activity</h1>
        <TransactionHistory />
      </PageContainer>
    </RequireAuth>
  ),
});
