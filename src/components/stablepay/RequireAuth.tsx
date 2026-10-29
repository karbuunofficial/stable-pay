import type { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabaseConfigured } from '@/utils/supabase';
import LoginForm from '@/components/auth/LoginForm';
import UsernameSetup from '@/components/auth/UsernameSetup';
import { EmptyState, LoadingState } from '@/components/amixof/states';

/** Gates StablePay pages behind thirdweb email login + username setup. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (!supabaseConfigured) {
    return (
      <>
        <h1 className="sr-only">StablePay</h1>
        <EmptyState
          icon={Settings}
          title="StablePay isn't set up yet"
          description="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then rebuild. The rest of the site keeps working."
          className="min-h-[60vh] justify-center"
        />
      </>
    );
  }
  if (isLoading) {
    return (
      <>
        <h1 className="sr-only">StablePay</h1>
        <LoadingState label="Checking your session…" className="min-h-[60vh]" />
      </>
    );
  }
  if (!isAuthenticated) return <LoginForm />;
  if (!user?.username) return <UsernameSetup />;
  return <>{children}</>;
}
