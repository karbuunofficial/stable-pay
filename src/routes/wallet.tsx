import { PageContainer } from "@/components/amixof/page";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet as WalletIcon } from "lucide-react";
import BalanceDisplay from "@/components/payments/BalanceDisplay";
import { useAuth } from "@/context/AuthContext";
import { getCreator } from "@/data/mock";
import { buildWalletRows } from "@/lib/walletHistory";
import { EmptyState } from "@/components/amixof/states";
import { getTipService, useTipReceipts } from "@/lib/tipping";
import { supabaseConfigured } from "@/utils/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — AMIXOF" },
      { name: "description", content: "Your StablePay balance, tips and gifts." },
    ],
  }),
  component: Wallet,
});

function Wallet() {
  const { isAuthenticated, user } = useAuth();
  const receipts = useTipReceipts();
  const mock = getTipService().mode === "mock";

  // Sample rows exist only so the demo build has something to show; a connected app lists just what the user did.
  const rows = buildWalletRows(receipts, { includeSample: !supabaseConfigured });

  return (
    <PageContainer>
      <h1 className="type-title">Wallet</h1>
      <section>
        {isAuthenticated && user?.username ? (
          <BalanceDisplay />
        ) : (
          <div className="rounded-lg border p-5 text-center">
            <WalletIcon className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-2 font-semibold">Sign in to see your balance</p>
            <p className="text-sm text-muted-foreground">Your StablePay wallet is created when you sign in with email.</p>
            <Button asChild className="mt-4"><Link to="/me">Sign in</Link></Button>
          </div>
        )}
      </section>
      <section>
        <h2 className="type-subheading mb-2">Tips &amp; gifts</h2>
        {mock && <p className="mb-2 type-caption">Tipping is in demo mode: tips are simulated, kept on this device, and no money moves.{supabaseConfigured ? "" : " Sample history is shown below yours."}</p>}
        {rows.length === 0 ? (
          <div className="rounded-lg border"><EmptyState title="No tips or gifts yet" description="Tips and gifts you send will be listed here." /></div>
        ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((w) => {
            const c = getCreator(w.who);
            return (
              <div key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="min-w-0"><p className="text-sm font-medium">{w.kind}</p><p className="truncate type-caption">{c ? c.name : w.who} · {w.time}</p></div>
                <span className={cn("tabular-nums text-sm font-semibold", w.amount > 0 ? "text-success-text" : "text-foreground")}>{w.amount > 0 ? "+" : "−"}${Math.abs(w.amount).toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        )}
      </section>
    </PageContainer>
  );
}
