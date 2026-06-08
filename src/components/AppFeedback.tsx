'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
} | null;

export function InlineToast({ toast, onDismiss }: { toast: ToastState; onDismiss?: () => void }) {
  React.useEffect(() => {
    if (!toast || !onDismiss) return;
    const timer = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const className =
    toast.type === 'error'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
      : toast.type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300';

  return (
    <div className={`fixed bottom-6 right-6 z-[120] w-80 max-w-[calc(100vw-2rem)] shadow-2xl animate-in slide-in-from-bottom-4 duration-150 rounded-xl border p-3 text-xs font-semibold flex items-start gap-2 ${className}`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{toast.message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="p-0.5 rounded hover:bg-current/10 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({ request, onCancel }: { request: ConfirmRequest; onCancel: () => void }) {
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!request) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, onCancel, busy]);

  if (!request) return null;

  const confirmClass =
    request.tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : request.tone === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700'
        : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div
      className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="w-full max-w-md bg-card solid-panel border border-border rounded-2xl shadow-2xl p-6 space-y-4 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-foreground">{request.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{request.description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request.onConfirm();
                onCancel();
              } finally {
                setBusy(false);
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${confirmClass}`}
          >
            {busy ? 'Working...' : request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
