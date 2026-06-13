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
  // Throw a masked, safe error message to prevent database/RLS details from leaking to UI
  const friendlyMsg = getFriendlyErrorMessage(diagnostics.message);
  throw new Error(friendlyMsg);
};

export const getFriendlyErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred.';
  const rawMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = rawMsg.toLowerCase();

  // If it's a database-level, schema, connection, or PostgREST error, map to friendly text
  if (
    lowerMsg.includes('pgrst') ||
    lowerMsg.includes('postgres') ||
    lowerMsg.includes('relation') ||
    lowerMsg.includes('42p01') ||
    lowerMsg.includes('does not exist') ||
    lowerMsg.includes('column ') ||
    lowerMsg.includes('table ') ||
    lowerMsg.includes('database error') ||
    lowerMsg.includes('schema') ||
    lowerMsg.includes('sql') ||
    lowerMsg.includes('row-level security') ||
    lowerMsg.includes('rls') ||
    lowerMsg.includes('violates row-level security') ||
    lowerMsg.includes('policy')
  ) {
    if (
      lowerMsg.includes('does not exist') ||
      lowerMsg.includes('42p01') ||
      lowerMsg.includes('relation') ||
      lowerMsg.includes('missing')
    ) {
      return 'The requested feature is not currently available or configured in this environment.';
    }
    if (lowerMsg.includes('row-level security') || lowerMsg.includes('violates') || lowerMsg.includes('policy')) {
      return 'You do not have permission to perform this action.';
    }
    return 'A database operation could not be completed. Please check your connection and try again. If this continues, contact support.';
  }

  return rawMsg;
};
