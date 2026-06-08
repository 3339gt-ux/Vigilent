'use client';

import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface FiltersAndToolsButtonProps {
  isOpen: boolean;
  onClick: () => void;
  activeFiltersCount: number;
  onClearFilters?: () => void;
}

export function FiltersAndToolsButton({
  isOpen,
  onClick,
  activeFiltersCount,
  onClearFilters
}: FiltersAndToolsButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 shrink-0">
      <button
        type="button"
        id="filters-and-tools-trigger"
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg font-bold text-xs transition-all cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
          isOpen
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-card border-border hover:bg-muted text-foreground'
        }`}
        aria-label="Toggle filters and advanced tools panel"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="w-4 h-4 shrink-0" />
        <span>Filters & tools</span>
        {activeFiltersCount > 0 && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
            isOpen ? 'bg-white text-indigo-600' : 'bg-indigo-500/10 text-indigo-650'
          }`}>
            {activeFiltersCount}
          </span>
        )}
      </button>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-semibold">
            Filters active · {activeFiltersCount}
          </span>
          {onClearFilters && (
            <button
              type="button"
              id="clear-filters-btn"
              onClick={onClearFilters}
              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold cursor-pointer outline-none focus:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface AdvancedControlsPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose?: () => void;
}

export function AdvancedControlsPanel({ isOpen, children, onClose }: AdvancedControlsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-full bg-card border border-border rounded-xl p-4 shadow-md relative animate-in fade-in slide-in-from-top-2 duration-200">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600 rounded p-1"
          aria-label="Close filters panel"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="pt-2 sm:pt-0">
        {children}
      </div>
    </div>
  );
}
