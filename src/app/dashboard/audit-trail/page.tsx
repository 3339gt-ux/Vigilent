'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
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
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { dbService } from '@/lib/db';
import { AuditTrailEvent } from '@/lib/types';

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

export default function AuditTrailPage() {
  const { user } = useApp();
  const router = useRouter();

  // Authentication & Authorization Gate
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // States
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedActor, setSelectedActor] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [undoableOnly, setUndoableOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected event for drawer
  const [selectedEvent, setSelectedEvent] = useState<AuditTrailEvent | null>(null);
  
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
    setError(null);
    try {
      const data = await dbService.getAuditTrailEvents();
      // Ensure sorted by created_at desc
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      console.error('Error fetching audit trail events:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve audit trail events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchEvents();
    }
  }, [isAuthorized]);

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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
  const handleExportCSV = () => {
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
      link.setAttribute('download', `vygilence-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setOperationStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'CSV export failed.'
      });
    }
  };

  // Export Filtered events to JSON
  const handleExportJSON = () => {
    try {
      if (filteredEvents.length === 0) {
        throw new Error('No events to export.');
      }

      const content = JSON.stringify(filteredEvents, null, 2);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vygilence-audit-trail-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setOperationStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'JSON export failed.'
      });
    }
  };

  // Render auth loading state
  if (isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-muted-foreground">Checking administrator permissions...</p>
      </div>
    );
  }

  // Render auth denied state
  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">Only Workspace Owners or Administrators can view the Audit Trail.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight" id="audit-trail-heading">Audit Trail</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Owner / Admin Only
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Organisation-level immutable log of user operations, configuration adjustments, and recoverable actions.
          </p>
        </div>

        {/* Exports */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Operation Toast Notification */}
      {operationStatus.type && (
        <div className={`p-4 border rounded-xl flex items-start gap-2.5 text-xs font-semibold shadow-md animate-in fade-in duration-300 ${
          operationStatus.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {operationStatus.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-655 dark:text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">
            <span>{operationStatus.message}</span>
          </div>
          <button onClick={() => setOperationStatus({ type: null, message: null })} className="p-1 hover:bg-muted rounded text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Events</span>
          <strong className="block text-2xl mt-1.5 font-extrabold text-foreground">{metrics.total}</strong>
          <span className="text-[9px] text-muted-foreground mt-1 block">immutable events logged</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Logged Today</span>
          <strong className="block text-2xl mt-1.5 font-extrabold text-foreground">{metrics.today}</strong>
          <span className="text-[9px] text-muted-foreground mt-1 block">within the current day</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Last 7 Days</span>
          <strong className="block text-2xl mt-1.5 font-extrabold text-foreground">{metrics.last7Days}</strong>
          <span className="text-[9px] text-muted-foreground mt-1 block">week-to-date velocity</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Recoverable (Undo)</span>
          <strong className="block text-2xl mt-1.5 font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.recoverable}</strong>
          <span className="text-[9px] text-muted-foreground mt-1 block">active restore snapshots</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">High-Risk Changes</span>
          <strong className="block text-2xl mt-1.5 font-extrabold text-rose-500">{metrics.highRisk}</strong>
          <span className="text-[9px] text-muted-foreground mt-1 block">critical and warnings</span>
        </div>
      </div>

      {/* Filtering Section */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-1.5 pb-2.5 border-b border-border/70">
          <Filter className="w-4.5 h-4.5 text-indigo-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Advanced Query Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Search bar */}
          <div className="space-y-1">
            <label htmlFor="search-input" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Search Description / Actor / Entity</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search description, user or label..."
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label htmlFor="category-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Actor */}
          <div className="space-y-1">
            <label htmlFor="actor-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Actor / User</label>
            <select
              id="actor-select"
              value={selectedActor}
              onChange={e => setSelectedActor(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
            >
              <option value="All">All Users</option>
              {uniqueActors.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div className="space-y-1">
            <label htmlFor="action-type-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Action Type</label>
            <select
              id="action-type-select"
              value={selectedActionType}
              onChange={e => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
            >
              <option value="All">All Actions</option>
              {uniqueActionTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date range start */}
          <div className="space-y-1">
            <label htmlFor="start-date" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Start Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
              />
            </div>
          </div>

          {/* Date range end */}
          <div className="space-y-1">
            <label htmlFor="end-date" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">End Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
              />
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-1">
            <label htmlFor="severity-select" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Severity</label>
            <select
              id="severity-select"
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium"
            >
              <option value="All">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Controls toggle & clear */}
          <div className="flex flex-col justify-end space-y-2">
            <div className="flex items-center gap-2 select-none h-9">
              <input
                id="undoable-only-toggle"
                type="checkbox"
                checked={undoableOnly}
                onChange={e => setUndoableOnly(e.target.checked)}
                className="accent-indigo-650 w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
              <label htmlFor="undoable-only-toggle" className="text-xs font-bold text-foreground cursor-pointer">
                Undo Available Only
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-semibold">
            Showing <strong className="text-foreground">{filteredEvents.length}</strong> event{filteredEvents.length === 1 ? '' : 's'} of <strong className="text-foreground">{events.length}</strong> total logs
          </span>

          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
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
          <div className="text-center py-20 px-6 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2.5">
            <ShieldAlert className="w-10 h-10 text-muted-foreground/45" />
            <span className="font-bold text-foreground text-sm">No Audit Trail Events Found</span>
            <p className="max-w-xs leading-relaxed">
              {events.length === 0
                ? 'No activities have been recorded in this company organization workspace yet.'
                : 'No logs match the selected advanced filter criteria. Try clearing them.'}
            </p>
            {events.length > 0 && (
              <button onClick={clearFilters} className="mt-2 px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg shadow-md shadow-indigo-600/10">
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {/* Table layout on medium screens, list layout on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider select-none">
                    <th className="p-3.5 pl-4">Timestamp</th>
                    <th className="p-3.5">Actor / User</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Action Logged</th>
                    <th className="p-3.5">Affected Entity</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5 pr-4 text-center">Undo Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedEvents.map(e => {
                    const actorName = e.actor_name || e.actor_email || 'System';
                    const eventTime = new Date(e.created_at).toLocaleString();
                    
                    // Severity classes
                    const severityClass =
                      e.severity === 'critical'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        : e.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-600 dark:text-indigo-400';

                    return (
                      <tr
                        key={e.id}
                        onClick={() => {
                          setSelectedEvent(e);
                          setOperationStatus({ type: null, message: null });
                        }}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 pl-4 font-semibold text-muted-foreground whitespace-nowrap">
                          {eventTime}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground truncate max-w-[140px]" title={actorName}>
                              {actorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {e.actor_role || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-bold text-muted-foreground">
                          {e.action_category}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-foreground truncate max-w-[200px]" title={e.action_type}>
                              {e.action_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-[250px]" title={e.description}>
                              {e.description}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {e.entity_label ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground truncate max-w-[160px]" title={e.entity_label}>
                                {e.entity_label}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                {e.entity_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${severityClass}`}>
                            {e.severity}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap" onClick={opt => opt.stopPropagation()}>
                          {e.undone_at ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Undone
                            </span>
                          ) : e.undo_available ? (
                            <button
                              onClick={() => handleUndo(e.id)}
                              disabled={undoingEventId !== null}
                              className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650/40 text-[9px] text-white font-bold uppercase tracking-wider flex items-center gap-0.5 mx-auto transition-colors cursor-pointer"
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
          {/* Backdrop click closes drawer */}
          <div className="absolute inset-0" onClick={() => setSelectedEvent(null)}></div>
          
          {/* Drawer container */}
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
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-normal">
              {/* Event Description Panel */}
              <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
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
              ) : selectedEvent.action_type === 'undo_executed' && selectedEvent.metadata ? (
                <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <span className="text-[9px] font-bold uppercase text-foreground tracking-wider block border-b border-border/60 pb-1.5">Undo Transaction Metadata</span>
                  <div className="font-mono bg-muted p-3 rounded-lg text-[10px] max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(maskSensitiveData(selectedEvent.metadata), null, 2)}</pre>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Before State</span>
                      {selectedEvent.before_snapshot ? (
                        <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-48 overflow-y-auto border border-border/60">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(maskSensitiveData(selectedEvent.before_snapshot), null, 2)}</pre>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">None (e.g. Creation Event)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">After State</span>
                      {selectedEvent.after_snapshot ? (
                        <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-48 overflow-y-auto border border-border/60">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(maskSensitiveData(selectedEvent.after_snapshot), null, 2)}</pre>
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
                    <CheckCircle2 className="w-4 h-4" /> Undone Action
                  </div>
                ) : selectedEvent.undo_available ? (
                  <button
                    onClick={() => handleUndo(selectedEvent.id)}
                    disabled={undoingEventId !== null}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-650/40 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    {undoingEventId === selectedEvent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Undo Action Change
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic font-semibold border border-border/80 px-3 py-2 rounded-lg bg-card">
                    Undo Not Available
                  </span>
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
    </div>
  );
}
