type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  name?: string;
};

export type SupabaseErrorDiagnostics = {
  context: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  name?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getSupabaseErrorDiagnostics = (
  context: string,
  error: unknown
): SupabaseErrorDiagnostics => {
  if (error instanceof Error) {
    const maybeSupabase = error as Error & SupabaseErrorLike;
    return {
      context,
      message: maybeSupabase.message || 'Supabase request failed.',
      code: maybeSupabase.code,
      details: maybeSupabase.details,
      hint: maybeSupabase.hint,
      status: maybeSupabase.status,
      name: maybeSupabase.name,
    };
  }

  if (isRecord(error)) {
    const maybeSupabase = error as SupabaseErrorLike;
    return {
      context,
      message:
        typeof maybeSupabase.message === 'string'
          ? maybeSupabase.message
          : JSON.stringify(error),
      code: typeof maybeSupabase.code === 'string' ? maybeSupabase.code : undefined,
      details: typeof maybeSupabase.details === 'string' ? maybeSupabase.details : undefined,
      hint: typeof maybeSupabase.hint === 'string' ? maybeSupabase.hint : undefined,
      status: typeof maybeSupabase.status === 'number' ? maybeSupabase.status : undefined,
      name: typeof maybeSupabase.name === 'string' ? maybeSupabase.name : undefined,
    };
  }

  return {
    context,
    message: typeof error === 'string' ? error : 'Unknown Supabase request failure.',
  };
};

export const formatSupabaseError = (diagnostics: SupabaseErrorDiagnostics): string => {
  const parts = [`${diagnostics.context}: ${diagnostics.message}`];
  if (diagnostics.code) parts.push(`code=${diagnostics.code}`);
  if (diagnostics.details) parts.push(`details=${diagnostics.details}`);
  if (diagnostics.hint) parts.push(`hint=${diagnostics.hint}`);
  if (diagnostics.status) parts.push(`status=${diagnostics.status}`);
  return parts.join(' | ');
};

export const logSupabaseError = (context: string, error: unknown): SupabaseErrorDiagnostics => {
  const diagnostics = getSupabaseErrorDiagnostics(context, error);
  console.error('Supabase query failed', diagnostics);
  return diagnostics;
};

export const throwSupabaseError = (context: string, error: unknown): never => {
  const diagnostics = logSupabaseError(context, error);
  throw new Error(formatSupabaseError(diagnostics));
};
