import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { cardVariants } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mail, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SessionError } from '../../utils/supabase';

const LoginForm: React.FC = () => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { sendCode, login } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      await sendCode(email);
      setStep('code');
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
      console.error('Send code error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setIsLoading(true);
    setError('');

    try {
      await login(email, code);
    } catch (error: unknown) {
      console.error('Verify code error:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof SessionError) {
        // the code was fine, but starting the session failed afterwards
        setError(
          error.status === 401 || error.status === 403
            ? 'Your sign-in could not be verified. Please request a new code and try again.'
            : "We couldn't start your session. Please try again in a moment."
        );
      } else if (errorMessage.includes('404')) {
        setError('Invalid verification code. Please check and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setError('Authentication failed. Please check your client ID configuration.');
      } else if (errorMessage.includes('429')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (errorMessage.includes('Client ID')) {
        setError('App configuration error. Please contact support.');
      } else {
        setError(errorMessage || 'Invalid verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">💰</span>
          </div>
          <h1 className="type-display mb-1">StablePay</h1>
          <p className="text-muted-foreground">Send and receive stablecoins with ease</p>
        </div>

        {/* Login Form */}
        <div className={cn(cardVariants(), "p-4")}>
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <h2 className="type-heading mb-2">
                  Welcome back
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Enter your email to get started
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="type-ui mb-1.5 block text-foreground/80">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <Alert id="login-error" variant="destructive"><AlertCircle aria-hidden /><AlertDescription className="text-foreground">{error}</AlertDescription></Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-card border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <h2 className="type-heading mb-2">
                  Enter verification code
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  We sent a 6-digit code to <span className="font-medium">{email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="code" className="type-ui mb-1.5 block text-foreground/80">
                    Verification code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="pl-10 text-center tracking-widest"
                      maxLength={6}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <Alert id="login-error" variant="destructive"><AlertCircle aria-hidden /><AlertDescription className="text-foreground">{error}</AlertDescription></Alert>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-card border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full h-9 px-4 text-sm border border-input rounded-md text-foreground/80 font-medium hover:bg-surface-hover active:bg-surface-active transition-colors"
                    disabled={isLoading}
                  >
                    Back to email
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground text-sm">
            Powered by{' '}
            <a href="https://thirdweb.com" className="text-brand underline underline-offset-2 hover:no-underline">
              thirdweb
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
