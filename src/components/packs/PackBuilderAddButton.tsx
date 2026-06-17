'use client';

import React from 'react';
import { Plus, Check } from 'lucide-react';
import { usePackBuilder, PackItemType } from './EvidencePackBuilderProvider';

interface PackBuilderAddButtonProps {
  type: PackItemType;
  id: string;
  title: string;
  sourceRoute: string;
  className?: string;
}

export function PackBuilderAddButton({
  type,
  id,
  title,
  sourceRoute,
  className = ''
}: PackBuilderAddButtonProps) {
  const { items, addItem, removeItem } = usePackBuilder();

  const isInPack = items.some(item => item.id === id && item.type === type);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInPack) {
      removeItem(id, type);
    } else {
      addItem({ id, type, title, sourceRoute });
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isInPack ? "Click to remove this item from the local pack draft" : "Add this item to the local pack draft"}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer border shrink-0 ${
        isInPack
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/25 group'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
      } ${className}`}
    >
      {isInPack ? (
        <>
          <Check className="w-3.5 h-3.5 group-hover:hidden" />
          <span className="group-hover:hidden">Added to pack</span>
          <span className="hidden group-hover:inline text-rose-600">Remove from pack</span>
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" />
          <span>Add to pack</span>
        </>
      )}
    </button>
  );
}
