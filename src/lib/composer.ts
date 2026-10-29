export const POST_LIMIT = 500;

export function validatePost(text: string): { ok: boolean; remaining: number; error?: string } {
  const remaining = POST_LIMIT - text.length;
  if (text.trim().length === 0) return { ok: false, remaining };
  if (remaining < 0)
    return { ok: false, remaining, error: `${-remaining} characters over the ${POST_LIMIT} limit` };
  return { ok: true, remaining };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
