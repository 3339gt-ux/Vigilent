'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Star,
  Search,
  ExternalLink,
  Trash2,
  Bookmark,
  Award,
  FileText,
  Sliders,
  FolderOpen,
  Filter,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface FavouriteItem {
  id: string;
  key: string;
  module: 'matrix' | 'evidence-matrix' | 'requirements' | 'vault';
  moduleLabel: string;
  type: 'Requirement' | 'Evidence Document' | 'Competency Type' | 'Category' | 'Filter' | 'Saved View';
  title: string;
  subtitle: string;
  details: string;
  link: string;
  status: string | null;
  viewId?: string; // only for saved views
}

type TabType = 'all' | 'requirements' | 'evidence' | 'competencies' | 'filters' | 'views';
type SortOption = 'name' | 'module' | 'type';

export default function FavouritesPage() {
  const {
    user,
    organization,
    frameworkRequirements,
    documents,
    competencyTypes
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Favourites state from localStorage
  const [matrixFavourites, setMatrixFavourites] = useState<string[]>([]);
  const [evidenceMatrixFavourites, setEvidenceMatrixFavourites] = useState<string[]>([]);
  const [requirementsFavourites, setRequirementsFavourites] = useState<string[]>([]);
  const [vaultFavourites, setVaultFavourites] = useState<string[]>([]);

  // Saved views states from localStorage
  const [matrixSavedViews, setMatrixSavedViews] = useState<any[]>([]);
  const [evidenceMatrixSavedViews, setEvidenceMatrixSavedViews] = useState<any[]>([]);
  const [requirementsSavedViews, setRequirementsSavedViews] = useState<any[]>([]);
  const [vaultSavedViews, setVaultSavedViews] = useState<any[]>([]);

  const userId = user?.id || 'guest';
  const orgId = organization?.id || 'workspace';

  const loadAllFavourites = () => {
    if (typeof window === 'undefined') return;

    const parseJson = (key: string, fallback: any) => {
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
      } catch (e) {
        console.warn('Error reading key:', key, e);
        return fallback;
      }
    };

    setMatrixFavourites(parseJson(`vygilence_filter_favourites_${userId}_${orgId}_matrix`, []));
    setEvidenceMatrixFavourites(parseJson(`vygilence_filter_favourites_${userId}_${orgId}_evidence-matrix`, []));
    setRequirementsFavourites(parseJson(`vygilence_filter_favourites_${userId}_${orgId}_requirements`, []));
    setVaultFavourites(parseJson(`vygilence_filter_favourites_${userId}_${orgId}_vault`, []));

    setMatrixSavedViews(parseJson(`vygilence_saved_views_${userId}_${orgId}_matrix`, []));
    setEvidenceMatrixSavedViews(parseJson(`vygilence_saved_views_${userId}_${orgId}_evidence-matrix`, []));
    setRequirementsSavedViews(parseJson(`vygilence_saved_views_${userId}_${orgId}_requirements`, []));
    setVaultSavedViews(parseJson(`vygilence_saved_views_${userId}_${orgId}_vault`, []));
  };

  useEffect(() => {
    if (userId && orgId) {
      loadAllFavourites();
    }
  }, [userId, orgId]);

  // Handle unstarring of standard favourite filter/keys
  const handleUnstar = (module: 'matrix' | 'evidence-matrix' | 'requirements' | 'vault', key: string) => {
    if (typeof window === 'undefined') return;
    const localStorageKey = `vygilence_filter_favourites_${userId}_${orgId}_${module}`;
    try {
      const stored = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      const next = stored.filter((x: string) => x !== key);
      localStorage.setItem(localStorageKey, JSON.stringify(next));
      loadAllFavourites();
    } catch (e) {
      console.error('Failed to unstar item', e);
    }
  };

  // Handle deleting custom saved views
  const handleDeleteSavedView = (module: 'matrix' | 'evidence-matrix' | 'requirements' | 'vault', viewId: string) => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Are you sure you want to delete this custom saved view?')) return;
    const localStorageKey = `vygilence_saved_views_${userId}_${orgId}_${module}`;
    try {
      const stored = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      const next = stored.filter((v: any) => v.id !== viewId);
      localStorage.setItem(localStorageKey, JSON.stringify(next));
      loadAllFavourites();
    } catch (e) {
      console.error('Failed to delete saved view', e);
    }
  };

  // Map favourites strings to concrete objects
  const consolidatedItems = useMemo(() => {
    const items: FavouriteItem[] = [];

    // 1. Competency Matrix module favourites ('matrix')
    matrixFavourites.forEach(favKey => {
      if (favKey.startsWith('comp:')) {
        const id = favKey.replace('comp:', '');
        const comp = competencyTypes.find(c => c.id === id);
        if (comp) {
          items.push({
            id: `matrix-comp-${id}`,
            key: favKey,
            module: 'matrix',
            moduleLabel: 'Competency Matrix',
            type: 'Competency Type',
            title: comp.title,
            subtitle: `Category: ${comp.category}`,
            details: `Renewal Period: ${comp.validity_period_months ? comp.validity_period_months + ' months' : 'No renewal'} | Risk Level: ${comp.default_risk_level || 'Standard'}`,
            link: '/dashboard/competencies',
            status: null
          });
        }
      } else if (favKey.startsWith('cat:')) {
        const cat = favKey.replace('cat:', '');
        items.push({
          id: `matrix-cat-${cat}`,
          key: favKey,
          module: 'matrix',
          moduleLabel: 'Competency Matrix',
          type: 'Category',
          title: cat,
          subtitle: 'Competency Category',
          details: 'Starred category filter',
          link: `/dashboard/competencies`,
          status: null
        });
      } else if (favKey.startsWith('dept:')) {
        const dept = favKey.replace('dept:', '');
        items.push({
          id: `matrix-dept-${dept}`,
          key: favKey,
          module: 'matrix',
          moduleLabel: 'Competency Matrix',
          type: 'Filter',
          title: dept,
          subtitle: 'Department Filter',
          details: 'Starred department filter',
          link: `/dashboard/competencies`,
          status: null
        });
      } else if (favKey.startsWith('role:')) {
        const role = favKey.replace('role:', '');
        items.push({
          id: `matrix-role-${role}`,
          key: favKey,
          module: 'matrix',
          moduleLabel: 'Competency Matrix',
          type: 'Filter',
          title: role,
          subtitle: 'Role Filter',
          details: 'Starred role filter',
          link: `/dashboard/competencies`,
          status: null
        });
      }
    });

    // 2. Evidence Matrix module favourites ('evidence-matrix')
    evidenceMatrixFavourites.forEach(favKey => {
      if (favKey.startsWith('req:')) {
        const id = favKey.replace('req:', '');
        const req = frameworkRequirements.find(r => r.id === id);
        if (req) {
          items.push({
            id: `evmatrix-req-${id}`,
            key: favKey,
            module: 'evidence-matrix',
            moduleLabel: 'Evidence Matrix',
            type: 'Requirement',
            title: req.title,
            subtitle: `Category: ${req.category}`,
            details: `Risk Level: ${req.risk_level || 'Standard'} | Frequency: ${req.review_frequency || 'Annual'}`,
            link: `/dashboard/matrix`,
            status: req.status
          });
        }
      } else if (favKey.startsWith('cat:')) {
        const cat = favKey.replace('cat:', '');
        items.push({
          id: `evmatrix-cat-${cat}`,
          key: favKey,
          module: 'evidence-matrix',
          moduleLabel: 'Evidence Matrix',
          type: 'Category',
          title: cat,
          subtitle: 'Requirement Category',
          details: 'Starred category filter',
          link: `/dashboard/matrix`,
          status: null
        });
      } else if (favKey.startsWith('target:')) {
        const target = favKey.replace('target:', '');
        items.push({
          id: `evmatrix-target-${target}`,
          key: favKey,
          module: 'evidence-matrix',
          moduleLabel: 'Evidence Matrix',
          type: 'Filter',
          title: target,
          subtitle: 'Asset Filter',
          details: 'Starred compliance target asset filter',
          link: `/dashboard/matrix`,
          status: null
        });
      }
    });

    // 3. Requirements module favourites ('requirements')
    requirementsFavourites.forEach(favKey => {
      if (favKey.startsWith('req:')) {
        const id = favKey.replace('req:', '');
        const req = frameworkRequirements.find(r => r.id === id);
        if (req) {
          items.push({
            id: `reqs-req-${id}`,
            key: favKey,
            module: 'requirements',
            moduleLabel: 'Requirements',
            type: 'Requirement',
            title: req.title,
            subtitle: `Category: ${req.category}`,
            details: `Risk Level: ${req.risk_level || 'Standard'} | Frequency: ${req.review_frequency || 'Annual'}`,
            link: `/dashboard/requirements`,
            status: req.status
          });
        }
      } else if (favKey.startsWith('cat:')) {
        const cat = favKey.replace('cat:', '');
        items.push({
          id: `reqs-cat-${cat}`,
          key: favKey,
          module: 'requirements',
          moduleLabel: 'Requirements',
          type: 'Category',
          title: cat,
          subtitle: 'Requirement Category',
          details: 'Starred category filter',
          link: `/dashboard/requirements`,
          status: null
        });
      } else if (favKey.startsWith('owner:')) {
        const owner = favKey.replace('owner:', '');
        items.push({
          id: `reqs-owner-${owner}`,
          key: favKey,
          module: 'requirements',
          moduleLabel: 'Requirements',
          type: 'Filter',
          title: owner,
          subtitle: 'Owner Filter',
          details: 'Starred owner filter',
          link: `/dashboard/requirements`,
          status: null
        });
      } else if (favKey.startsWith('status:')) {
        const statusVal = favKey.replace('status:', '');
        items.push({
          id: `reqs-status-${statusVal}`,
          key: favKey,
          module: 'requirements',
          moduleLabel: 'Requirements',
          type: 'Filter',
          title: statusVal,
          subtitle: 'Status Filter',
          details: 'Starred status filter bookmark',
          link: `/dashboard/requirements`,
          status: null
        });
      }
    });

    // 4. Evidence Vault module favourites ('vault')
    vaultFavourites.forEach(favKey => {
      if (favKey.startsWith('doc:')) {
        const id = favKey.replace('doc:', '');
        const doc = documents.find(d => d.id === id);
        if (doc) {
          items.push({
            id: `vault-doc-${id}`,
            key: favKey,
            module: 'vault',
            moduleLabel: 'Evidence Vault',
            type: 'Evidence Document',
            title: doc.title,
            subtitle: `Original File: ${doc.original_file_name || 'No file'}`,
            details: `Category: ${doc.category} | Expiry: ${doc.expiry_date || 'No Expiry'}`,
            link: `/dashboard/vault`,
            status: doc.status
          });
        }
      } else if (favKey.startsWith('cat:')) {
        const cat = favKey.replace('cat:', '');
        items.push({
          id: `vault-cat-${cat}`,
          key: favKey,
          module: 'vault',
          moduleLabel: 'Evidence Vault',
          type: 'Category',
          title: cat,
          subtitle: 'Evidence Category',
          details: 'Starred category filter',
          link: `/dashboard/vault`,
          status: null
        });
      }
    });

    // 5. Saved Views
    const addViews = (viewsList: any[], module: 'matrix' | 'evidence-matrix' | 'requirements' | 'vault', label: string, link: string) => {
      viewsList.forEach(view => {
        items.push({
          id: `view-${module}-${view.id}`,
          key: `view:${view.id}`,
          viewId: view.id,
          module,
          moduleLabel: label,
          type: 'Saved View',
          title: view.name,
          subtitle: 'Saved View Filter Config',
          details: `Active Filters: ${Object.keys(view.filters || {}).filter(k => view.filters[k] && view.filters[k] !== 'All').map(k => `${k}`).join(', ') || 'Default Preset'}`,
          link,
          status: null
        });
      });
    };

    addViews(matrixSavedViews, 'matrix', 'Competency Matrix', '/dashboard/competencies');
    addViews(evidenceMatrixSavedViews, 'evidence-matrix', 'Evidence Matrix', '/dashboard/matrix');
    addViews(requirementsSavedViews, 'requirements', 'Requirements', '/dashboard/requirements');
    addViews(vaultSavedViews, 'vault', 'Evidence Vault', '/dashboard/vault');

    return items;
  }, [
    matrixFavourites,
    evidenceMatrixFavourites,
    requirementsFavourites,
    vaultFavourites,
    matrixSavedViews,
    evidenceMatrixSavedViews,
    requirementsSavedViews,
    vaultSavedViews,
    frameworkRequirements,
    documents,
    competencyTypes
  ]);

  // Statistics counters
  const stats = useMemo(() => {
    const counts = {
      total: consolidatedItems.length,
      requirements: consolidatedItems.filter(i => i.type === 'Requirement').length,
      evidence: consolidatedItems.filter(i => i.type === 'Evidence Document').length,
      competencies: consolidatedItems.filter(i => i.type === 'Competency Type').length,
      filters: consolidatedItems.filter(i => i.type === 'Filter' || i.type === 'Category').length,
      views: consolidatedItems.filter(i => i.type === 'Saved View').length,
    };
    return counts;
  }, [consolidatedItems]);

  // Filter items by active tab and search query
  const filteredItems = useMemo(() => {
    return consolidatedItems
      .filter(item => {
        // Tab filtering
        if (activeTab === 'requirements') return item.type === 'Requirement';
        if (activeTab === 'evidence') return item.type === 'Evidence Document';
        if (activeTab === 'competencies') return item.type === 'Competency Type';
        if (activeTab === 'filters') return item.type === 'Filter' || item.type === 'Category';
        if (activeTab === 'views') return item.type === 'Saved View';
        return true;
      })
      .filter(item => {
        // Search filtering
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query) ||
          item.details.toLowerCase().includes(query) ||
          item.moduleLabel.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        // Sort configuration
        if (sortBy === 'module') {
          return a.moduleLabel.localeCompare(b.moduleLabel) || a.title.localeCompare(b.title);
        }
        if (sortBy === 'type') {
          return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
        }
        return a.title.localeCompare(b.title);
      });
  }, [consolidatedItems, activeTab, searchQuery, sortBy]);

  const getIcon = (type: FavouriteItem['type']) => {
    if (type === 'Requirement') return <CheckSquare className="w-4 h-4 text-indigo-500" />;
    if (type === 'Evidence Document') return <FileText className="w-4 h-4 text-emerald-500" />;
    if (type === 'Competency Type') return <Award className="w-4 h-4 text-orange-500" />;
    if (type === 'Saved View') return <Bookmark className="w-4 h-4 text-amber-500" />;
    return <Filter className="w-4 h-4 text-blue-500" />;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const base = "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-xs border ";
    if (status === 'GREEN' || status === 'Compliant') {
      return <span className={base + "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"}>Compliant</span>;
    }
    if (status === 'AMBER' || status === 'Expiring Soon') {
      return <span className={base + "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"}>Expiring</span>;
    }
    if (status === 'RED' || status === 'Expired' || status === 'Missing') {
      return <span className={base + "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"}>Gap / Expired</span>;
    }
    return <span className={base + "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400"}>{status}</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Favourites</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Starred records, categories, filters and saved views across your workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="text-2xl font-extrabold mt-1 text-foreground">{stats.total}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Requirements</span>
          <span className="text-2xl font-extrabold mt-1 text-indigo-600 dark:text-indigo-400">{stats.requirements}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Evidence Files</span>
          <span className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{stats.evidence}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Competencies</span>
          <span className="text-2xl font-extrabold mt-1 text-orange-600 dark:text-orange-400">{stats.competencies}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Filters / Views</span>
          <span className="text-2xl font-extrabold mt-1 text-amber-500">{stats.filters + stats.views}</span>
        </div>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card border border-border p-3 rounded-xl shadow-xs">
        {/* Search input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search favourites..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 text-foreground placeholder-muted-foreground"
          />
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
          >
            <option value="name">Alphabetical</option>
            <option value="module">Vygilence Module</option>
            <option value="type">Favourite Type</option>
          </select>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto no-scrollbar py-0.5">
        {(['all', 'requirements', 'evidence', 'competencies', 'filters', 'views'] as TabType[]).map(tab => {
          const isActive = activeTab === tab;
          const count =
            tab === 'all' ? stats.total :
            tab === 'requirements' ? stats.requirements :
            tab === 'evidence' ? stats.evidence :
            tab === 'competencies' ? stats.competencies :
            tab === 'filters' ? stats.filters :
            stats.views;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold capitalize transition-colors relative cursor-pointer border-b-2 -mb-px shrink-0 ${
                isActive
                  ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab === 'filters' ? 'Categories & Filters' : tab === 'views' ? 'Saved Views' : tab}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-indigo-650 text-white dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Favourites List / Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No matching favourites</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {consolidatedItems.length === 0
              ? 'No favourites yet. Star requirements, evidence, competency types or filters to build a focused workspace.'
              : 'Try adjusting your search query or tab filters to find what you are looking for.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-card border border-border hover:border-indigo-500/20 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex items-start justify-between gap-4 group relative overflow-hidden"
            >
              {/* Left Side Content */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40 leading-none">
                    {getIcon(item.type)}
                    {item.type}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {item.moduleLabel}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-foreground leading-normal truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed truncate mt-0.5">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-normal leading-relaxed truncate mt-1">
                    {item.details}
                  </p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-1 shrink-0 self-start">
                <Link
                  href={item.link}
                  className="p-2 bg-muted hover:bg-indigo-650 hover:text-white rounded-lg text-muted-foreground border border-border transition-all cursor-pointer"
                  title={`Go to ${item.moduleLabel}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => {
                    if (item.type === 'Saved View' && item.viewId) {
                      handleDeleteSavedView(item.module, item.viewId);
                    } else {
                      handleUnstar(item.module, item.key);
                    }
                  }}
                  className="p-2 bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg border border-border transition-all cursor-pointer"
                  title={item.type === 'Saved View' ? 'Delete custom view' : 'Remove from Favourites'}
                >
                  {item.type === 'Saved View' ? <Trash2 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5 fill-current text-amber-500" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
