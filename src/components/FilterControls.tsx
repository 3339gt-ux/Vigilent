import React, { useState, useEffect } from 'react';
import { Star, X, Eye, EyeOff, Save, Trash2, Check, ChevronDown } from 'lucide-react';

// ==========================================
// 1. Hook: useFilterFavourites
// ==========================================
export function useFilterFavourites(userId: string, module: string) {
  const [favourites, setFavourites] = useState<string[]>([]);
  const localStorageKey = `vygilence_filter_favourites_${userId || 'guest'}_${module}`;

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

export function useSavedViews(userId: string, module: string, defaultViews: SavedView[]) {
  const [customViews, setCustomViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const localStorageKey = `vygilence_saved_views_${userId || 'guest'}_${module}`;

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
    <div className="bg-card border border-border rounded-xl p-3 shadow-xs space-y-2.5 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mr-1 shrink-0">Views:</span>
          
          {/* Default "All" View */}
          <button
            onClick={() => onSelectView(null)}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs'
                      : 'bg-muted/50 hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {view.name}
                  {isActive && isViewModified && <span className="ml-1 text-[9px] opacity-75 italic font-medium">(modified)</span>}
                </button>
                {view.isCustom && (
                  <button
                    onClick={() => onDeleteCustom(view.id)}
                    className="p-1.5 bg-muted/40 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg border border-border/50 transition-colors cursor-pointer"
                    title="Delete saved view"
                    aria-label="Delete saved view"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {/* Save Current View Action */}
        <div className="shrink-0">
          {!showSaveInput ? (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Current View
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex items-center gap-1.5">
              <input
                type="text"
                required
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                placeholder="View name..."
                className="px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs w-36 font-semibold"
                autoFocus
              />
              <button
                type="submit"
                className="p-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg border border-indigo-750 cursor-pointer"
                title="Confirm save view"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowSaveInput(false)}
                className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border cursor-pointer"
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
        className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer"
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
        className="flex items-center justify-between gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg cursor-pointer min-w-36 text-left"
      >
        <span className="truncate">{label}: {value === 'All' ? allLabel : value}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-45" onClick={() => setIsOpen(false)} />
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

