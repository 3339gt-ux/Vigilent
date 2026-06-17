'use client';

import React from 'react';
import { FolderArchive } from 'lucide-react';
import { usePackBuilder } from './EvidencePackBuilderProvider';

export function PackBuilderToggle() {
  const { isOpen, setIsOpen, items } = usePackBuilder();

  const activeCount = items.length;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Toggle Evidence Pack Builder"
      aria-pressed={isOpen}
      title="Evidence Pack Builder"
      className={`relative flex items-center justify-center rounded-lg border p-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 h-9 w-9 ${
        isOpen
          ? 'bg-indigo-650 text-white border-indigo-600 shadow-sm'
          : 'bg-muted/40 border-border text-muted-foreground hover:bg-card hover:text-foreground'
      }`}
    >
      <FolderArchive className="h-4.5 w-4.5 shrink-0" />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-background animate-in scale-in duration-200">
          {activeCount}
        </span>
      )}
    </button>
  );
}
