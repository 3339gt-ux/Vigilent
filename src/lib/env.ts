export type VigilenAppMode = 'demo' | 'production';

const rawAppMode = process.env.NEXT_PUBLIC_VIGILEN_APP_MODE;

export const appMode: VigilenAppMode = rawAppMode === 'demo' ? 'demo' : 'production';
export const isDemoMode = appMode === 'demo';
export const isProductionMode = appMode === 'production';

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
};
