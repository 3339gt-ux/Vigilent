'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
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
  AlertCircle,
  Clock,
  Archive,
  EyeOff,
  Sparkles,
  HelpCircle,
  X
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
  category: string;
  dueDate: string | null; // Unified due/review/expiry date for sorting/filtering
  viewId?: string; // only for saved views
}

type TabType = 'all' | 'requirements' | 'evidence' | 'competencies' | 'filters' | 'views';
type SortOption = 'name' | 'module' | 'status-priority' | 'date-soonest' | 'type';
type StatusFilterType = 'All' | 'current' | 'due-soon' | 'expired' | 'missing' | 'archived' | 'unknown';
type DateFilterType = 'All' | 'expired' | '7-days' | '30-days' | '90-days' | 'no-date';

export default function FavouritesPage() {
  const {
    user,
    organization,
    frameworkRequirements,
    documents,
    competencyTypes,
    readinessReport
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showActionableOnly, setShowActionableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { interfaceDetailLevel } = useInterfaceDetailLevel();

  const activeFiltersCount = useMemo(() => {
    return [
      statusFilter !== 'All',
      dateFilter !== 'All',
      categoryFilter !== 'All',
      showActionableOnly
    ].filter(Boolean).length;
  }, [statusFilter, dateFilter, categoryFilter, showActionableOnly]);

  // Modal & Toast states
  const [confirmItem, setConfirmItem] = useState<FavouriteItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

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

  useEffect(() => {
    if (!confirmItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmItem]);

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

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle unstarring of standard favourite filter/keys
  const handleUnstarConfirm = (item: FavouriteItem) => {
    if (typeof window === 'undefined') return;

    if (item.type === 'Saved View' && item.viewId) {
      const localStorageKey = `vygilence_saved_views_${userId}_${orgId}_${item.module}`;
      try {
        const stored = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const next = stored.filter((v: any) => v.id !== item.viewId);
        localStorage.setItem(localStorageKey, JSON.stringify(next));
        setToastType('success');
        setToastMessage('Removed from Favourites.');
        loadAllFavourites();
      } catch (e) {
        console.error('Failed to delete saved view', e);
        setToastType('error');
        setToastMessage('Failed to delete saved view. Please try again.');
      }
    } else {
      const localStorageKey = `vygilence_filter_favourites_${userId}_${orgId}_${item.module}`;
      try {
        const stored = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const next = stored.filter((x: string) => x !== item.key);
        localStorage.setItem(localStorageKey, JSON.stringify(next));
        setToastType('success');
        setToastMessage('Removed from Favourites.');
        loadAllFavourites();
      } catch (e) {
        console.error('Failed to unstar item', e);
        setToastType('error');
        setToastMessage('Failed to remove from Favourites. Please try again.');
      }
    }
    setConfirmItem(null);
  };

  // Map favourites strings to concrete objects
  const consolidatedItems = useMemo(() => {
    const items: FavouriteItem[] = [];

    // Helper to extract status from readiness engine report if available
    const getReqReadiness = (id: string) => {
      return readinessReport?.requirements?.find(r => r.requirement.id === id);
    };

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
            link: `/dashboard/competencies?filter=comp:${id}`,
            status: null,
            category: comp.category,
            dueDate: null
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
          details: 'Favourite category filter',
          link: `/dashboard/competencies?filter=cat:${cat}`,
          status: null,
          category: cat,
          dueDate: null
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
          details: 'Favourite department filter bookmark',
          link: `/dashboard/competencies`,
          status: null,
          category: 'Filters',
          dueDate: null
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
          details: 'Favourite role filter bookmark',
          link: `/dashboard/competencies`,
          status: null,
          category: 'Filters',
          dueDate: null
        });
      }
    });

    // 2. Evidence Matrix module favourites ('evidence-matrix')
    evidenceMatrixFavourites.forEach(favKey => {
      if (favKey.startsWith('req:')) {
        const id = favKey.replace('req:', '');
        const req = frameworkRequirements.find(r => r.id === id);
        const readiness = getReqReadiness(id);
        if (req) {
          const status = readiness ? readiness.status : req.status;
          const pct = readiness?.evidenceCoverage?.coveragePercent;
          const coverageText = pct !== undefined && pct !== null ? `${pct}% covered` : 'No criteria';
          items.push({
            id: `evmatrix-req-${id}`,
            key: favKey,
            module: 'evidence-matrix',
            moduleLabel: 'Evidence Matrix',
            type: 'Requirement',
            title: req.title,
            subtitle: `Category: ${req.category} | ${coverageText}`,
            details: `Risk Level: ${req.risk_level || 'Standard'} | Frequency: ${req.review_frequency || 'Annual'}`,
            link: `/dashboard/matrix?filter=req:${id}`,
            status,
            category: req.category,
            dueDate: req.next_due_date || req.review_date
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
          details: 'Favourite category filter',
          link: `/dashboard/matrix?filter=cat:${cat}`,
          status: null,
          category: cat,
          dueDate: null
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
          details: 'Favourite compliance target asset filter bookmark',
          link: `/dashboard/matrix?filter=target:${target}`,
          status: null,
          category: 'Filters',
          dueDate: null
        });
      }
    });

    // 3. Requirements module favourites ('requirements')
    requirementsFavourites.forEach(favKey => {
      if (favKey.startsWith('req:')) {
        const id = favKey.replace('req:', '');
        const req = frameworkRequirements.find(r => r.id === id);
        const readiness = getReqReadiness(id);
        if (req) {
          const status = readiness ? readiness.status : req.status;
          const pct = readiness?.evidenceCoverage?.coveragePercent;
          const coverageText = pct !== undefined && pct !== null ? `${pct}% covered` : 'No criteria';
          items.push({
            id: `reqs-req-${id}`,
            key: favKey,
            module: 'requirements',
            moduleLabel: 'Requirements',
            type: 'Requirement',
            title: req.title,
            subtitle: `Category: ${req.category} | ${coverageText}`,
            details: `Risk Level: ${req.risk_level || 'Standard'} | Frequency: ${req.review_frequency || 'Annual'}`,
            link: `/dashboard/requirements?id=${id}`,
            status,
            category: req.category,
            dueDate: req.next_due_date || req.review_date
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
          details: 'Favourite category filter',
          link: `/dashboard/requirements?category=${cat}`,
          status: null,
          category: cat,
          dueDate: null
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
          details: 'Favourite owner filter',
          link: `/dashboard/requirements`,
          status: null,
          category: 'Filters',
          dueDate: null
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
          details: 'Favourite status filter bookmark',
          link: `/dashboard/requirements?status=${statusVal}`,
          status: null,
          category: 'Filters',
          dueDate: null
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
            subtitle: `File: ${doc.original_file_name || 'No filename'}`,
            details: `Category: ${doc.category} | Expiry: ${doc.expiry_date || 'No Expiry'}`,
            link: `/dashboard/vault?id=${id}`,
            status: doc.archived_at ? 'Archived' : doc.status,
            category: doc.category,
            dueDate: doc.expiry_date
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
          details: 'Favourite category filter',
          link: `/dashboard/vault`,
          status: null,
          category: cat,
          dueDate: null
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
          status: null,
          category: 'Saved Views',
          dueDate: null
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
    competencyTypes,
    readinessReport
  ]);

  // Extract unique categories for category filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    consolidatedItems.forEach(item => {
      if (item.category && item.category !== 'Filters' && item.category !== 'Saved Views') {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [consolidatedItems]);

  // Unified status category helper
  const getSemanticStatus = (item: FavouriteItem): StatusFilterType => {
    const status = item.status;
    if (item.type === 'Saved View') return 'current';
    if (!status) {
      if (item.dueDate) return 'due-soon';
      return 'unknown';
    }
    if (status === 'GREEN' || status === 'Compliant' || status === 'Active') return 'current';
    if (status === 'AMBER' || status === 'Expiring Soon') return 'due-soon';
    if (status === 'RED' || status === 'Expired') return 'expired';
    if (status === 'Missing') return 'missing';
    if (status === 'Archived' || status === 'Inactive') return 'archived';
    return 'unknown';
  };

  // Statistics counters
  const stats = useMemo(() => {
    const today = new Date();
    const counts = {
      total: consolidatedItems.length,
      requirements: consolidatedItems.filter(i => i.type === 'Requirement').length,
      evidence: consolidatedItems.filter(i => i.type === 'Evidence Document').length,
      competencies: consolidatedItems.filter(i => i.type === 'Competency Type').length,
      filters: consolidatedItems.filter(i => i.type === 'Filter' || i.type === 'Category').length,
      views: consolidatedItems.filter(i => i.type === 'Saved View').length,

      // Attention filters
      dueSoon: consolidatedItems.filter(item => {
        const semantic = getSemanticStatus(item);
        if (semantic === 'due-soon') return true;
        if (item.dueDate) {
          const diff = Math.ceil((new Date(item.dueDate).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
          return diff >= 0 && diff <= 30;
        }
        return false;
      }).length,
      expiredOrMissing: consolidatedItems.filter(item => {
        const semantic = getSemanticStatus(item);
        return semantic === 'expired' || semantic === 'missing';
      }).length,
    };
    return counts;
  }, [consolidatedItems]);

  // Filter items by active tab, search query, dropdowns, and actionable toggles
  const filteredItems = useMemo(() => {
    const today = new Date();
    return consolidatedItems
      .filter(item => {
        // 1. Tab filtering
        if (activeTab === 'requirements') return item.type === 'Requirement';
        if (activeTab === 'evidence') return item.type === 'Evidence Document';
        if (activeTab === 'competencies') return item.type === 'Competency Type';
        if (activeTab === 'filters') return item.type === 'Filter' || item.type === 'Category';
        if (activeTab === 'views') return item.type === 'Saved View';
        return true;
      })
      .filter(item => {
        // 2. Search query
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
      .filter(item => {
        // 3. Status filter
        if (statusFilter === 'All') return true;
        return getSemanticStatus(item) === statusFilter;
      })
      .filter(item => {
        // 4. Date filter
        if (dateFilter === 'All') return true;
        if (dateFilter === 'no-date') return !item.dueDate;
        if (!item.dueDate) return false;

        const diffDays = Math.ceil((new Date(item.dueDate).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

        if (dateFilter === 'expired') return diffDays < 0;
        if (dateFilter === '7-days') return diffDays >= 0 && diffDays <= 7;
        if (dateFilter === '30-days') return diffDays >= 0 && diffDays <= 30;
        if (dateFilter === '90-days') return diffDays >= 0 && diffDays <= 90;
        return true;
      })
      .filter(item => {
        // 5. Category filter
        if (categoryFilter === 'All') return true;
        return item.category === categoryFilter;
      })
      .filter(item => {
        // 6. Actionable Only toggle (expired, due soon, missing, or red/amber status)
        if (!showActionableOnly) return true;
        const semantic = getSemanticStatus(item);
        return semantic === 'expired' || semantic === 'due-soon' || semantic === 'missing';
      })
      .sort((a, b) => {
        // 7. Sorting
        if (sortBy === 'module') {
          return a.moduleLabel.localeCompare(b.moduleLabel) || a.title.localeCompare(b.title);
        }
        if (sortBy === 'type') {
          return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
        }
        if (sortBy === 'status-priority') {
          const priority: Record<StatusFilterType, number> = {
            expired: 1,
            missing: 2,
            'due-soon': 3,
            unknown: 4,
            current: 5,
            archived: 6,
            All: 7
          };
          const priorityA = priority[getSemanticStatus(a)] || 99;
          const priorityB = priority[getSemanticStatus(b)] || 99;
          return priorityA - priorityB || a.title.localeCompare(b.title);
        }
        if (sortBy === 'date-soonest') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [consolidatedItems, activeTab, searchQuery, statusFilter, dateFilter, categoryFilter, showActionableOnly, sortBy]);

  // Priority "Needs Attention" List (highlights critical items at the top)
  const priorityItems = useMemo(() => {
    return consolidatedItems
      .filter(item => {
        const semantic = getSemanticStatus(item);
        return semantic === 'expired' || semantic === 'missing' || semantic === 'due-soon';
      })
      .sort((a, b) => {
        const priority: Record<StatusFilterType, number> = {
          expired: 1,
          missing: 2,
          'due-soon': 3,
          unknown: 4,
          current: 5,
          archived: 6,
          All: 7
        };
        const priorityA = priority[getSemanticStatus(a)] || 99;
        const priorityB = priority[getSemanticStatus(b)] || 99;
        return priorityA - priorityB;
      })
      .slice(0, 3); // Show top 3 most critical items
  }, [consolidatedItems]);

  const getIcon = (type: FavouriteItem['type']) => {
    if (type === 'Requirement') return <CheckSquare className="w-4 h-4 text-indigo-500" />;
    if (type === 'Evidence Document') return <FileText className="w-4 h-4 text-emerald-500" />;
    if (type === 'Competency Type') return <Award className="w-4 h-4 text-orange-500" />;
    if (type === 'Saved View') return <Bookmark className="w-4 h-4 text-amber-500" />;
    return <Filter className="w-4 h-4 text-blue-500" />;
  };

  const getStatusBadge = (item: FavouriteItem) => {
    const semantic = getSemanticStatus(item);
    const label =
      semantic === 'current' ? 'Valid' :
      semantic === 'due-soon' ? 'Due Soon' :
      semantic === 'expired' ? 'Expired' :
      semantic === 'missing' ? 'Missing' :
      semantic === 'archived' ? 'Archived' : 'Unknown';

    const base = "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-xs border flex items-center gap-1.5 shrink-0 ";

    if (semantic === 'current') {
      return <span className={base + "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{label}</span>;
    }
    if (semantic === 'due-soon') {
      return <span className={base + "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"}><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{label}</span>;
    }
    if (semantic === 'expired' || semantic === 'missing') {
      return <span className={base + "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400"}><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />{label}</span>;
    }
    return <span className={base + "bg-zinc-500/10 border-zinc-500/20 text-zinc-650 dark:text-zinc-400"}>{label}</span>;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFilter('All');
    setCategoryFilter('All');
    setShowActionableOnly(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[100] border text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-150 ${
          toastType === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20'
            : 'bg-zinc-900 border-zinc-800 text-white dark:bg-card dark:border-border dark:text-foreground'
        }`}>
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-550 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmItem && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setConfirmItem(null)}
        >
          <div
            className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setConfirmItem(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-foreground">
                {confirmItem.type === 'Saved View' ? 'Delete this saved view?' : 'Remove this item from Favourites?'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {confirmItem.type === 'Saved View'
                  ? 'This will delete the saved view from the original module as well.'
                  : 'This will remove the item from favourites in the original module as well.'}
              </p>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 space-y-1 text-xs">
              <span className="font-extrabold uppercase text-[9px] text-indigo-650 dark:text-indigo-400 tracking-wider">
                {confirmItem.type}
              </span>
              <p className="font-bold text-foreground truncate">{confirmItem.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{confirmItem.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 border border-border bg-card hover:bg-muted text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnstarConfirm(confirmItem)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                {confirmItem.type === 'Saved View' ? 'Delete Saved View' : 'Remove from Favourites'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
            <Star className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Favourites</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Favourite records, categories, filters and saved views across your workspace.
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
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider text-rose-600 dark:text-rose-400">Expired / Missing</span>
          <span className="text-2xl font-extrabold mt-1 text-rose-600 dark:text-rose-400">{stats.expiredOrMissing}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider text-amber-550">Due Soon</span>
          <span className="text-2xl font-extrabold mt-1 text-amber-500">{stats.dueSoon}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Evidence Files</span>
          <span className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{stats.evidence}</span>
        </div>
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Requirements</span>
          <span className="text-2xl font-extrabold mt-1 text-indigo-600 dark:text-indigo-400">{stats.requirements}</span>
        </div>
      </div>

      {/* Needs Attention Priority Section */}
      {priorityItems.length > 0 && (
        <div className="border border-rose-500/25 bg-rose-500/5 dark:bg-rose-950/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4.5 h-4.5" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider">Needs Attention</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {priorityItems.map(item => (
              <div
                key={`priority-${item.id}`}
                className="bg-card border border-rose-500/20 rounded-xl p-3.5 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">{item.type}</span>
                    {getStatusBadge(item)}
                  </div>
                  <h3 className="text-xs font-bold text-foreground truncate">{item.title}</h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Link
                    href={item.link}
                    className="p-1.5 bg-muted hover:bg-rose-550 hover:text-white rounded-lg text-muted-foreground border border-border cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setConfirmItem(item)}
                    className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg cursor-pointer transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filter / Sort Ribbon */}
      <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs space-y-3">
        {interfaceDetailLevel === 'focused' ? (
          // FOCUSED VIEW LAYOUT
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search favourites by name, details or type..."
                    className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 text-foreground placeholder-muted-foreground"
                  />
                </div>
                <FiltersAndToolsButton
                  isOpen={showFilters}
                  onClick={() => setShowFilters(!showFilters)}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={handleResetFilters}
                />
              </div>
            </div>

            <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as StatusFilterType)}
                      className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer w-full"
                    >
                      <option value="All">All Statuses</option>
                      <option value="current">Valid / Current</option>
                      <option value="due-soon">Due Soon</option>
                      <option value="expired">Expired</option>
                      <option value="missing">Missing Gaps</option>
                      <option value="archived">Archived / Inactive</option>
                      <option value="unknown">No Date / Unknown</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Date Limits</label>
                    <select
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value as DateFilterType)}
                      className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer w-full"
                    >
                      <option value="All">All Date Limits</option>
                      <option value="expired">Already Expired</option>
                      <option value="7-days">Due within 7 Days</option>
                      <option value="30-days">Due within 30 Days</option>
                      <option value="90-days">Due within 90 Days</option>
                      <option value="no-date">No Expiry Date</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer w-full"
                    >
                      <option value="All">All Categories</option>
                      {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as SortOption)}
                      className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer w-full"
                    >
                      <option value="name">Name A-Z</option>
                      <option value="module">Overview360 Module</option>
                      <option value="status-priority">Status Priority</option>
                      <option value="date-soonest">Due Date (Soonest)</option>
                      <option value="type">Favourite Type</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                  <label className="flex items-center gap-2 font-semibold text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showActionableOnly}
                      onChange={e => setShowActionableOnly(e.target.checked)}
                      className="accent-indigo-660 w-3.5 h-3.5"
                    />
                    <span>Show actionable only (critical/due soon)</span>
                  </label>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-500/20 hover:border-transparent rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </AdvancedControlsPanel>
          </>
        ) : (
          // ADVANCED VIEW LAYOUT
          <>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search favourites by name, details or type..."
                  className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Toggle actionable */}
              <label className="flex items-center gap-2 font-semibold text-xs text-foreground cursor-pointer shrink-0 self-start md:self-center">
                <input
                  type="checkbox"
                  checked={showActionableOnly}
                  onChange={e => setShowActionableOnly(e.target.checked)}
                  className="accent-indigo-650 w-3.5 h-3.5"
                />
                <span>Show actionable only (critical/due soon)</span>
              </label>
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex flex-col gap-1 min-w-[120px]">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as StatusFilterType)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="current">Valid / Current</option>
                  <option value="due-soon">Due Soon</option>
                  <option value="expired">Expired</option>
                  <option value="missing">Missing Gaps</option>
                  <option value="archived">Archived / Inactive</option>
                  <option value="unknown">No Date / Unknown</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value as DateFilterType)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
                >
                  <option value="All">All Date Limits</option>
                  <option value="expired">Already Expired</option>
                  <option value="7-days">Due within 7 Days</option>
                  <option value="30-days">Due within 30 Days</option>
                  <option value="90-days">Due within 90 Days</option>
                  <option value="no-date">No Expiry Date</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[120px]">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
                >
                  <option value="name">Name A-Z</option>
                  <option value="module">Overview360 Module</option>
                  <option value="status-priority">Status Priority</option>
                  <option value="date-soonest">Due Date (Soonest)</option>
                  <option value="type">Favourite Type</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== 'All' || dateFilter !== 'All' || categoryFilter !== 'All' || showActionableOnly) && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-500/20 hover:border-transparent rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </>
        )}
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
              ? 'No favourites yet. Use the star icon to keep important items here.'
              : 'No favourites match these filters. Use the star icon to keep important items here.'}
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
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/65 px-2 py-0.5 rounded-lg border border-border/40 leading-none">
                    {getIcon(item.type)}
                    {item.type}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {item.moduleLabel}
                  </span>
                  {getStatusBadge(item)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-foreground leading-normal truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed truncate mt-0.5">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground/85 font-normal leading-relaxed truncate mt-1">
                    {item.details}
                  </p>

                  {/* Date fields if available */}
                  {item.dueDate && (
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold mt-2">
                      <Clock className="w-3 h-3 text-muted-foreground/80" />
                      <span>
                        Target / Expiry Date: <span className="text-foreground">{item.dueDate}</span>
                      </span>
                    </div>
                  )}
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
                  onClick={() => setConfirmItem(item)}
                  className="p-2 bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-650 rounded-lg border border-border transition-all cursor-pointer"
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
