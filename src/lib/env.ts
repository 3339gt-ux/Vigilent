export type VigilenAppMode = 'demo' | 'production';

const rawAppMode = process.env.NEXT_PUBLIC_VIGILEN_APP_MODE;

export const appMode: VigilenAppMode = rawAppMode === 'demo' ? 'demo' : 'production';
export const isDemoMode = appMode === 'demo';
export const isProductionMode = appMode === 'production';

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const evidenceStorageBucket =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'evidence-documents';

export const maxEvidenceUploadBytes = parsePositiveInteger(
  process.env.NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES,
  10 * 1024 * 1024
);

export const signedUrlTtlSeconds = parsePositiveInteger(
  process.env.NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS,
  300
);

export const requireDemoMode = () => {
  if (!isDemoMode) {
    throw new Error(
      'Demo/localStorage mode is disabled. Set NEXT_PUBLIC_VIGILEN_APP_MODE=demo only for local prototype use.'
    );
  }
};

export const requireProductionEnv = (isSupabaseConfigured: boolean) => {
  if (isProductionMode && !isSupabaseConfigured) {
    throw new Error(
      'Production mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  if (isProductionMode && evidenceStorageBucket !== 'evidence-documents') {
    throw new Error(
      'Production mode requires NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=evidence-documents.'
    );
  }
};
