'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Circle, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Actions', value: 'action' },
  { label: 'Requirements', value: 'requirement' },
  { label: 'Competencies', value: 'competency' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'System', value: 'system' }
];

const severityClass = (severity: string) => {
  if (severity === 'critical') return 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20';
  if (severity === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20';
  return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20';
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function NotificationBell({ dropdownAlign = 'right-0 top-full mt-2' }: { dropdownAlign?: string }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter(notification => !notification.read_at).length;
  const filtered = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read_at;
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggleRead = async (id: string, read: boolean) => {
    setBusyId(id);
    try {
      await markNotificationRead(id, read);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="relative flex items-center justify-center p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Open notifications"
        title="Notifications"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bell-ring text-indigo-600 dark:text-indigo-400' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${dropdownAlign} w-[min(24rem,calc(100vw-2rem))] bg-card solid-panel border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
          <div className="p-4 border-b border-border/70 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Notifications</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{unreadCount} unread workspace update{unreadCount === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllNotificationsRead}
                disabled={unreadCount === 0}
                className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 text-[10px] font-bold text-foreground border border-border cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 inline mr-1" />
                Mark all
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications dropdown" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-border/60 flex gap-1 overflow-x-auto no-scrollbar">
            {filterOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 cursor-pointer ${
                  filter === option.value
                    ? 'bg-indigo-650 text-white border-indigo-700'
                    : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-2 no-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No notifications yet.
              </div>
            ) : (
              filtered.slice(0, 30).map(notification => {
                const content = (
                  <div className="flex items-start gap-2">
                    <Circle className={`w-2.5 h-2.5 mt-1 shrink-0 ${notification.read_at ? 'text-muted-foreground/30' : 'text-indigo-500 fill-current'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-foreground leading-snug">{notification.title}</h4>
                        <span className={`px-1.5 py-0.5 rounded-md border text-[8px] uppercase font-extrabold ${severityClass(notification.severity)}`}>
                          {notification.type}
                        </span>
                      </div>
                      {notification.body && <p className="text-[11px] text-muted-foreground leading-normal mt-1">{notification.body}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span>{formatTime(notification.created_at)}</span>
                        <button
                          type="button"
                          disabled={busyId === notification.id}
                          onClick={event => {
                            event.preventDefault();
                            void handleToggleRead(notification.id, !notification.read_at);
                          }}
                          className="font-bold text-indigo-600 dark:text-indigo-300 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {notification.read_at ? 'Mark unread' : 'Mark read'}
                        </button>
                      </div>
                    </div>
                  </div>
                );

                return notification.action_url ? (
                  <Link
                    key={notification.id}
                    href={notification.action_url}
                    onClick={() => {
                      if (!notification.read_at) void handleToggleRead(notification.id, true);
                      setOpen(false);
                    }}
                    className={`block p-3 rounded-xl border transition-all duration-150 ${
                      notification.read_at
                        ? 'border-border/40 bg-transparent hover:bg-muted/30'
                        : 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-550/10 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35'
                    }`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-xl border transition-all duration-150 ${
                      notification.read_at
                        ? 'border-border/40 bg-transparent'
                        : 'border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20'
                    }`}
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
