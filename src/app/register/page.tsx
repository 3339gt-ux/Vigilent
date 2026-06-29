'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LumenLogo from '@/components/brand/LumenLogo';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, hasOrganization, isLoading } = useApp();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreedDisclaimers, setAgreedDisclaimers] = useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(hasOrganization ? '/dashboard' : '/onboarding');
    }
  }, [isLoading, isAuthenticated, hasOrganization, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!agreedDisclaimers) {
      setError('You must acknowledge the operational disclaimers.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await register(fullName, email, password);
      if (success) {
        router.push('/onboarding');
      } else {
        setError('Failed to create account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during account registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          id="register-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>

      {/* Left side: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6 py-8">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <LumenLogo iconOnly variant="auto" height={36} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-4" id="register-heading">
              Initialize your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Create your user account first. Organisation setup follows after signup.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/15 border border-destructive/20 text-destructive text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
                />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Work Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane.doe@apexlogistics.com"
                className="w-full px-4 py-2.5 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Create Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2.5 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div className="flex flex-col gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2.5">
                <input
                  id="register-disclaimer-checkbox"
                  type="checkbox"
                  checked={agreedDisclaimers}
                  onChange={e => setAgreedDisclaimers(e.target.checked)}
                  className="mt-1 accent-indigo-600 rounded border-border"
                />
                <label htmlFor="register-disclaimer-checkbox" className="text-[11px] leading-relaxed text-muted-foreground">
                  I acknowledge and agree that Overview360 functions purely as a tracking database. It <strong>does not</strong> generate legal advice, build regulatory safety statements, or claim compliance status on behalf of my business.
                </label>
              </div>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting || !agreedDisclaimers}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an active workspace?{' '}
            <Link href="/login" className="text-indigo-500 hover:underline font-semibold" id="register-goto-login">
              Log in instead
            </Link>
          </p>
        </div>
      </div>

      {/* Right side: Visual Promo Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-16 text-white relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex items-center gap-2 z-10">
          <LumenLogo variant="dark" height={28} />
        </div>

        <div className="z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight">
            Compliance Intelligence
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Avoid costly regulatory violations, fleet groundings, or storage insurance cancellations. Track operations continuously.
          </p>
          <ul className="space-y-3.5 text-xs text-zinc-300">
            <li className="flex items-center gap-2">✓ Dynamic 30/60/90 Day Expiry Alerting</li>
            <li className="flex items-center gap-2">✓ Multi-tenant isolation planned through RLS</li>
            <li className="flex items-center gap-2">✓ Share portal security pending production implementation</li>
            <li className="flex items-center gap-2">✓ Direct evidence mapping matrices</li>
          </ul>
        </div>

        <div className="z-10 text-[10px] text-zinc-500">
          Overview360 is currently a prototype and requires production security hardening before live use.
        </div>
      </div>
    </div>
  );
}
