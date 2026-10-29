import { walletHistory } from "@/data/mock";
import type { TipReceipt } from "@/lib/tipping";

export type WalletRow = { id: string; kind: string; who: string; amount: number; time: string };

export const timeAgo = (t: number, now = Date.now()) => {
  // round down, like the feed's labels: 90 minutes ago is "1h", not "2h"
  const m = Math.floor((now - t) / 60000);
  return m < 1 ? "Just now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : new Date(t).toLocaleDateString();
};

/**
 * Rows for the wallet's "Tips & gifts" list: the user's own tips and gifts, newest first.
 * Sample rows (invented payouts and gifts) are added only when `includeSample` is set, i.e. in the demo build,
 * and are labelled so nobody mistakes them for real activity.
 */
export function buildWalletRows(receipts: TipReceipt[], opts: { includeSample: boolean; now?: number }): WalletRow[] {
  const own: WalletRow[] = receipts.map((r) => ({
    id: r.id,
    kind: r.request.kind === "gift" ? `Gift sent${r.request.label ? ` · ${r.request.label}` : ""}` : "Tip sent",
    who: r.request.recipient,
    amount: -r.request.amount,
    time: timeAgo(r.createdAt, opts.now),
  }));
  if (!opts.includeSample) return own;
  return [...own, ...walletHistory.map((w) => ({ ...w, kind: `${w.kind} (sample)` }))];
}
