import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Gift, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { chatSeed } from "@/data/mock";
import type { TipSurface } from "@/lib/tipping";
import { TipDialog, type Sent } from "@/components/amixof/tip";
import { cn } from "@/lib/utils";

type Msg = { id: number; user: string; text: string; color: string; sent?: Sent };
type Seed = { user: string; text: string; color: string }[];

/**
 * Shared chat used by live rooms, multi-guest stages, blog discussions and clip comments.
 * Composer is pinned to the bottom. Pass `tipTo` to enable tips & gifts; pass
 * `recipients` (e.g. everyone on a multi-guest stage) to require choosing who receives them.
 */
export function ChatPanel({
  title, simulate = false, className, seed = chatSeed, tipTo, recipients, surface, surfaceId, placeholder = "Send a message", welcome = "Welcome in! Be kind, keep it about the music.",
}: { title?: string; simulate?: boolean; className?: string; seed?: Seed; tipTo?: string; recipients?: string[]; surface?: TipSurface; surfaceId?: string; placeholder?: string; welcome?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => seed.map((m, i) => ({ ...m, id: i })));
  const [text, setText] = useState("");
  const [dialog, setDialog] = useState<null | "tip" | "gift">(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs(seed.map((m, i) => ({ ...m, id: i })));
  }, [seed]);

  useEffect(() => {
    if (!simulate || seed.length === 0) return;
    const t = setInterval(() => {
      const s = seed[Math.floor(Math.random() * seed.length)]!;
      setMsgs((m) => [...m.slice(-80), { ...s, id: Date.now() }]);
    }, 3500);
    return () => clearInterval(t);
  }, [simulate, seed]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: Date.now(), user: "You", text: text.trim(), color: "text-brand" }]);
    setText("");
  };

  return (
    <section aria-label={title ?? "Chat"} className={cn("flex min-h-0 flex-col", className)}>
      {title && <h2 className="flex h-11 shrink-0 items-center justify-center border-b type-overline">{title}</h2>}
      <div ref={listRef} role="log" aria-label="Chat messages" aria-live={simulate ? "off" : "polite"} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 text-sm">
        {welcome && <p className="rounded-md bg-surface-2 px-2 py-1.5 type-caption">{welcome}</p>}
        {msgs.map((m) =>
          m.sent ? (
            <p key={m.id} className="rounded-md border border-brand/40 bg-brand/10 px-2 py-1.5 leading-snug">
              <span className="flex items-center gap-1 text-xs font-bold text-brand">
                {m.sent.kind === "tip" ? <Coins className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
                {m.user} {m.sent.kind === "tip" ? `tipped ${m.sent.to} $${m.sent.amount}` : `sent ${m.sent.label} to ${m.sent.to}`}
              </span>
              {m.sent.note && <span className="text-support">{m.sent.note}</span>}
            </p>
          ) : (
            <p key={m.id} className="break-words leading-snug"><span className={cn("font-semibold", m.color)}>{m.user}</span>: <span className="text-support">{m.text}</span></p>
          ),
        )}
      </div>
      <div className="shrink-0 border-t p-2">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-1 rounded-md border bg-surface-2 pr-1 field-shell">
          <input aria-label={placeholder} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={300} className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-hidden placeholder:text-muted-foreground" />
          <Button type="submit" aria-label="Send" size="icon-sm" disabled={!text.trim()}><Send /></Button>
        </form>
        <div className="mt-1.5 flex gap-1">
          {tipTo && (
            <>
              <button type="button" onClick={() => setDialog("tip")} className="flex h-7 items-center gap-1 rounded px-2 text-xs hover:bg-surface-hover active:bg-surface-active"><Coins className="h-3.5 w-3.5 text-chart-3" /> Tip</button>
              <button type="button" onClick={() => setDialog("gift")} className="flex h-7 items-center gap-1 rounded px-2 text-xs hover:bg-surface-hover active:bg-surface-active"><Gift className="h-3.5 w-3.5 text-brand" /> Gift</button>
            </>
          )}
          <button type="button" onClick={() => toast("Highlight queued for your next message")} className="flex h-7 items-center gap-1 rounded px-2 text-xs hover:bg-surface-hover active:bg-surface-active"><Sparkles className="h-3.5 w-3.5 text-chart-3" /> Highlight</button>
        </div>
      </div>
      {tipTo && (
        <TipDialog
          open={dialog !== null}
          onOpenChange={(v) => !v && setDialog(null)}
          mode={dialog ?? "tip"}
          name={tipTo}
          recipients={recipients}
          surface={surface}
          surfaceId={surfaceId}
          onSent={(s) => setMsgs((m) => [...m, { id: Date.now(), user: "You", text: "", color: "text-brand", sent: s }])}
        />
      )}
    </section>
  );
}
