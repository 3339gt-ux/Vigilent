'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  ClipboardList, 
  FileSpreadsheet, 
  User, 
  UserCheck, 
  FolderLock, 
  FolderArchive, 
  BarChart3, 
  History, 
  ExternalLink,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { dbService } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { GlobalSearchResult } from '@/lib/types';

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Requirements', value: 'requirements' },
  { label: 'Actions', value: 'actions' },
  { label: 'People', value: 'people' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Competencies', value: 'competencies' },
  { label: 'Audit Packs', value: 'audit-packs' },
  { label: 'Reports', value: 'reports' },
  { label: 'Assets', value: 'assets' },
  { label: 'Audit Trail', value: 'audit-trail', adminOnly: true }
];

const sortOptions = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Recent', value: 'recent' },
  { label: 'Type', value: 'type' },
  { label: 'Status', value: 'status' }
];

const getTypeIcon = (type: GlobalSearchResult['type']) => {
  switch (type) {
    case 'requirement': return <ClipboardList className="w-3.5 h-3.5 text-purple-500" />;
    case 'action': return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
    case 'person': return <User className="w-3.5 h-3.5 text-cyan-500" />;
    case 'competency_type': return <UserCheck className="w-3.5 h-3.5 text-amber-500" />;
    case 'document': return <FolderLock className="w-3.5 h-3.5 text-blue-500" />;
    case 'audit_pack': return <FolderArchive className="w-3.5 h-3.5 text-indigo-500" />;
    case 'report': return <BarChart3 className="w-3.5 h-3.5 text-slate-500" />;
    case 'audit_trail_event': return <History className="w-3.5 h-3.5 text-rose-500" />;
    case 'asset': return <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />;
    default: return <Search className="w-3.5 h-3.5" />;
  }
};

const getTypeLabel = (type: GlobalSearchResult['type']) => {
  switch (type) {
    case 'requirement': return 'Requirement';
    case 'action': return 'Gap Action';
    case 'person': return 'Person';
    case 'competency_type': return 'Competency';
    case 'document': return 'Evidence Vault File';
    case 'audit_pack': return 'Audit Pack';
    case 'report': return 'Report';
    case 'audit_trail_event': return 'Audit Event';
    case 'asset': return 'Asset';
    default: return type;
  }
};

const getBadgeStyle = (type: GlobalSearchResult['type']) => {
  switch (type) {
    case 'requirement': return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
    case 'action': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'person': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400';
    case 'competency_type': return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
    case 'document': return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    case 'audit_pack': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
    case 'report': return 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400';
    case 'audit_trail_event': return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
    case 'asset': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
    default: return 'bg-muted border-border text-muted-foreground';
  }
};

export function GlobalSearchPanel({ dropdownAlign = 'sm:right-0 sm:top-full sm:mt-2' }: { dropdownAlign?: string }) {
  const { 
    user, 
    frameworkRequirements, 
    actions, 
    people, 
    competencyTypes, 
    documents, 
    auditPacks,
    assets
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSort, setActiveSort] = useState('relevance');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';
  const isDemo = process.env.NEXT_PUBLIC_VIGILEN_APP_MODE === 'demo';

  // Toggle panel open/close
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        togglePanel();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePanel]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setFocusedIdx(-1);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounce query (1-second delay)
  useEffect(() => {
    if (query.trim().length < 2) {
      setDebouncedQuery('');
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 1000);
    return () => clearTimeout(timer);
  }, [query]);

  // Client-side local search fallback for demo mode
  const searchLocal = useCallback(async (q: string, tab: string, sort: string): Promise<GlobalSearchResult[]> => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    const localResults: GlobalSearchResult[] = [];

    const getRelevance = (title: string, desc: string | null): number => {
      const t = title.toLowerCase();
      const d = (desc || '').toLowerCase();
      if (t === term) return 100;
      if (t.startsWith(term)) return 80;
      if (t.includes(term)) return 60;
      if (d.includes(term)) return 40;
      return 20;
    };

    // Requirements
    if (tab === 'all' || tab === 'requirements') {
      const matches = frameworkRequirements.filter(r => 
        (r.lifecycle_status || 'ACTIVE') === 'ACTIVE' &&
        ((r.title || '').toLowerCase().includes(term) || 
         (r.description || '').toLowerCase().includes(term) || 
         (r.category || '').toLowerCase().includes(term))
      );
      localResults.push(...matches.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || null,
        type: 'requirement' as const,
        status: r.status || 'GREY',
        category: r.category || 'General',
        path: `/dashboard/requirements?selected=${r.id}`,
        relevanceScore: getRelevance(r.title, r.description),
        additionalInfo: { created_at: r.created_at }
      })));
    }

    // Actions
    if (tab === 'all' || tab === 'actions') {
      const matches = actions.filter(a => 
        (a.title || '').toLowerCase().includes(term) || 
        (a.description || '').toLowerCase().includes(term) || 
        (a.owner || '').toLowerCase().includes(term)
      );
      localResults.push(...matches.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description || null,
        type: 'action' as const,
        status: a.status || 'Open',
        category: 'Action Item',
        path: `/dashboard/requirements?selectedAction=${a.id}`,
        relevanceScore: getRelevance(a.title, a.description),
        additionalInfo: { owner: a.owner, created_at: a.created_at }
      })));
    }

    // People
    if (tab === 'all' || tab === 'people') {
      const matches = people.filter(p => 
        p.active &&
        ((p.display_name || '').toLowerCase().includes(term) || 
         (p.first_name || '').toLowerCase().includes(term) || 
         (p.last_name || '').toLowerCase().includes(term) || 
         (p.email || '').toLowerCase().includes(term) || 
         (p.department || '').toLowerCase().includes(term) || 
         (p.role || '').toLowerCase().includes(term))
      );
      localResults.push(...matches.map(p => ({
        id: p.id,
        title: p.display_name || `${p.first_name} ${p.last_name}`,
        description: p.email ? `Email: ${p.email} | Department: ${p.department || 'N/A'}` : `Department: ${p.department || 'N/A'}`,
        type: 'person' as const,
        status: p.active ? 'Active' : 'Inactive',
        category: p.role || 'Personnel',
        path: `/dashboard/competencies?person=${p.id}`,
        relevanceScore: getRelevance(p.display_name || `${p.first_name} ${p.last_name}`, p.email || ''),
        additionalInfo: { created_at: p.created_at }
      })));
    }

    // Competencies
    if (tab === 'all' || tab === 'competencies') {
      const matches = competencyTypes.filter(c => 
        c.active &&
        ((c.title || '').toLowerCase().includes(term) || 
         (c.category || '').toLowerCase().includes(term) || 
         (c.description || '').toLowerCase().includes(term))
      );
      localResults.push(...matches.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description || null,
        type: 'competency_type' as const,
        status: 'Active',
        category: c.category || 'Other',
        path: `/dashboard/competencies?competency=${c.id}`,
        relevanceScore: getRelevance(c.title, c.description),
        additionalInfo: { created_at: c.created_at }
      })));
    }

    // Evidence Documents (metadata only)
    if (tab === 'all' || tab === 'evidence') {
      const matches = documents.filter(d => 
        d.status !== 'deleted' &&
        ((d.title || '').toLowerCase().includes(term) || 
         (d.original_file_name || d.file_name || '').toLowerCase().includes(term) || 
         (d.category || '').toLowerCase().includes(term))
      );
      localResults.push(...matches.map(d => ({
        id: d.id,
        title: d.title,
        description: `File: ${d.original_file_name || d.file_name}`,
        type: 'document' as const,
        status: d.status || 'Active',
        category: d.category || 'General',
        path: `/dashboard/vault?document=${d.id}`,
        relevanceScore: getRelevance(d.title, d.original_file_name || d.file_name),
        additionalInfo: { created_at: d.created_at }
      })));
    }

    // Audit Packs
    if (tab === 'all' || tab === 'audit-packs') {
      const matches = auditPacks.filter(ap => 
        (ap.name || '').toLowerCase().includes(term) || 
        (ap.description || '').toLowerCase().includes(term)
      );
      localResults.push(...matches.map(ap => ({
        id: ap.id,
        title: ap.name,
        description: ap.description || null,
        type: 'audit_pack' as const,
        status: ap.status || 'Draft',
        category: 'Audit Pack',
        path: `/dashboard/audit-packs?pack=${ap.id}`,
        relevanceScore: getRelevance(ap.name, ap.description),
        additionalInfo: { created_at: ap.created_at }
      })));
    }

    // Reports
    if (tab === 'all' || tab === 'reports') {
      try {
        const reportsList = await dbService.getSavedReports();
        const matches = reportsList.filter(sr => 
          (sr.name || '').toLowerCase().includes(term) || 
          (sr.description || '').toLowerCase().includes(term)
        );
        localResults.push(...matches.map(sr => ({
          id: sr.id,
          title: sr.name,
          description: sr.description || `Data source: ${sr.data_source}`,
          type: 'report' as const,
          status: 'Saved',
          category: sr.report_type,
          path: `/dashboard/reports/detail?report=${sr.id}`,
          relevanceScore: getRelevance(sr.name, sr.description),
          additionalInfo: { created_at: sr.created_at }
        })));
      } catch (e) {
        console.warn('Failed search local reports:', e);
      }
    }

    // Audit Trail
    if (isOwnerOrAdmin && (tab === 'all' || tab === 'audit-trail')) {
      try {
        const trail = await dbService.getAuditTrailEvents();
        const matches = trail.filter(ate => 
          (ate.description || '').toLowerCase().includes(term) || 
          (ate.action_type || '').toLowerCase().includes(term) || 
          (ate.action_category || '').toLowerCase().includes(term) || 
          (ate.entity_label || '').toLowerCase().includes(term)
        );
        localResults.push(...matches.map(ate => ({
          id: ate.id,
          title: ate.description,
          description: `Action: ${ate.action_type} | Category: ${ate.action_category}`,
          type: 'audit_trail_event' as const,
          status: ate.severity || 'info',
          category: 'Audit Trail',
          path: `/dashboard/audit-trail?event=${ate.id}`,
          relevanceScore: getRelevance(ate.description, ate.action_type),
          additionalInfo: { created_at: ate.created_at }
        })));
      } catch (e) {
        console.warn('Failed search local audit trail:', e);
      }
    }

    // Assets
    if (tab === 'all' || tab === 'assets') {
      const matches = (assets || []).filter(a => 
        (a.status || 'active') === 'active' &&
        ((a.name || '').toLowerCase().includes(term) || 
         (a.asset_type || '').toLowerCase().includes(term) || 
         (a.registration_number || '').toLowerCase().includes(term) || 
         (a.make || '').toLowerCase().includes(term) || 
         (a.model || '').toLowerCase().includes(term))
      );
      localResults.push(...matches.map(a => ({
        id: a.id,
        title: a.name,
        description: `Reg: ${a.registration_number || 'N/A'} | Type: ${a.asset_type} | Make/Model: ${a.make || ''} ${a.model || ''}`,
        type: 'asset' as const,
        status: 'Active',
        category: a.asset_type,
        path: `/dashboard/matrix?asset=${a.id}`,
        relevanceScore: getRelevance(a.name, a.registration_number),
        additionalInfo: { created_at: a.created_at }
      })));
    }

    // Sort
    if (sort === 'recent') {
      localResults.sort((a, b) => {
        const dateA = new Date(a.additionalInfo?.created_at || 0).getTime();
        const dateB = new Date(b.additionalInfo?.created_at || 0).getTime();
        return dateB - dateA;
      });
    } else if (sort === 'type') {
      localResults.sort((a, b) => a.type.localeCompare(b.type));
    } else if (sort === 'status') {
      localResults.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      localResults.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return a.title.localeCompare(b.title);
      });
    }

    return localResults.slice(0, 50);
  }, [frameworkRequirements, actions, people, competencyTypes, documents, auditPacks, isOwnerOrAdmin]);

  // Main Search Fetch Effect
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    // Create an AbortController to discard stale network responses
    const controller = new AbortController();
    const { signal } = controller;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      setFocusedIdx(-1);

      try {
        if (isDemo || !isSupabaseConfigured) {
          // Local Search Fallback
          const localData = await searchLocal(debouncedQuery, activeTab, activeSort);
          if (!signal.aborted) {
            setResults(localData);
          }
        } else {
          // Production Server-Side Search
          const session = supabase ? (await supabase.auth.getSession()).data.session : null;
          const token = session?.access_token || '';

          const url = `/api/global-search?q=${encodeURIComponent(debouncedQuery)}&type=${activeTab}&sort=${activeSort}`;
          const response = await fetch(url, {
            signal,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Search request failed with status: ${response.status}`);
          }

          const data = await response.json();
          if (!signal.aborted) {
            if (data.error) {
              throw new Error(data.error);
            }
            setResults(data.results || []);
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Global search failed:', err);
          setError(err instanceof Error ? err.message : 'An error occurred during search.');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      controller.abort(); // Cancel previous request
    };
  }, [debouncedQuery, activeTab, activeSort, isDemo, searchLocal]);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(prev => {
        const next = prev + 1 >= results.length ? 0 : prev + 1;
        scrollToResult(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(prev => {
        const next = prev - 1 < 0 ? results.length - 1 : prev - 1;
        scrollToResult(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (focusedIdx >= 0 && focusedIdx < results.length) {
        e.preventDefault();
        openResult(results[focusedIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollToResult = (idx: number) => {
    if (!resultsRef.current) return;
    const element = resultsRef.current.children[idx] as HTMLElement;
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  };

  const openResult = (result: GlobalSearchResult) => {
    // Open in a new tab with noopener noreferrer, preserving current search state
    window.open(result.path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={togglePanel}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold tracking-wide transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500"
        aria-label="Search compliance records"
        title="Search workspace (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border/80 bg-card px-1 font-mono text-[9px] font-bold text-muted-foreground select-none">
          Ctrl K
        </kbd>
      </button>

      {/* Pop-down panel */}
      {isOpen && (
        <div className={`fixed left-4 right-4 top-28 w-auto sm:absolute sm:left-auto sm:w-[min(38rem,calc(100vw-2rem))] ${dropdownAlign} bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200 flex flex-col text-xs`}>
          {/* Header Input */}
          <div className="p-3 border-b border-border/70 flex items-center gap-2 bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search requirements, actions, people, competency types, evidence..."
              className="flex-1 bg-transparent border-none outline-none text-foreground text-xs font-semibold placeholder:text-muted-foreground/80 leading-normal"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 py-1.5 border-b border-border/50 flex items-center justify-between bg-muted/10">
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
              {filterTabs
                .filter(tab => !tab.adminOnly || isOwnerOrAdmin)
                .map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={`px-2 py-0.75 rounded-md text-[10px] font-bold border transition-colors shrink-0 cursor-pointer ${
                      activeTab === tab.value
                        ? 'bg-indigo-650 text-white border-indigo-750 shadow-sm'
                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-border/75 pl-2 shrink-0">
              <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
              <select
                value={activeSort}
                onChange={e => setActiveSort(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Sort search results"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body results list */}
          <div 
            ref={resultsRef}
            className="max-h-[30rem] overflow-y-auto p-2 space-y-1.5 no-scrollbar"
          >
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Searching workspace...</span>
              </div>
            )}

            {!isLoading && error && (
              <div className="p-6 text-center text-rose-600 font-semibold bg-rose-500/5 border border-rose-500/10 rounded-xl">
                {error}
              </div>
            )}

            {!isLoading && !error && query.trim().length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl font-medium">
                No matching records found for &quot;<span className="font-bold text-foreground">{query}</span>&quot; in this organisation.
              </div>
            )}

            {!isLoading && !error && query.trim().length < 2 && (
              <div className="p-8 text-center text-muted-foreground/80 leading-relaxed font-semibold">
                Type at least two characters to search workspace record metadata.<br />
                <span className="text-[10px] text-muted-foreground/60 block mt-1">
                  Note: Evidence files are searched by name and category (content text is not indexed).
                </span>
              </div>
            )}

            {!isLoading && !error && results.length > 0 && results.map((result, idx) => {
              const isFocused = idx === focusedIdx;
              return (
                <button
                  type="button"
                  key={`${result.type}-${result.id}`}
                  onClick={() => openResult(result)}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-start justify-between gap-3 ${
                    isFocused
                      ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-border/40 bg-transparent hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 p-1 bg-muted rounded-lg shrink-0">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-foreground leading-snug truncate">
                        {result.title}
                      </h4>
                      {result.description && (
                        <p className="text-[10.5px] text-muted-foreground leading-normal mt-0.5 line-clamp-1 font-medium">
                          {result.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[9px] font-bold text-muted-foreground">
                        <span className={`px-1.5 py-0.25 rounded border uppercase ${getBadgeStyle(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                        {result.category && (
                          <span className="px-1 bg-muted/60 border border-border/60 rounded">
                            {result.category}
                          </span>
                        )}
                        {result.status && (
                          <span className={`px-1 rounded border uppercase ${
                            result.status === 'GREEN' || result.status === 'Active' || result.status === 'Compliant' || result.status === 'info'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                            result.status === 'AMBER' || result.status === 'Expiring Soon' || result.status === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                            result.status === 'RED' || result.status === 'Expired' || result.status === 'critical'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                            'bg-muted border-border/80'
                          }`}>
                            {result.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer controls hint */}
          {!isLoading && !error && results.length > 0 && (
            <div className="p-2 border-t border-border/50 bg-muted/10 text-[10px] text-muted-foreground flex justify-between items-center select-none font-medium">
              <span>Found {results.length} record{results.length === 1 ? '' : 's'} matching.</span>
              <span className="hidden sm:inline">
                Use <kbd className="font-mono bg-card border border-border px-0.5 rounded">↑</kbd> <kbd className="font-mono bg-card border border-border px-0.5 rounded">↓</kbd> to navigate, <kbd className="font-mono bg-card border border-border px-0.5 rounded">Enter</kbd> to open.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
