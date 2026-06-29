'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  Calendar,
  User,
  Tag,
  Filter,
  ShieldAlert,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { dbService } from '@/lib/db';
import { AuditTrailEvent } from '@/lib/types';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';

const sensitiveKeys = ['pin_code', 'pin', 'share_token', 'token', 'password', 'secret', 'key', 'apikey', 'api_key', 'signedurl', 'signed_url'];

function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }
  if (typeof obj === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return obj;
}

function getUndoUnavailableReason(event: AuditTrailEvent): string {
  if (event.undone_at) {
    return 'This action has already been undone.';
  }
  if (event.undo_expires_at && new Date(event.undo_expires_at) < new Date()) {
    return 'The recovery window for this action has expired.';
  }
  if (event.action_type && event.action_type.includes('permanently_deleted')) {
    return 'Permanent hard deletions cannot be undone.';
  }
  if (event.action_type && (event.action_type.includes('created') || event.action_type.includes('uploaded'))) {
    return 'Resource creations must be removed manually.';
  }
  if (event.action_category === 'System' || event.action_type === 'undo_executed') {
    return 'System-level transaction logs cannot be undone.';
  }
  return 'This action is not configuration-reversible.';
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'Evidence':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    case 'Requirements':
      return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
    case 'Actions':
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'Competency':
      return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400';
    case 'Audit Packs':
      return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
    case 'Users & Admin':
      return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
    case 'System':
      return 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400';
    default:
      return 'bg-muted border-border/80 text-foreground';
  }
}

export default function AuditTrailPage() {
  const { user } = useApp();
  const { interfaceDetailLevel } = useInterfaceDetailLevel();
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Authentication & Authorization Gate
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // States
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedActor, setSelectedActor] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [undoableOnly, setUndoableOnly] = useState(false);

  const activeFiltersCount = useMemo(() => {
    return [
      selectedCategory !== 'All',
      selectedSeverity !== 'All',
      selectedActor !== 'All',
      selectedActionType !== 'All',
      startDate !== '',
      endDate !== '',
      undoableOnly
    ].filter(Boolean).length;
  }, [selectedCategory, selectedSeverity, selectedActor, selectedActionType, startDate, endDate, undoableOnly]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected event for drawer
  const [selectedEvent, setSelectedEvent] = useState<AuditTrailEvent | null>(null);
  
  // Confirmation modal state for undoing
  const [confirmUndoEvent, setConfirmUndoEvent] = useState<AuditTrailEvent | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Operation statuses
  const [undoingEventId, setUndoingEventId] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string | null;
  }>({ type: null, message: null });

  // Gate Check
  useEffect(() => {
    if (user) {
      const authorized = user.role === 'Owner' || user.role === 'Admin';
      setIsAuthorized(authorized);
      if (!authorized) {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  // Fetch audit events
  const fetchEvents = async () => {
    setIsLoading(true);
    setOperationStatus({ type: null, message: null });
    try {
      const data = await dbService.getAuditTrailEvents();
      // Ensure sorted by created_at desc
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      console.error('Error fetching audit trail events:', err);
      setOperationStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to retrieve audit trail events.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchEvents();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (typeof window !== 'undefined' && events.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      if (eventId) {
        const match = events.find(e => e.id === eventId);
        if (match) {
          setSelectedEvent(match);
        }
      }
    }
  }, [events]);

  // Unique lists for filtering dropdowns
  const uniqueActors = useMemo(() => {
    const actors = new Set<string>();
    events.forEach(e => {
      const name = e.actor_name || e.actor_email || 'System';
      actors.add(name);
    });
    return Array.from(actors).sort();
  }, [events]);

  const uniqueActionTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(e => {
      if (e.action_type) types.add(e.action_type);
    });
    return Array.from(types).sort();
  }, [events]);

  // Categories list
  const categories = ['All', 'Evidence', 'Requirements', 'Actions', 'Competency', 'Audit Packs', 'Users & Admin', 'System'];

  // Handle Undo
  const handleUndo = async (eventId: string) => {
    setConfirmUndoEvent(null);
    setUndoingEventId(eventId);
    setOperationStatus({ type: null, message: null });
    try {
      const success = await dbService.triggerUndoAction(eventId);
      if (success) {
        setOperationStatus({
          type: 'success',
          message: 'The action has been undone successfully. A new audit trail log has been created.'
        });
        
        // Refresh events list
        await fetchEvents();
        
        // Close or update the drawer selected event if opened
        setSelectedEvent(prev => {
          if (prev && prev.id === eventId) {
            return {
              ...prev,
              undone_at: new Date().toISOString(),
              undone_by: user?.id || null,
              undo_available: false
            };
          }
          return prev;
        });
      } else {
        setOperationStatus({
          type: 'error',
          message: 'Undo action failed to execute.'
        });
      }
    } catch (err) {
      console.error('Error undoing event:', err);
      setOperationStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Undo failed. The record might have been modified or permanently deleted.'
      });
    } finally {
      setUndoingEventId(null);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = (e.description || '').toLowerCase().includes(term);
        const entityLabelMatch = (e.entity_label || '').toLowerCase().includes(term);
        const actorNameMatch = (e.actor_name || '').toLowerCase().includes(term);
        const actorEmailMatch = (e.actor_email || '').toLowerCase().includes(term);
        if (!descMatch && !entityLabelMatch && !actorNameMatch && !actorEmailMatch) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All' && e.action_category !== selectedCategory) {
        return false;
      }

      // Severity
      if (selectedSeverity !== 'All' && e.severity !== selectedSeverity) {
        return false;
      }

      // Actor
      if (selectedActor !== 'All') {
        const actorName = e.actor_name || e.actor_email || 'System';
        if (actorName !== selectedActor) return false;
      }

      // Action Type
      if (selectedActionType !== 'All' && e.action_type !== selectedActionType) {
        return false;
      }

      // Date Range
      if (startDate) {
        const eventTime = new Date(e.created_at).getTime();
        const startTime = new Date(startDate).getTime();
        if (eventTime < startTime) return false;
      }
      if (endDate) {
        const eventTime = new Date(e.created_at).getTime();
        // End date inclusive of the whole day
        const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
        if (eventTime > endTime) return false;
      }

      // Undoable Only
      if (undoableOnly && (!e.undo_available || e.undone_at)) {
        return false;
      }

      return true;
    });
  }, [events, searchTerm, selectedCategory, selectedSeverity, selectedActor, selectedActionType, startDate, endDate, undoableOnly]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== '' ||
      selectedCategory !== 'All' ||
      selectedSeverity !== 'All' ||
      selectedActor !== 'All' ||
      selectedActionType !== 'All' ||
      startDate !== '' ||
      endDate !== '' ||
      undoableOnly;
  }, [searchTerm, selectedCategory, selectedSeverity, selectedActor, selectedActionType, startDate, endDate, undoableOnly]);

  // Pagination logic
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSeverity, selectedActor, selectedActionType, startDate, endDate, undoableOnly]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let sevenDaysCount = 0;
    let recoverableCount = 0;
    let highRiskCount = 0;

    events.forEach(e => {
      const eDate = new Date(e.created_at);
      const eDateString = e.created_at.split('T')[0];

      if (eDateString === today) todayCount++;
      if (eDate >= sevenDaysAgo) sevenDaysCount++;
      if (e.undo_available && !e.undone_at) recoverableCount++;
      if (e.severity === 'critical' || e.severity === 'warning') highRiskCount++;
    });

    return {
      total: events.length,
      today: todayCount,
      last7Days: sevenDaysCount,
      recoverable: recoverableCount,
      highRisk: highRiskCount
    };
  }, [events]);

  // Clear filters helper
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedSeverity('All');
    setSelectedActor('All');
    setSelectedActionType('All');
    setStartDate('');
    setEndDate('');
    setUndoableOnly(false);
    setOperationStatus({ type: null, message: null });
  };

  // Export Filtered events to CSV
  const performExportCSV = () => {
    try {
      if (filteredEvents.length === 0) {
        throw new Error('No events to export.');
      }

      const headers = [
        'ID',
        'Timestamp',
        'Actor Name',
        'Actor Email',
        'Actor Role',
        'Category',
        'Action Type',
        'Affected Entity Type',
        'Affected Entity ID',
        'Affected Entity Label',
        'Description',
        'Severity',
        'Source',
        'Undo Available',
        'Undone At',
        'Undone By'
      ];

      const csvRows = filteredEvents.map(e => [
        e.id,
        e.created_at,
        e.actor_name || 'System',
        e.actor_email || '',
        e.actor_role || '',
        e.action_category,
        e.action_type,
        e.entity_type,
        e.entity_id || '',
        e.entity_label || '',
        e.description.replace(/"/g, '""'),
        e.severity,
        e.source,
        e.undo_available ? 'Yes' : 'No',
        e.undone_at || '',
        e.undone_by || ''
      ]);

      const content = [headers, ...csvRows]
        .map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `overview360-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Audit Trail exported to CSV successfully.' });
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'CSV export failed.'
      });
    }
  };

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      setToast({ type: 'error', message: 'No events to export.' });
      return;
    }
    setConfirmRequest({
      title: 'Export Audit Trail to CSV?',
      description: `You are about to export ${filteredEvents.length} log event${filteredEvents.length === 1 ? '' : 's'} as a CSV file. Do you want to download this data?`,
      confirmLabel: 'Export CSV',
      tone: 'primary',
      onConfirm: performExportCSV
    });
  };

  // Export Filtered events to JSON
  const performExportJSON = () => {
    try {
      if (filteredEvents.length === 0) {
        throw new Error('No events to export.');
      }

      // Mask sensitive fields in JSON export
      const maskedEvents = filteredEvents.map(e => ({
        ...e,
        metadata: maskSensitiveData(e.metadata),
        before_snapshot: maskSensitiveData(e.before_snapshot),
        after_snapshot: maskSensitiveData(e.after_snapshot),
        changed_fields: maskSensitiveData(e.changed_fields)
      }));

      const content = JSON.stringify(maskedEvents, null, 2);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `overview360-audit-trail-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Audit Trail exported to JSON successfully.' });
    } catch (err) {
      console.error(err);
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'JSON export failed.'
      });
    }
  };

  const handleExportJSON = () => {
    if (filteredEvents.length === 0) {
      setToast({ type: 'error', message: 'No events to export.' });
      return;
    }
    setConfirmRequest({
      title: 'Export Audit Trail to JSON?',
      description: `You are about to export ${filteredEvents.length} log event${filteredEvents.length === 1 ? '' : 's'} as a structured JSON file. Do you want to download this data?`,
      confirmLabel: 'Export JSON',
      tone: 'primary',
      onConfirm: performExportJSON
    });
  };

  // Render auth loading state
  if (isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-muted-foreground font-semibold">Checking administrator permissions...</p>
      </div>
    );
  }

  // Render auth denied state
  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 text-center p-6 bg-card border border-border rounded-2xl max-w-lg mx-auto shadow-lg my-12">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full shrink-0 select-none">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-foreground">Unauthorized Access</h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            This workspace resource is locked. Only accounts with Owner or Administrator permissions are authorized to inspect the Compliance Audit Trail.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground" id="audit-trail-heading">Audit Trail</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm select-none">
              <ShieldCheck className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              Owner / Admin Only
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Organisation-level record of user actions, changes and recoverable events.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 font-medium bg-muted/65 border border-border/40 px-3 py-2 rounded-lg max-w-2xl select-none">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Audit entries are protected and cannot be edited after creation, except controlled undo markers.</span>
          </div>
        </div>

        {/* Exports */}
        {interfaceDetailLevel === 'advanced' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={filteredEvents.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-card hover:bg-muted text-foreground text-xs font-bold rounded-lg border border-border shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                disabled={filteredEvents.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-card hover:bg-muted text-foreground text-xs font-bold rounded-lg border border-border shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-3.5 h-3.5" /> Export JSON
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground/75 text-center sm:text-left mt-0.5">
              Exports include only the currently filtered events.
            </span>
          </div>
        )}
      </div>

      {/* Operation Toast Notification */}
      {operationStatus.type && (
        <div className={`p-4 border rounded-xl flex items-start gap-3 text-xs font-semibold shadow-md animate-in fade-in duration-300 ${
          operationStatus.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {operationStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">
            <span>{operationStatus.message}</span>
          </div>
          <button onClick={() => setOperationStatus({ type: null, message: null })} className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Events */}
        <div className="bg-card border border-border/80 border-l-4 border-l-indigo-500 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Events</span>
            <History className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div>
            <strong className="block text-2xl mt-1.5 font-extrabold text-foreground tracking-tight">{metrics.total}</strong>
            <span className="text-[9.5px] text-muted-foreground mt-1 block font-medium">immutable records logged</span>
          </div>
        </div>

        {/* Logged Today */}
        <div className="bg-card border border-border/80 border-l-4 border-l-slate-400 dark:border-l-slate-600 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Logged Today</span>
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          </div>
          <div>
            <strong className="block text-2xl mt-1.5 font-extrabold text-foreground tracking-tight">{metrics.today}</strong>
            <span className="text-[9.5px] text-muted-foreground mt-1 block font-medium">within current day</span>
          </div>
        </div>

        {/* Last 7 Days */}
        <div className="bg-card border border-border/80 border-l-4 border-l-blue-500 dark:border-l-blue-600 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Last 7 Days</span>
            <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
          </div>
          <div>
            <strong className="block text-2xl mt-1.5 font-extrabold text-foreground tracking-tight">{metrics.last7Days}</strong>
            <span className="text-[9.5px] text-muted-foreground mt-1 block font-medium">weekly event activity</span>
          </div>
        </div>

        {/* Recoverable */}
        <div className="bg-card border border-border/80 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block font-semibold">Recoverable</span>
            <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div>
            <strong className="block text-2xl mt-1.5 font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{metrics.recoverable}</strong>
            <span className="text-[9.5px] text-muted-foreground mt-1 block font-medium">reversible changes</span>
          </div>
        </div>

        {/* High Risk Logs */}
        <div className="bg-card border border-border/80 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider block font-semibold">High Risk Logs</span>
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          <div>
            <strong className="block text-2xl mt-1.5 font-extrabold text-rose-500 tracking-tight">{metrics.highRisk}</strong>
            <span className="text-[9.5px] text-muted-foreground mt-1 block font-medium">critical and warnings</span>
          </div>
        </div>
      </div>

      {/* Filtering Section */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        {interfaceDetailLevel === 'focused' ? (
          // FOCUSED VIEW LAYOUT
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search description, user..."
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none text-foreground font-semibold transition-all duration-150"
                  />
                </div>
                <FiltersAndToolsButton
                  isOpen={showFilters}
                  onClick={() => setShowFilters(!showFilters)}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={clearFilters}
                />
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredEvents.length === 0}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      disabled={filteredEvents.length === 0}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Export JSON
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Category */}
                  <div className="space-y-1">
                    <label htmlFor="category-select-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select
                      id="category-select-focused"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Actor */}
                  <div className="space-y-1">
                    <label htmlFor="actor-select-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actor / User</label>
                    <select
                      id="actor-select-focused"
                      value={selectedActor}
                      onChange={e => setSelectedActor(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                    >
                      <option value="All">All Users</option>
                      {uniqueActors.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Type */}
                  <div className="space-y-1">
                    <label htmlFor="action-type-select-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Action Type</label>
                    <select
                      id="action-type-select-focused"
                      value={selectedActionType}
                      onChange={e => setSelectedActionType(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                    >
                      <option value="All">All Actions</option>
                      {uniqueActionTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div className="space-y-1">
                    <label htmlFor="severity-select-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Severity</label>
                    <select
                      id="severity-select-focused"
                      value={selectedSeverity}
                      onChange={e => setSelectedSeverity(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                    >
                      <option value="All">All Severities</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Date range start */}
                  <div className="space-y-1">
                    <label htmlFor="start-date-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        id="start-date-focused"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Date range end */}
                  <div className="space-y-1">
                    <label htmlFor="end-date-focused" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        id="end-date-focused"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Toggle controls */}
                  <div className="flex flex-col justify-end">
                    <label htmlFor="undoable-only-toggle-focused" className={`flex items-center gap-2 select-none h-9 px-3 bg-muted hover:bg-muted/80 border ${undoableOnly ? 'border-indigo-500/50 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'border-border/80 text-foreground'} rounded-lg text-xs font-bold cursor-pointer transition-all duration-200`}>
                      <input
                        id="undoable-only-toggle-focused"
                        type="checkbox"
                        checked={undoableOnly}
                        onChange={e => setUndoableOnly(e.target.checked)}
                        className="accent-indigo-660 w-3.5 h-3.5 rounded cursor-pointer"
                      />
                      <span>Undoable Actions Only</span>
                    </label>
                  </div>
                </div>
              </div>
            </AdvancedControlsPanel>
          </>
        ) : (
          // ADVANCED VIEW LAYOUT
          <>
            <div className="flex items-center gap-1.5 pb-2.5 border-b border-border/70">
              <Filter className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Advanced Query Filters</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Search bar */}
              <div className="space-y-1">
                <label htmlFor="search-input" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Search Term</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search description, user..."
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none text-foreground font-semibold transition-all duration-150"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="category-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Actor */}
              <div className="space-y-1">
                <label htmlFor="actor-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actor / User</label>
                <select
                  id="actor-select"
                  value={selectedActor}
                  onChange={e => setSelectedActor(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                >
                  <option value="All">All Users</option>
                  {uniqueActors.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div className="space-y-1">
                <label htmlFor="action-type-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Action Type</label>
                <select
                  id="action-type-select"
                  value={selectedActionType}
                  onChange={e => setSelectedActionType(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                >
                  <option value="All">All Actions</option>
                  {uniqueActionTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Date range start */}
              <div className="space-y-1">
                <label htmlFor="start-date" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                  />
                </div>
              </div>

              {/* Date range end */}
              <div className="space-y-1">
                <label htmlFor="end-date" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                  />
                </div>
              </div>

              {/* Severity */}
              <div className="space-y-1">
                <label htmlFor="severity-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Severity</label>
                <select
                  id="severity-select"
                  value={selectedSeverity}
                  onChange={e => setSelectedSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg text-xs outline-none font-semibold text-foreground transition-all duration-150 cursor-pointer"
                >
                  <option value="All">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Toggle controls */}
              <div className="flex flex-col justify-end">
                <label htmlFor="undoable-only-toggle" className={`flex items-center gap-2 select-none h-9 px-3 bg-muted hover:bg-muted/80 border ${undoableOnly ? 'border-indigo-500/50 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'border-border/80 text-foreground'} rounded-lg text-xs font-bold cursor-pointer transition-all duration-200`}>
                  <input
                    id="undoable-only-toggle"
                    type="checkbox"
                    checked={undoableOnly}
                    onChange={e => setUndoableOnly(e.target.checked)}
                    className="accent-indigo-600 w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span>Undoable Actions Only</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Active filters:</span>
            {searchTerm.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Search: &quot;{searchTerm}&quot;
                <button onClick={() => setSearchTerm('')} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {selectedSeverity !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Severity: {selectedSeverity}
                <button onClick={() => setSelectedSeverity('All')} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {selectedActor !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                User: {selectedActor}
                <button onClick={() => setSelectedActor('All')} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {selectedActionType !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Action: {selectedActionType}
                <button onClick={() => setSelectedActionType('All')} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Date: {startDate || '*'} to {endDate || '*'}
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {undoableOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border/80 rounded-lg text-[10px] text-foreground font-semibold">
                Undoable only
                <button onClick={() => setUndoableOnly(false)} className="p-0.5 hover:bg-border rounded-full cursor-pointer"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-semibold">
            Showing <strong className="text-foreground">{filteredEvents.length}</strong> event{filteredEvents.length === 1 ? '' : 's'} of <strong className="text-foreground">{events.length}</strong> total logs
          </span>

          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>
      </div>

      {/* Events List / Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 px-6 text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span>Loading immutable audit records...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-6 text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-card rounded-xl">
            <div className="p-4 bg-muted border border-border/60 text-muted-foreground/75 rounded-full shadow-inner select-none animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-foreground text-sm block">No Audit Trail Events Found</span>
              <p className="max-w-xs leading-relaxed text-[11px] text-muted-foreground/90 mx-auto">
                {events.length === 0
                  ? 'No compliance activities have been recorded in this organisation workspace yet.'
                  : 'No audit logs match the selected advanced query filters. Try resetting the criteria.'}
              </p>
            </div>
            {events.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {/* Table layout on medium and up screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold uppercase tracking-wider text-[9.5px] select-none">
                    <th className="py-3 px-4 pl-5">Timestamp</th>
                    <th className="py-3 px-4">Actor / User</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action Logged</th>
                    <th className="py-3 px-4">Affected Entity</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4 pr-5 text-center">Undo Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/55">
                  {paginatedEvents.map(e => {
                    const actorName = e.actor_name || e.actor_email || 'System';
                    const eventTime = new Date(e.created_at).toLocaleString();
                    
                    const severityClass =
                      e.severity === 'critical'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                        : e.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                        : 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400 font-medium';

                    return (
                      <tr
                        key={e.id}
                        onClick={() => {
                          setSelectedEvent(e);
                          setOperationStatus({ type: null, message: null });
                        }}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 pl-5 font-semibold text-muted-foreground whitespace-nowrap">
                          {eventTime}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground truncate max-w-[140px] group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors" title={actorName}>
                              {actorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {e.actor_role || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider ${getCategoryBadgeClass(e.action_category)}`}>
                            {e.action_category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-foreground truncate max-w-[200px]" title={e.action_type}>
                              {e.action_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-[250px]" title={e.description}>
                              {e.description}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {e.entity_label ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground truncate max-w-[160px]" title={e.entity_label}>
                                {e.entity_label}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                                {e.entity_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${severityClass}`}>
                            {e.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 pr-5 text-center whitespace-nowrap" onClick={opt => opt.stopPropagation()}>
                          {e.undone_at ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              Undone
                            </span>
                          ) : e.undo_available ? (
                            <button
                              onClick={() => setConfirmUndoEvent(e)}
                              disabled={undoingEventId !== null}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650/40 text-[9px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1 mx-auto transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
                              title="Undo this change"
                            >
                              {undoingEventId === e.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-2.5 h-2.5" />
                              )}
                              Undo
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile layout on narrow screens (hidden on md and up) */}
            <div className="block md:hidden divide-y divide-border/40">
              {paginatedEvents.map(e => {
                const actorName = e.actor_name || e.actor_email || 'System';
                const eventTime = new Date(e.created_at).toLocaleString();

                const severityClass =
                  e.severity === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                    : e.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400 font-medium';

                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedEvent(e);
                      setOperationStatus({ type: null, message: null });
                    }}
                    className="p-4 space-y-3 bg-card hover:bg-muted/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase tracking-wider ${getCategoryBadgeClass(e.action_category)}`}>
                        {e.action_category}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {eventTime}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-sm">
                        {e.action_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-muted-foreground/90 leading-relaxed font-medium">
                        {e.description}
                      </p>
                    </div>

                    {e.entity_label && (
                      <div className="text-[10px] font-semibold text-foreground bg-muted/65 px-2.5 py-1.5 rounded-lg border border-border/40 inline-block max-w-full truncate shadow-sm">
                        <span className="text-muted-foreground font-bold uppercase text-[8px] mr-1.5">{e.entity_type}:</span>
                        {e.entity_label}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate max-w-[100px]" title={actorName}>
                          {actorName}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wide shrink-0">
                          ({e.actor_role || 'System'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${severityClass}`}>
                          {e.severity}
                        </span>
                        {e.undone_at ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 className="w-2 h-2 text-emerald-600 dark:text-emerald-400" />
                            Undone
                          </span>
                        ) : e.undo_available ? (
                          <button
                            onClick={(opt) => {
                              opt.stopPropagation();
                              setConfirmUndoEvent(e);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[9px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Undo
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination footer */}
            <div className="p-4 flex justify-between items-center select-none bg-muted/20">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-card hover:bg-muted text-foreground text-xs font-bold border border-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-muted-foreground font-semibold">
                Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-card hover:bg-muted text-foreground text-xs font-bold border border-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Slideout Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 animate-fade-in" onClick={() => setSelectedEvent(null)}></div>
          
          <div className="relative bg-card solid-panel border-l border-border w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 z-10">
            {/* Drawer Head */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Audit Log Details</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono select-all">UUID: {selectedEvent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-normal">
              {/* Event Description Panel */}
              <div className="p-4 bg-muted/45 border border-border rounded-xl space-y-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider block">Operation description</span>
                <p className="text-foreground font-bold text-sm leading-relaxed">{selectedEvent.description}</p>
                
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 mt-3">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Severity:</span>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase ${
                    selectedEvent.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                    selectedEvent.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                    'bg-indigo-500/5 border-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {selectedEvent.severity}
                  </span>
                  
                  <span className="text-muted-foreground/30">|</span>
                  
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Source:</span>
                  <span className="bg-muted px-2 py-0.5 rounded text-[9px] font-semibold text-foreground uppercase border border-border/70">{selectedEvent.source}</span>
                </div>
              </div>

              {/* Actor & Organization Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[9px] font-bold uppercase text-foreground tracking-wider">Actor Details</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Name</span>
                      <strong className="text-foreground font-bold">{selectedEvent.actor_name || 'System / Automated'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Email Address</span>
                      <span className="text-foreground font-semibold">{selectedEvent.actor_email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Role Authority</span>
                      <span className="text-foreground font-semibold uppercase tracking-wider text-[10px]">{selectedEvent.actor_role || 'System'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[9px] font-bold uppercase text-foreground tracking-wider">Entity Details</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Type</span>
                      <strong className="text-foreground font-bold uppercase tracking-wider text-[10px]">{selectedEvent.entity_type || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Label / Name</span>
                      <span className="text-foreground font-semibold truncate block" title={selectedEvent.entity_label || '—'}>{selectedEvent.entity_label || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Database Entity ID</span>
                      <span className="text-foreground font-mono truncate block text-[9.5px]" title={selectedEvent.entity_id || '—'}>{selectedEvent.entity_id || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Snapshot / Changes Analysis */}
              {selectedEvent.changed_fields && Object.keys(selectedEvent.changed_fields).length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <span className="text-[9px] font-bold uppercase text-foreground tracking-wider block border-b border-border/60 pb-1.5">Changed Fields</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider select-none">
                          <th className="py-1">Field</th>
                          <th className="py-1">Before</th>
                          <th className="py-1">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {Object.keys(selectedEvent.changed_fields).map(key => {
                          const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
                          const beforeVal = isSensitive ? '[REDACTED]' : selectedEvent.before_snapshot?.[key];
                          const afterVal = isSensitive ? '[REDACTED]' : selectedEvent.after_snapshot?.[key];
                          
                          return (
                            <tr key={key} className="hover:bg-muted/10">
                              <td className="py-1.5 font-bold text-foreground">{key}</td>
                              <td className="py-1.5 text-rose-500 truncate max-w-[150px]" title={isSensitive ? '[REDACTED]' : JSON.stringify(beforeVal)}>
                                {beforeVal !== undefined ? (isSensitive ? beforeVal : JSON.stringify(beforeVal)) : 'null'}
                              </td>
                              <td className="py-1.5 text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]" title={isSensitive ? '[REDACTED]' : JSON.stringify(afterVal)}>
                                {afterVal !== undefined ? (isSensitive ? afterVal : JSON.stringify(afterVal)) : 'null'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <span className="text-[9px] font-bold uppercase text-foreground tracking-wider block border-b border-border/60 pb-1.5">Full State Snapshot</span>
                  <p className="text-muted-foreground text-[10px]">No incremental changes tracked. Displaying full metadata snapshot:</p>
                  <div className="font-mono bg-muted p-3 rounded-lg text-[10px] max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(maskSensitiveData(selectedEvent.metadata || {}), null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* JSON Explorer (Before / After Snapshot tabs) */}
              {(selectedEvent.before_snapshot || selectedEvent.after_snapshot) && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <span className="text-[9px] font-bold uppercase text-foreground tracking-wider block border-b border-border/60 pb-1.5">JSON State Snapshots</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Before State</span>
                      {selectedEvent.before_snapshot ? (
                        <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-48 overflow-auto border border-border/60 animate-fade-in">
                          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(maskSensitiveData(selectedEvent.before_snapshot), null, 2)}</pre>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">None (e.g. Creation Event)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">After State</span>
                      {selectedEvent.after_snapshot ? (
                        <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-48 overflow-auto border border-border/60 animate-fade-in">
                          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(maskSensitiveData(selectedEvent.after_snapshot), null, 2)}</pre>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">None (e.g. Deletion Event)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground font-semibold">
                Logged on {new Date(selectedEvent.created_at).toLocaleString()}
              </span>

              <div className="flex gap-2">
                {selectedEvent.undone_at ? (
                  <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Undone Action
                  </div>
                ) : selectedEvent.undo_available ? (
                  <button
                    onClick={() => setConfirmUndoEvent(selectedEvent)}
                    disabled={undoingEventId !== null}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650/40 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    {undoingEventId === selectedEvent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Undo Action Change
                  </button>
                ) : (
                  <div className="text-[10.5px] text-muted-foreground/90 font-bold bg-muted border border-border/80 px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm" title={getUndoUnavailableReason(selectedEvent)}>
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Undo Status: {getUndoUnavailableReason(selectedEvent)}</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmUndoEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setConfirmUndoEvent(null)}></div>
          <div className="relative bg-card solid-panel border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 z-10">
            <div className="flex items-center gap-3 text-rose-500">
              <RotateCcw className="w-6 h-6 shrink-0 text-indigo-500" />
              <h3 className="text-base font-bold text-foreground">Confirm Action Reversal</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to revert the changes performed by this action?
            </p>

            <div className="p-3 bg-muted rounded-xl space-y-1.5 text-xs border border-border/40">
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Description</span>
                <strong className="text-foreground">{confirmUndoEvent.description}</strong>
              </div>
              {confirmUndoEvent.entity_label && (
                <div className="pt-1.5 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Target Entity</span>
                  <span className="text-foreground font-semibold">{confirmUndoEvent.entity_label}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/40 mt-1.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Category</span>
                  <span className="text-foreground font-semibold">{confirmUndoEvent.action_category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Entity Type</span>
                  <span className="text-foreground font-semibold uppercase tracking-wider text-[10px]">{confirmUndoEvent.entity_type}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-normal">
              Warning: This will perform database restoration actions. A new log event will be created to maintain audit integrity.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmUndoEvent(null)}
                className="px-4 py-2 text-xs font-bold text-foreground bg-card border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUndo(confirmUndoEvent.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
              >
                Confirm Undo
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
