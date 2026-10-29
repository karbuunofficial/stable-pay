// Exchanges a thirdweb session token for a Supabase JWT.
//
// POST  header `x-thirdweb-token: <thirdweb JWT from /v1/auth/complete>`
// 200   { access_token, expires_at, user }   user = the caller's full users row (including email)
// 401   token missing or rejected by thirdweb
//
// Trust model: thirdweb itself decides whether the token is valid (GET /v1/wallets/me). We never read claims from
// the token ourselves. The wallet address thirdweb returns is the identity; the users row is created or found by
// that address with the service role, and the JWT we mint has sub = users.id so RLS policies can use auth.uid().
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5";

const THIRDWEB_API = "https://api.thirdweb.com/v1";
const TOKEN_TTL_SECONDS = 60 * 60;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET");
const THIRDWEB_CLIENT_ID = Deno.env.get("THIRDWEB_CLIENT_ID");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, x-thirdweb-token, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface ThirdwebProfile { type?: string; email?: string }
interface ThirdwebWallet { result?: { address?: string; userId?: string; profiles?: ThirdwebProfile[] } }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!JWT_SECRET || !THIRDWEB_CLIENT_ID) return json({ error: "server_not_configured" }, 500);

  const token = req.headers.get("x-thirdweb-token");
  if (!token) return json({ error: "missing_token" }, 401);

  // 1. Ask thirdweb who this token belongs to.
  let wallet: ThirdwebWallet;
  try {
    const res = await fetch(`${THIRDWEB_API}/wallets/me`, {
      headers: { "x-client-id": THIRDWEB_CLIENT_ID, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return json({ error: "invalid_token" }, 401);
    if (!res.ok) return json({ error: "thirdweb_unavailable" }, 502);
    wallet = await res.json();
  } catch {
    return json({ error: "thirdweb_unavailable" }, 502);
  }
  const address = wallet.result?.address;
  if (!address) return json({ error: "invalid_token" }, 401);
  const email = wallet.result?.profiles?.find((p) => p.email)?.email?.toLowerCase();

  // 2. Find or create the users row for that wallet (service role bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const found = await admin.from("users").select("*").ilike("wallet_address", address).maybeSingle();
  if (found.error) return json({ error: "database_error" }, 500);
  let user = found.data;
  if (!user) {
    // users.email is NOT NULL UNIQUE; a wallet without an email profile gets a clearly fake placeholder
    const insert = await admin
      .from("users")
      .insert({ wallet_address: address, email: email ?? `${address.toLowerCase()}@wallet.invalid` })
      .select("*")
      .single();
    if (insert.error) {
      // two tabs logging in at once: the other one won the insert, read it back
      const again = await admin.from("users").select("*").ilike("wallet_address", address).maybeSingle();
      if (!again.data) return json({ error: "database_error" }, 500);
      user = again.data;
    } else {
      user = insert.data;
    }
  }

  // 3. Mint a short-lived Supabase JWT for that user.
  const now = Math.floor(Date.now() / 1000);
  const access_token = await new SignJWT({ role: "authenticated", app_metadata: { wallet_address: address } })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(JWT_SECRET));

  return json({ access_token, expires_at: now + TOKEN_TTL_SECONDS, user });
});
