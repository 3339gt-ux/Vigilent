import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Star, X, Eye, EyeOff, Save, Trash2, Check, ChevronDown } from 'lucide-react';

export type PageSize = 20 | 25 | 50 | 75 | 100 | 'All';
export const PAGE_SIZE_OPTIONS: PageSize[] = [20, 25, 50, 75, 100, 'All'];
export type DensityPreference = 'comfortable' | 'compact';

const storageScope = (userId: string, module: string, organisationId?: string | null) =>
  `${userId || 'guest'}_${organisationId || 'workspace'}_${module}`;

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Ignoring corrupt Vygilence view state.', error);
    return fallback;
  }
};

// ==========================================
// 1. Hook: useFilterFavourites
// ==========================================
export function useFilterFavourites(userId: string, module: string, organisationId?: string | null) {
  const [favourites, setFavourites] = useState<string[]>([]);
  const localStorageKey = `vygilence_filter_favourites_${storageScope(userId, module, organisationId)}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        try {
          setFavourites(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [localStorageKey]);

  const toggleFavourite = (key: string) => {
    const next = favourites.includes(key)
      ? favourites.filter(x => x !== key)
      : [...favourites, key];
    setFavourites(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, JSON.stringify(next));
    }
  };

  const isFavourite = (key: string) => favourites.includes(key);

  const clearFavourites = () => {
    setFavourites([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(localStorageKey);
    }
  };

  return { favourites, toggleFavourite, isFavourite, clearFavourites };
}

// ==========================================
// 2. Hook: useSavedViews
// ==========================================
export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  isCustom?: boolean;
}

export function useSavedViews(userId: string, module: string, defaultViews: SavedView[], organisationId?: string | null) {
  const [customViews, setCustomViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const localStorageKey = `vygilence_saved_views_${storageScope(userId, module, organisationId)}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        try {
          setCustomViews(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [localStorageKey]);

  const allViews = [...defaultViews, ...customViews];

  const saveCurrentView = (name: string, filters: Record<string, any>) => {
    if (!name.trim()) return;
    const newView: SavedView = {
      id: `custom-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      filters,
      isCustom: true
    };
    const next = [...customViews, newView];
    setCustomViews(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, JSON.stringify(next));
    }
    setActiveViewId(newView.id);
  };

  const deleteCustomView = (id: string) => {
    const next = customViews.filter(v => v.id !== id);
    setCustomViews(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, JSON.stringify(next));
    }
    if (activeViewId === id) {
      setActiveViewId(null);
    }
  };

  return {
    allViews,
    activeViewId,
    setActiveViewId,
    saveCurrentView,
    deleteCustomView
  };
}

// ==========================================
// 2a. Hook: usePersistentViewState
// ==========================================
export function usePersistentViewState<T extends Record<string, unknown>>(
  userId: string,
  organisationId: string | null | undefined,
  module: string,
  state: T,
  applyState: (state: Partial<T>) => void,
  deps: React.DependencyList,
  enabled = true
) {
  const key = `vygilence_view_state_${storageScope(userId, module, organisationId)}`;
  const hydratedRef = useRef(false);
  const previousRef = useRef('');
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    previousRef.current = '';
    if (!enabled || typeof window === 'undefined') return;
    const stored = safeJsonParse<Partial<T>>(localStorage.getItem(key), {});
    if (Object.keys(stored).length > 0) {
      skipNextSaveRef.current = true;
      applyState(stored);
    }
    hydratedRef.current = true;
    // applyState is intentionally supplied by page components and may be recreated
    // with setters; loading should happen only when the storage scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !hydratedRef.current) return;
    const serialized = JSON.stringify(state);
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      previousRef.current = serialized;
      return;
    }
    if (serialized === previousRef.current) return;
    previousRef.current = serialized;
    localStorage.setItem(key, serialized);
    // Page components pass the values that should trigger persistence through deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps]);

  const resetStoredViewState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  };

  return { storageKey: key, resetStoredViewState };
}

// ==========================================
// 2aa. Hook: useGlobalDensityPreference
// ==========================================
export function useGlobalDensityPreference(userId: string, organisationId?: string | null) {
  const storageKey = `vygilence_global_density_${userId || 'guest'}_${organisationId || 'workspace'}`;
  const [globalDensity, setGlobalDensityState] = useState<DensityPreference>('comfortable');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    setGlobalDensityState(stored === 'compact' ? 'compact' : 'comfortable');
  }, [storageKey]);

  const setGlobalDensity = (density: DensityPreference) => {
    setGlobalDensityState(density);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, density);
    }
  };

  return { globalDensity, setGlobalDensity, storageKey };
}

interface DensityControlsProps {
  density: DensityPreference;
  onDensityChange: (density: DensityPreference) => void;
  globalDensity: DensityPreference;
  onGlobalDensityChange: (density: DensityPreference) => void;
}

export function DensityControls({
  density,
  onDensityChange,
  globalDensity,
  onGlobalDensityChange
}: DensityControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 bg-muted border border-border rounded-lg p-0.5">
      {(['comfortable', 'compact'] as DensityPreference[]).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onDensityChange(option)}
          className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            density === option ? 'bg-card text-foreground shadow-xs border border-border/50' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={`Use ${option} mode on this page`}
        >
          {option === 'comfortable' ? 'Comfortable' : 'Compact'}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => onGlobalDensityChange(globalDensity === 'compact' ? 'comfortable' : 'compact')}
        className="px-2.5 py-1.5 rounded-md text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-card transition-colors cursor-pointer"
        title="Set the default density for data-heavy pages"
      >
        Global: {globalDensity === 'compact' ? 'Compact' : 'Comfortable'}
      </button>
    </div>
  );
}

// ==========================================
// 2b. Hook: usePagination
// ==========================================
export function usePagination<T>(
  items: T[],
  userId: string,
  organisationId: string | null | undefined,
  module: string,
  resetDeps: React.DependencyList = []
) {
  const storageKey = `vygilence_page_size_${storageScope(userId, module, organisationId)}`;
  const [pageSize, setPageSizeState] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'All') {
      setPageSizeState('All');
    } else if (stored && PAGE_SIZE_OPTIONS.includes(Number(stored) as PageSize)) {
      setPageSizeState(Number(stored) as PageSize);
    } else {
      setPageSizeState(25);
    }
    setCurrentPage(1);
    hydratedRef.current = true;
  }, [storageKey]);

  const setPageSize = (value: PageSize) => {
    setPageSizeState(value);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(value));
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    // resetDeps are owned by each page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const totalItems = items.length;
  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (!hydratedRef.current) return;
    setCurrentPage(page => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    if (pageSize === 'All') return items;
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const startItem = totalItems === 0 ? 0 : pageSize === 'All' ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : pageSize === 'All' ? totalItems : Math.min(totalItems, currentPage * pageSize);

  return {
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems
  };
}

interface PaginationControlsProps {
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function PaginationControls({
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
  itemLabel = 'records'
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-card p-2.5 text-xs shadow-xs">
      <div className="font-bold text-muted-foreground">
        Showing <span className="text-foreground">{startItem}-{endItem}</span> of <span className="text-foreground">{totalItems}</span> {itemLabel}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 font-semibold text-muted-foreground">
          Page size
          <select
            value={String(pageSize)}
            onChange={event => onPageSizeChange(event.target.value === 'All' ? 'All' : Number(event.target.value) as PageSize)}
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={String(size)} value={String(size)}>{size === 'All' ? 'All' : size}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed border border-border rounded-lg font-bold cursor-pointer"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed border border-border rounded-lg font-bold cursor-pointer"
          >
            Previous
          </button>
          <span className="px-2.5 py-1.5 font-extrabold text-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed border border-border rounded-lg font-bold cursor-pointer"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed border border-border rounded-lg font-bold cursor-pointer"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2c. Hook: useBulkSelection
// ==========================================
export function useBulkSelection<T extends { id: string }>(visibleItems: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visibleIds = useMemo(() => visibleItems.map(item => item.id), [visibleItems]);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedVisibleCount = visibleIds.filter(id => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectedVisibleCount,
    allVisibleSelected,
    isSelected: (id: string) => selectedIds.has(id),
    toggleSelected,
    setSelectedIds,
    clearSelection,
    selectVisible
  };
}

interface BulkSelectionToolbarProps {
  selectedCount: number;
  recordLabel: string;
  onSelectVisible?: () => void;
  onClear: () => void;
  children?: React.ReactNode;
  message?: string;
}

export function BulkSelectionToolbar({
  selectedCount,
  recordLabel,
  onSelectVisible,
  onClear,
  children,
  message
}: BulkSelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-50/95 dark:bg-indigo-950/95 p-3 text-xs shadow-2xl solid-panel w-[92%] max-w-5xl animate-in slide-in-from-bottom-4 duration-150 min-w-0">
      <div className="font-bold text-indigo-950 dark:text-indigo-50 shrink-0">
        {selectedCount > 0 ? `${selectedCount} ${recordLabel} selected` : `Select ${recordLabel}`}
        {message && <span className="ml-2 font-medium text-indigo-700 dark:text-indigo-300 block sm:inline">{message}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2 min-w-0 overflow-x-auto py-0.5">
        {onSelectVisible && (
          <button
            type="button"
            onClick={onSelectVisible}
            className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border font-bold text-foreground cursor-pointer text-[11px] shrink-0"
          >
            Select visible
          </button>
        )}
        {children}
        <button
          type="button"
          onClick={onClear}
          disabled={selectedCount === 0}
          className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted disabled:opacity-40 border border-border font-bold text-foreground cursor-pointer disabled:cursor-not-allowed text-[11px] shrink-0"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 3. Component: FilterFavouriteButton
// ==========================================
interface FilterFavouriteButtonProps {
  isStarred: boolean;
  onToggle: () => void;
  title?: string;
}

export function FilterFavouriteButton({ isStarred, onToggle, title = "Star filter option" }: FilterFavouriteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`p-1 rounded-md transition-colors hover:bg-muted/80 cursor-pointer ${
        isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground/45 hover:text-foreground'
      }`}
      title={title}
      aria-label={title}
    >
      <Star className="w-3.5 h-3.5 fill-current" style={{ fillOpacity: isStarred ? 1 : 0 }} />
    </button>
  );
}

// ==========================================
// 4. Component: ActiveFilterChips
// ==========================================
export interface FilterChip {
  key: string;
  label: string;
  valueLabel: string;
  onClear: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
      <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Active Filters:</span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {chips.map(chip => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium rounded-lg text-[11px]"
          >
            <span className="opacity-75 font-semibold">{chip.label}:</span>
            <span className="font-extrabold">{chip.valueLabel}</span>
            <button
              onClick={chip.onClear}
              className="p-0.5 hover:bg-indigo-500/20 rounded-md transition-colors text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
              aria-label={`Clear filter ${chip.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={onClearAll}
          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline px-2 py-1 transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 5. Component: SavedViewsBar
// ==========================================
interface SavedViewsBarProps {
  views: SavedView[];
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  onSaveCurrent: (name: string) => void;
  onDeleteCustom: (id: string) => void;
  isViewModified: boolean;
}

export function SavedViewsBar({
  views,
  activeViewId,
  onSelectView,
  onSaveCurrent,
  onDeleteCustom,
  isViewModified
}: SavedViewsBarProps) {
  const [newViewName, setNewViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newViewName.trim()) {
      onSaveCurrent(newViewName);
      setNewViewName('');
      setShowSaveInput(false);
    }
  };

  return (
    <div className="w-full pt-1.5 border-t border-border/40 space-y-1.5 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
          <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mr-1 shrink-0">Views:</span>
          
          {/* Default "All" View */}
          <button
            onClick={() => onSelectView(null)}
            className={`px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer text-[11px] ${
              activeViewId === null
                ? 'bg-indigo-650 text-white border-indigo-700 shadow-xs'
                : 'bg-muted/50 hover:bg-muted border-border text-foreground'
            }`}
          >
            All Data
          </button>

          {/* Seeded and Custom Views */}
          {views.map(view => {
            const isActive = activeViewId === view.id;
            return (
              <span key={view.id} className="inline-flex items-center gap-1">
                <button
                  onClick={() => onSelectView(view)}
                  className={`px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer text-[11px] ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs'
                      : 'bg-muted/50 hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {view.name}
                  {isActive && isViewModified && <span className="ml-1 text-[8px] opacity-75 italic font-medium">(mod)</span>}
                </button>
                {view.isCustom && (
                  <button
                    onClick={() => onDeleteCustom(view.id)}
                    className="p-1 bg-muted/40 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg border border-border/50 transition-colors cursor-pointer"
                    title="Delete saved view"
                    aria-label="Delete saved view"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {/* Save Current View Action */}
        <div className="shrink-0 pt-0.5 sm:pt-0">
          {!showSaveInput ? (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer text-[11px]"
            >
              <Save className="w-3.5 h-3.5" /> Save View
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex items-center gap-1.5">
              <input
                type="text"
                required
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                placeholder="View name..."
                className="px-2 py-1 bg-muted border border-border rounded-lg outline-none text-[11px] w-28 font-semibold"
                autoFocus
              />
              <button
                type="submit"
                className="p-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg border border-indigo-700 cursor-pointer"
                title="Confirm save view"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowSaveInput(false)}
                className="p-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border cursor-pointer"
                title="Cancel save"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. Component: ColumnVisibilityControls
// ==========================================
interface ColumnOption {
  id: string;
  title: string;
  visible: boolean;
}

interface ColumnVisibilityControlsProps {
  columns: ColumnOption[];
  onToggleColumn: (id: string) => void;
  onToggleAll: (visible: boolean) => void;
}

export function ColumnVisibilityControls({
  columns,
  onToggleColumn,
  onToggleAll
}: ColumnVisibilityControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <div className="relative inline-block text-left text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer"
        id="col-visibility-dropdown-btn"
      >
        {isOpen ? <EyeOff className="w-4 h-4 text-indigo-500" /> : <Eye className="w-4 h-4 text-indigo-500" />}
        <span>Columns ({visibleCount}/{columns.length})</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-lg z-50 p-3.5 space-y-3 solid-panel">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="font-extrabold text-foreground uppercase tracking-wider text-[10px]">Show/Hide Columns</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onToggleAll(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  All
                </button>
                <span className="text-muted-foreground/30">|</span>
                <button
                  onClick={() => onToggleAll(false)}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                >
                  None
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {columns.map(col => (
                <label
                  key={col.id}
                  className="flex items-center gap-2 p-1.5 bg-muted/20 hover:bg-muted/60 rounded-lg cursor-pointer transition-colors text-foreground font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => onToggleColumn(col.id)}
                    className="accent-indigo-650 w-3.5 h-3.5"
                  />
                  <span className="truncate">{col.title}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// 7. Component: StarredFilterSelect
// ==========================================
interface StarredFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  isStarred: (option: string) => boolean;
  onToggleStar: (option: string) => void;
  allLabel?: string;
}

export function StarredFilterSelect({
  label,
  value,
  onChange,
  options,
  isStarred,
  onToggleStar,
  allLabel = 'All'
}: StarredFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group options: starred vs regular
  const starredOptions = options.filter(opt => opt !== allLabel && isStarred(opt));
  const regularOptions = options.filter(opt => opt !== allLabel && !isStarred(opt));

  return (
    <div className="relative inline-block text-left text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer min-w-32 text-left"
      >
        <span className="truncate">{label}: {value === 'All' ? allLabel : value}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-56 bg-card border border-border rounded-xl shadow-lg z-50 p-2 space-y-1 solid-panel">
            {/* All option */}
            <button
              type="button"
              onClick={() => {
                onChange('All');
                setIsOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                value === 'All' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:bg-muted/65 text-foreground'
              }`}
            >
              <span>{allLabel}</span>
            </button>

            {/* Starred options */}
            {starredOptions.length > 0 && (
              <div className="border-t border-border/60 pt-1 mt-1">
                <div className="px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Starred</div>
                {starredOptions.map(opt => (
                  <div
                    key={opt}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-colors ${
                      value === opt ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold' : 'hover:bg-muted/65 text-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      className="flex-1 text-left font-semibold truncate cursor-pointer py-0.5"
                    >
                      {opt}
                    </button>
                    <FilterFavouriteButton isStarred={true} onToggle={() => onToggleStar(opt)} />
                  </div>
                ))}
              </div>
            )}

            {/* Regular options */}
            <div className="border-t border-border/60 pt-1 mt-1">
              {starredOptions.length > 0 && (
                <div className="px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Others</div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                {regularOptions.map(opt => (
                  <div
                    key={opt}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-colors ${
                      value === opt ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold' : 'hover:bg-muted/65 text-foreground font-semibold'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      className="flex-1 text-left font-semibold truncate cursor-pointer py-0.5"
                    >
                      {opt}
                    </button>
                    <FilterFavouriteButton isStarred={false} onToggle={() => onToggleStar(opt)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
