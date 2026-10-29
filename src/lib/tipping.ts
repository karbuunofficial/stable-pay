/**
 * Tipping service.
 *
 * Every tip/gift in the UI goes through `getTipService().send()`. Today that is the
 * mock service (no money moves, receipts persist in localStorage so the Wallet
 * history reflects them). To go live, implement `TipService` in `createLiveTipService`
 * and set VITE_TIPPING_MODE=live — no component changes needed.
 */
import { useSyncExternalStore } from "react";

export const TIP_MIN = 1;
export const TIP_MAX = 500;

export type TipSurface = "live" | "stage" | "clip" | "post" | "profile" | "blog";

export type TipRequest = {
  kind: "tip" | "gift";
  /** Creator handle or display name the tip is for. */
  recipient: string;
  /** Amount in USD (stablecoin units). */
  amount: number;
  /** Gift label, e.g. "🔥 Fire". */
  label?: string | undefined;
  note?: string | undefined;
  /** Where the tip came from, for analytics and later payout attribution. */
  surface?: TipSurface | undefined;
  surfaceId?: string | undefined;
};

export type TipReceipt = {
  id: string;
  request: TipRequest;
  status: "confirmed" | "pending" | "failed";
  createdAt: number;
  /** True for simulated tips; false once a real transfer backs the receipt. */
  mock: boolean;
  /** Set by the live service once a transfer exists. */
  txHash?: string | undefined;
};

export interface TipService {
  readonly mode: "mock" | "live";
  send(req: TipRequest): Promise<TipReceipt>;
  list(): TipReceipt[];
  subscribe(listener: () => void): () => void;
}

export function validateTip(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (amount === "" || isNaN(n) || n < TIP_MIN) return `Enter at least $${TIP_MIN}`;
  if (n > TIP_MAX) return `Maximum tip is $${TIP_MAX}`;
  return "";
}

const STORAGE_KEY = "stablepay-mock-tips";
const EMPTY: TipReceipt[] = [];

function load(): TipReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TipReceipt[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function createMockTipService(opts: { latencyMs?: number } = {}): TipService {
  const latency = opts.latencyMs ?? 900;
  let receipts = load();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    mode: "mock",
    async send(req) {
      // gifts have fixed prices, so only free-form tips are range-checked
      const err = req.kind === "tip" ? validateTip(req.amount) : "";
      if (err) throw new Error(err);
      await new Promise((r) => setTimeout(r, latency));
      const receipt: TipReceipt = {
        id: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        request: req,
        status: "confirmed",
        createdAt: Date.now(),
        mock: true,
      };
      receipts = [receipt, ...receipts].slice(0, 100);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
      } catch {
        /* storage unavailable: receipt still lives in memory for this session */
      }
      emit();
      return receipt;
    },
    list: () => receipts,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

/**
 * Real tips. Needs, at minimum:
 *  - a way to resolve `recipient` (creator handle) to a wallet address
 *  - the sender's wallet (AuthContext user.wallet_address)
 *  - thirdweb `createPayment` + `completePayment` from src/utils/thirdwebAPI.ts
 *  - a `transactions` row (src/utils/supabase.ts createTransaction) for history
 */
export function createLiveTipService(): TipService {
  throw new Error("Live tipping is not implemented yet. Set VITE_TIPPING_MODE=mock.");
}

let service: TipService | undefined;
export function getTipService(): TipService {
  service ??= import.meta.env.VITE_TIPPING_MODE === "live" ? createLiveTipService() : createMockTipService();
  return service;
}

/** Subscribe a component to the tip receipts (newest first). */
export function useTipReceipts(): TipReceipt[] {
  const s = getTipService();
  return useSyncExternalStore(s.subscribe, s.list, s.list);
}
