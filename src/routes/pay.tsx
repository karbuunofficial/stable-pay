import { PageContainer } from "@/components/amixof/page";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/stablepay/RequireAuth";
import UserSearch from "@/components/users/UserSearch";
import SendPayment, { type PaymentData } from "@/components/payments/SendPayment";
import PaymentConfirm from "@/components/payments/PaymentConfirm";
import { getUserByUsername, type User } from "@/utils/supabase";

export const Route = createFileRoute("/pay")({
  validateSearch: (s: Record<string, unknown>): { to?: string } => (typeof s.to === "string" ? { to: s.to } : {}),
  head: () => ({ meta: [{ title: "Pay — StablePay" }] }),
  component: () => (
    <RequireAuth>
      <Pay />
    </RequireAuth>
  ),
});

type Step = "search" | "form" | "confirm";

function Pay() {
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [recipient, setRecipient] = useState<User | null>(null);
  const [data, setData] = useState<PaymentData | null>(null);

  // Arriving from People search (?to=username) skips straight to the amount form
  useEffect(() => {
    if (!to) return;
    let cancelled = false;
    getUserByUsername(to).then((u) => {
      if (cancelled || !u) return;
      setRecipient(u);
      setStep("form");
    });
    return () => { cancelled = true; };
  }, [to]);

  const reset = () => {
    setStep("search");
    setRecipient(null);
    setData(null);
    if (to) navigate({ to: "/pay", search: {}, replace: true });
  };

  return (
    <PageContainer>
      <h1 className="type-title">Pay</h1>
      {step === "search" && (
        <div className={cn(cardVariants(), "p-4")}>
          <h2 className="type-subheading mb-4">Who are you paying?</h2>
          <UserSearch showPayButton onUserSelect={(u) => { setRecipient(u); setStep("form"); }} />
        </div>
      )}
      {step === "form" && recipient && (
        <SendPayment recipient={recipient} onBack={reset} onPaymentConfirm={(d) => { setData(d); setStep("confirm"); }} />
      )}
      {step === "confirm" && data && (
        <PaymentConfirm paymentData={data} onBack={() => { setData(null); setStep("form"); }} onSuccess={() => { reset(); navigate({ to: "/activity" }); }} />
      )}
    </PageContainer>
  );
}
