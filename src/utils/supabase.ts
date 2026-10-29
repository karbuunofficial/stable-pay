import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isHttpUrl = (v?: string) => {
  try {
    return !!v && /^https?:$/.test(new URL(v).protocol);
  } catch {
    return false;
  }
};

/** False when .env still has placeholders. Screens check this to show a setup message instead of failing. */
export const supabaseConfigured =
  isHttpUrl(supabaseUrl) && !!supabaseKey && supabaseKey !== 'your_supabase_anon_key_here';

if (!supabaseConfigured) {
  console.error('⚠️ Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env and rebuild.');
}

// Supabase access token minted by the `thirdweb-session` Edge Function after it verifies the thirdweb login.
// Without it the client acts as the anonymous role, which can only read public data.
let accessToken: string | null = null;
export const setSupabaseAccessToken = (token: string | null) => {
  accessToken = token;
};

// createClient throws on an invalid URL, which used to blank the whole app. Fall back to an inert client.
export const supabase = createClient(
  supabaseConfigured ? supabaseUrl : 'http://localhost:54321',
  supabaseConfigured ? supabaseKey : 'not-configured',
  {
    // Called for every request (REST and realtime); null falls back to the anon key.
    accessToken: async () => accessToken,
  }
);

export interface User {
  id: string;
  /** only present on your own row (private column) */
  email?: string;
  username: string;
  wallet_address: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_address: string;
  to_address: string;
  amount: string;
  token_contract: string;
  token_symbol: string;
  chain_id: number;
  thirdweb_transaction_id?: string;
  transaction_hash?: string;
  message?: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at?: string;
  from_user?: User;
  to_user?: User;
}

// Session
const EXCHANGE_URL: string | undefined =
  import.meta.env.VITE_AUTH_EXCHANGE_URL || (supabaseConfigured ? `${supabaseUrl}/functions/v1/thirdweb-session` : undefined);

export class SessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface Session {
  access_token: string;
  /** unix seconds */
  expires_at: number;
  /** your own users row, including the private email */
  user: User;
}

/**
 * Trades a thirdweb token for a Supabase token. The server asks thirdweb whether the token is valid and decides
 * who the user is, so nothing the browser stores (wallet address, user id) is trusted.
 * 401 = thirdweb rejected the token (log out); anything else is transient.
 */
export const exchangeSession = async (thirdwebToken: string): Promise<Session> => {
  if (!EXCHANGE_URL) throw new SessionError('Session service is not configured', 0);
  let res: Response;
  try {
    res = await fetch(EXCHANGE_URL, {
      method: 'POST',
      headers: { 'x-thirdweb-token': thirdwebToken, apikey: supabaseKey ?? '' },
    });
  } catch {
    throw new SessionError('Could not reach the session service', 0);
  }
  if (!res.ok) throw new SessionError(`Session exchange failed (${res.status})`, res.status);
  return res.json();
};

// Public columns. The users table keeps `email` private: it is only returned to the owner by the session exchange.
const PUBLIC_USER_COLS = 'id,username,display_name,avatar_url,wallet_address,created_at,updated_at';

// User Functions (users are created by the session service, not the browser)
export const getUserByWalletAddress = async (walletAddress: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLS)
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLS)
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user by username: ${error.message}`);
  }

  return data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLS)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }

  return data || [];
};

export const updateUserProfile = async (
  walletAddress: string,
  updates: Partial<Pick<User, 'username' | 'display_name' | 'avatar_url'>>
): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('wallet_address', walletAddress)
    .select(PUBLIC_USER_COLS)
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data;
};

// Transaction Functions
export const createTransaction = async (
  fromUserId: string,
  toUserId: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenContract: string,
  tokenSymbol: string,
  chainId: number,
  message?: string,
  thirdwebTransactionId?: string
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      from_address: fromAddress,
      to_address: toAddress,
      amount,
      token_contract: tokenContract,
      token_symbol: tokenSymbol,
      chain_id: chainId,
      message,
      thirdweb_transaction_id: thirdwebTransactionId,
      status: 'pending'
    })
    .select(`
      *,
      from_user:users!from_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at),
      to_user:users!to_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return data;
};

export const updateTransactionStatus = async (
  transactionId: string,
  status: 'pending' | 'confirmed' | 'failed',
  transactionHash?: string
): Promise<Transaction> => {
  const updates: {
    status: 'pending' | 'confirmed' | 'failed';
    updated_at: string;
    confirmed_at?: string;
    transaction_hash?: string;
  } = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'confirmed') {
    updates.confirmed_at = new Date().toISOString();
  }

  if (transactionHash) {
    updates.transaction_hash = transactionHash;
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select(`
      *,
      from_user:users!from_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at),
      to_user:users!to_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update transaction status: ${error.message}`);
  }

  return data;
};

export const updateThirdwebTransactionId = async (
  transactionId: string,
  thirdwebTransactionId: string
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      thirdweb_transaction_id: thirdwebTransactionId,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId)
    .select(`
      *,
      from_user:users!from_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at),
      to_user:users!to_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update thirdweb transaction ID: ${error.message}`);
  }

  return data;
};

export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      from_user:users!from_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at),
      to_user:users!to_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user transactions: ${error.message}`);
  }

  return data || [];
};

export const getRecentTransactions = async (limit = 20): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      from_user:users!from_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at),
      to_user:users!to_user_id(id,username,display_name,avatar_url,wallet_address,created_at,updated_at)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent transactions: ${error.message}`);
  }

  return data || [];
};

// Real-time subscriptions
export const subscribeToUserTransactions = (
  userId: string,
  callback: (transaction: Transaction) => void
) => {
  return supabase
    .channel('user-transactions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `or(from_user_id.eq.${userId},to_user_id.eq.${userId})`
      },
      (payload) => {
        callback(payload.new as Transaction);
      }
    )
    .subscribe();
};
