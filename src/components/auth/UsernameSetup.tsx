import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cardVariants } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile, getUserByUsername } from '../../utils/supabase';

const UsernameSetup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const { user, walletAddress, updateUser, refreshUser } = useAuth();

  // Check availability once typing pauses. The effect's cleanup cancels the pending timer and marks this
  // run stale, so a slow answer for an earlier name can never overwrite the result for the current one.
  useEffect(() => {
    setIsAvailable(null);
    if (username.length < 3) {
      setIsChecking(false);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const existingUser = await getUserByUsername(username);
        if (!stale) setIsAvailable(!existingUser);
      } catch (error) {
        console.error('Error checking username:', error);
        if (!stale) setIsAvailable(null); // unknown is not "available"
      } finally {
        if (!stale) setIsChecking(false);
      }
    }, 500);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [username]);

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric characters and underscores
    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !walletAddress || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedUser = await updateUserProfile(walletAddress, {
        username,
        display_name: displayName || username,
      });

      updateUser(updatedUser);
      await refreshUser();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('duplicate key value')) {
        setError('This username is already taken. Please choose another.');
      } else {
        setError('Failed to set username. Please try again.');
      }
      console.error('Username setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username.length >= 3 && isAvailable === true;

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="type-title mb-1">Choose your username</h1>
          <p className="text-muted-foreground">This is how friends will find and pay you</p>
        </div>

        {/* Setup Form */}
        <div className={cn(cardVariants(), "p-4")}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="type-ui mb-1.5 block text-foreground/80">
                  Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground font-medium">@</span>
                  </div>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    aria-invalid={isAvailable === false}
                    aria-describedby="username-hint username-status"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourusername"
                    className={`pl-8 pr-10 ${
                      username.length >= 3
                        ? isAvailable === true
                          ? 'border-success/30 focus:ring-online'
                          : isAvailable === false
                          ? 'border-destructive/40 focus:ring-destructive'
                          : ''
                        : ''
                    }`}
                    maxLength={20}
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {isChecking ? (
                      <div aria-hidden className="size-4 animate-spin rounded-full border-2 border-input border-t-primary" />
                    ) : username.length >= 3 ? (
                      isAvailable === true ? (
                        <Check aria-hidden className="h-5 w-5 text-success-text" />
                      ) : isAvailable === false ? (
                        <AlertCircle aria-hidden className="h-5 w-5 text-destructive-text" />
                      ) : null
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <p id="username-hint" className="type-caption">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                  {/* polite live region: availability is spoken as the user types, without moving focus */}
                  <div id="username-status" aria-live="polite">
                    {isChecking && <p className="sr-only">Checking availability…</p>}
                    {!isChecking && username.length >= 3 && isAvailable === false && (
                      <p className="text-xs text-destructive-text">
                        This username is already taken
                      </p>
                    )}
                    {!isChecking && username.length >= 3 && isAvailable === true && (
                      <p className="text-xs text-success-text">
                        Username is available!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="displayName" className="type-ui mb-1.5 block text-foreground/80">
                  Display name (optional)
                </label>
                <Input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  
                  maxLength={50}
                  disabled={isLoading}
                />
                <p className="mt-1 type-caption">
                  How your name appears to other users
                </p>
              </div>

              {error && (
                <Alert variant="destructive"><AlertCircle aria-hidden /><AlertDescription className="text-foreground">{error}</AlertDescription></Alert>
              )}

              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-card border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Complete setup'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 bg-brand/10 border border-brand/30 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-brand" />
            </div>
            <div className="ml-3">
              <h3 className="type-ui text-brand">
                Your wallet address
              </h3>
              <p className="mt-1 text-sm text-brand">
                {user?.wallet_address && (
                  <span className="font-mono text-xs break-all">
                    {user.wallet_address}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsernameSetup;
