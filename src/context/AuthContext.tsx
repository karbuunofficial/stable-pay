import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type User, type Session, SessionError, exchangeSession, setSupabaseAccessToken } from '../utils/supabase';
import { queryClient } from '../lib/queryClient';
import { sendLoginCode, verifyLoginCode } from '../utils/thirdwebAPI';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  walletAddress: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, code: string) => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    walletAddress: null,
  });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearSession = useCallback(() => {
    clearTimeout(refreshTimer.current);
    localStorage.removeItem('thirdweb_token');
    setSupabaseAccessToken(null);
    queryClient.clear();
    setAuthState({ isAuthenticated: false, isLoading: false, user: null, token: null, walletAddress: null });
  }, []);

  // The Supabase token is short-lived. Trade the (long-lived) thirdweb token for a fresh one before it expires.
  const applySession = useCallback(
    (session: Session, thirdwebToken: string) => {
      setSupabaseAccessToken(session.access_token);
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: session.user,
        token: thirdwebToken,
        walletAddress: session.user.wallet_address,
      });
      clearTimeout(refreshTimer.current);
      const delay = Math.max(30, session.expires_at - Math.floor(Date.now() / 1000) - 120) * 1000;
      refreshTimer.current = setTimeout(async function renew() {
        try {
          applySession(await exchangeSession(thirdwebToken), thirdwebToken);
        } catch (e) {
          if (e instanceof SessionError && e.status === 401) clearSession();
          else refreshTimer.current = setTimeout(renew, 30_000); // service hiccup: try again shortly
        }
      }, delay);
    },
    [clearSession],
  );

  // Restore the session. Nothing stored in the browser is trusted for identity: the server asks thirdweb
  // whether the token is valid and tells us who it belongs to.
  useEffect(() => {
    localStorage.removeItem('wallet_address'); // old versions trusted this; identity now comes from the server
    const stored = localStorage.getItem('thirdweb_token');
    if (!stored) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    exchangeSession(stored)
      .then((session) => applySession(session, stored))
      .catch((error) => {
        console.error('Failed to restore session:', error);
        if (error instanceof SessionError && error.status === 401) clearSession();
        // otherwise the service was unreachable: stay signed out for now, but keep the token for next time
        else setAuthState((prev) => ({ ...prev, isLoading: false }));
      });
    return () => clearTimeout(refreshTimer.current);
  }, [applySession, clearSession]);

  const sendCode = async (email: string) => {
    try {
      await sendLoginCode(email);
    } catch (error) {
      console.error('Failed to send login code:', error);
      throw error;
    }
  };

  const login = async (email: string, code: string) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));
      const { token } = await verifyLoginCode(email, code);
      // The server creates or finds the user from the verified thirdweb identity
      const session = await exchangeSession(token);
      localStorage.setItem('thirdweb_token', token);
      applySession(session, token);
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => clearSession();

  const updateUser = (updates: Partial<User>) => {
    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  };

  const refreshUser = async () => {
    if (!authState.token) return;
    try {
      applySession(await exchangeSession(authState.token), authState.token);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    sendCode,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
