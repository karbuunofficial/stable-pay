import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getTipService, validateTip, type TipSurface } from "@/lib/tipping";

export const tipError = validateTip;

export const GIFTS = [
  { id: "mic", label: "Mic Drop", emoji: "🎤", price: 2 },
  { id: "fire", label: "Fire", emoji: "🔥", price: 5 },
  { id: "crown", label: "Crown", emoji: "👑", price: 10 },
  { id: "rocket", label: "Rocket", emoji: "🚀", price: 25 },
] as const;

export type Sent = { kind: "tip" | "gift"; to: string; amount: number; label?: string | undefined; note?: string | undefined };

/**
 * Shared tip & gift flow (live rooms, multi-guest stages, clips, posts).
 * Pass `recipients` to require an explicit choice of who receives it.
 */
export function TipDialog({
  open, onOpenChange, name, recipients, mode = "tip", surface, surfaceId, onTipped, onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  recipients?: string[] | undefined;
  mode?: "tip" | "gift";
  surface?: TipSurface | undefined;
  surfaceId?: string | undefined;
  onTipped?: (amount: number) => void;
  onSent?: (s: Sent) => void;
}) {
  const list = recipients && recipients.length ? recipients : [name];
  const [to, setTo] = useState(list[0]!);
  const [amount, setAmount] = useState("5");
  const [gift, setGift] = useState<(typeof GIFTS)[number]["id"]>("mic");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  useEffect(() => {
    if (open && !list.includes(to)) setTo(list[0]!);
  }, [open, list, to]);
  const err = mode === "tip" ? tipError(amount) : "";
  const g = GIFTS.find((x) => x.id === gift)!;
  const total = mode === "tip" ? Number(amount) || 0 : g.price;

  const service = getTipService();

  const send = async () => {
    setPaying(true);
    try {
      const label = mode === "gift" ? `${g.emoji} ${g.label}` : undefined;
      await service.send({ kind: mode, recipient: to, amount: total, label, note: note || undefined, surface, surfaceId });
      onOpenChange(false);
      onTipped?.(total);
      onSent?.({ kind: mode, to, amount: total, label, note: note || undefined });
      toast.success(mode === "tip" ? `Tipped ${to} $${total}` : `Sent ${g.label} to ${to}`, { description: note || undefined });
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tip failed. Nothing was charged.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !paying && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "tip" ? "Send a tip" : "Send a gift"}</DialogTitle>
          <DialogDescription>{service.mode === "mock" ? "Demo payment — no money moves." : "Paid from your StablePay wallet."}</DialogDescription>
        </DialogHeader>
        {list.length > 1 ? (
          <fieldset>
            <legend className="mb-1.5 text-sm">Send to</legend>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              {list.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={to === r} onClick={() => setTo(r)} className={cn("h-8 rounded-full border px-3 text-sm", to === r && "border-brand bg-brand/10 font-semibold")}>{r}</button>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm">To <b>{to}</b></p>
        )}
        {mode === "tip" ? (
          <>
            <div className="flex gap-2">
              {["2", "5", "10", "25"].map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} aria-pressed={amount === v} className={cn("h-9 flex-1 rounded-md border text-sm", amount === v && "border-brand bg-brand/10 font-semibold")}>${v}</button>
              ))}
            </div>
            <label className="text-sm">Custom amount
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} className="mt-1" />
            </label>
            {err && <p role="alert" className="text-xs text-destructive-text">{err}</p>}
          </>
        ) : (
          <div role="radiogroup" aria-label="Gift" className="grid grid-cols-4 gap-2">
            {GIFTS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={gift === x.id} onClick={() => setGift(x.id)} className={cn("rounded-md border p-2 text-center text-xs", gift === x.id && "border-brand bg-brand/10")}>
                <span className="block text-2xl">{x.emoji}</span>{x.label}<span className="block text-muted-foreground">${x.price}</span>
              </button>
            ))}
          </div>
        )}
        <label className="text-sm">Message (optional)
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Say something nice" className="mt-1" />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={paying}>Cancel</Button>
          <Button type="button" disabled={!!err} loading={paying} onClick={send}>{paying ? "Processing…" : `Send $${total} to ${to}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
