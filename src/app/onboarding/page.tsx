'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertCircle, ArrowLeft, Building2, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const {
    isLoading,
    isAuthenticated,
    hasOrganization,
    createOrganization,
    logout,
    authError
  } = useApp();

  const [organizationName, setOrganizationName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('Ireland');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (hasOrganization) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, hasOrganization, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      setError('Organisation name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createOrganization(organizationName, industry || null, country || 'Ireland');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create organisation. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || hasOrganization) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center animate-pulse">
          <img src="/brand/vygilence-mark.png" alt="Vygilence Logo" className="w-8 h-8 object-contain" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Checking workspace status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>

      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-4">
              Create your organisation
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up the workspace that will hold requirements, private evidence records, actions, reviews and audit packs. You will be added as the owner.
            </p>
          </div>

          {(error || authError) && (
            <div className="p-3 bg-destructive/15 border border-destructive/20 text-destructive text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-muted/40 border border-border rounded-lg text-[11px] text-muted-foreground leading-relaxed">
              After this step, use the dashboard checklist to import starter requirements, upload evidence, link records, and create a first audit pack.
            </div>
            <div>
              <label htmlFor="onboarding-org-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Organisation Name
              </label>
              <input
                id="onboarding-org-name"
                type="text"
                required
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="Apex Logistics Ltd"
                className="w-full px-4 py-3 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="onboarding-industry" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Industry <span className="font-normal normal-case text-muted-foreground">(optional)</span>
              </label>
              <input
                id="onboarding-industry"
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="Transport & Warehousing"
                className="w-full px-4 py-3 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="onboarding-country" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Country
              </label>
              <input
                id="onboarding-country"
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-sm transition-colors outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !organizationName.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Organisation...
                </>
              ) : (
                'Create Organisation'
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out and return later
          </button>
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="flex items-center gap-2 z-10">
          <img src="/brand/vygilence-mark.png" alt="Vygilence Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold tracking-wider">Vygilence</span>
        </div>
        <div className="z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight">
            One account.<br />One active workspace.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Organisation membership controls which evidence records, matrix rows, and audit activity this account can access.
          </p>
        </div>
        <div className="z-10 text-[10px] text-zinc-500">
          Vygilence uses Supabase Auth and organisation membership checks for production workspace access.
        </div>
      </div>
    </div>
  );
}
