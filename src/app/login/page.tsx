'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, resetPassword, isAuthenticated, hasOrganization, isLoading } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agreedDisclaimers, setAgreedDisclaimers] = useState(true);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(hasOrganization ? '/dashboard' : '/onboarding');
    }
  }, [isLoading, isAuthenticated, hasOrganization, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!agreedDisclaimers) {
      setError('You must acknowledge the operational disclaimers.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      await resetPassword(email);
      setNotice('Password reset instructions have been sent if the email is registered.');
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset instructions.');
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
          id="login-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>

      {/* Left side: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image src="/brand/vygilence-mark.png" alt="Vygilence Logo" width={48} height={48} className="object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-4" id="login-heading">
              Access your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your organization email. Demo login is available only when explicitly enabled.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/15 border border-destructive/20 text-destructive text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Work Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane.doe@apexlogistics.com"
                className="w-full px-4 py-3 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Security Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div className="flex flex-col gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2.5">
                <input
                  id="login-disclaimer-checkbox"
                  type="checkbox"
                  checked={agreedDisclaimers}
                  onChange={e => setAgreedDisclaimers(e.target.checked)}
                  className="mt-1 accent-indigo-600 rounded border-border"
                />
                <label htmlFor="login-disclaimer-checkbox" className="text-[11px] leading-relaxed text-muted-foreground">
                  I acknowledge that Vygilence is an audit readiness repository and <strong>does not</strong> generate legal advice, safety statements, or formal claims of compliance.
                </label>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isSubmitting}
            className="w-full text-center text-xs text-indigo-500 hover:underline font-semibold disabled:opacity-50"
          >
            Send password reset email
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an workspace yet?{' '}
            <Link href="/register" className="text-indigo-500 hover:underline font-semibold" id="login-goto-register">
              Create an account
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
          <Image src="/brand/vygilence-mark.png" alt="Vygilence Logo" width={24} height={24} className="object-contain" />
          <span className="font-bold tracking-wider">Vygilence</span>
        </div>

        <div className="z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight">
            See it. Manage it.<br />Prove it.
          </h2>
          <blockquote className="border-l-2 border-indigo-500 pl-4 py-1 text-zinc-400 text-sm italic">
            "Vygilence enabled our depot managers to track CPC cards and fork lift inspections in one simple view. We entered our last DVSA audit with total confidence."
            <cite className="block text-xs text-zinc-500 font-semibold mt-2 not-italic">— Head of Logistics, Apex Freight Group</cite>
          </blockquote>
        </div>

        <div className="z-10 text-[10px] text-zinc-500">
          Vygilence is a continuous evidence monitoring platform. Production security depends on completed Supabase Auth, RLS, and storage configuration.
        </div>
      </div>
    </div>
  );
}
