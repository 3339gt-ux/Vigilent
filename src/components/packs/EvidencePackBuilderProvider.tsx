'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

export type PackItemType = 'requirement' | 'person' | 'asset' | 'evidence' | 'action';

export interface PackItem {
  id: string;
  type: PackItemType;
  title: string;
  sourceRoute: string;
  added_at: string;
  added_by?: string;
  included: boolean;
  options: Record<string, boolean>;
}

interface EvidencePackBuilderContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  packName: string;
  packDescription: string;
  items: PackItem[];
  setIsOpen: (open: boolean) => void;
  setIsCollapsed: (collapsed: boolean) => void;
  setPackName: (name: string) => void;
  setPackDescription: (desc: string) => void;
  addItem: (item: Omit<PackItem, 'added_at' | 'included' | 'options'>) => void;
  removeItem: (id: string, type: PackItemType) => void;
  clearPack: () => void;
  updateItemOptions: (id: string, type: PackItemType, options: Record<string, boolean>) => void;
  toggleItemIncluded: (id: string, type: PackItemType) => void;
}

const EvidencePackBuilderContext = createContext<EvidencePackBuilderContextType | undefined>(undefined);

export function EvidencePackBuilderProvider({ children }: { children: React.ReactNode }) {
  const { user, organization } = useApp();

  const [isOpen, setIsOpenState] = useState(false);
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const [packName, setPackNameState] = useState('Compliance Audit Pack');
  const [packDescription, setPackDescriptionState] = useState('Evidence pack draft for upcoming audit inspection.');
  const [items, setItemsState] = useState<PackItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate storage key dynamically based on user and organization
  const getStorageKey = useCallback(() => {
    const userId = user?.id || 'guest';
    const orgId = organization?.id || 'default';
    return `lumen_pack_builder_draft_${userId}_${orgId}`;
  }, [user?.id, organization?.id]);

  // Load from localStorage on mount or user/org change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPackNameState(parsed.packName || 'Compliance Audit Pack');
        setPackDescriptionState(parsed.packDescription || 'Evidence pack draft for upcoming audit inspection.');
        setItemsState(parsed.items || []);
        setIsOpenState(Boolean(parsed.isOpen));
        setIsCollapsedState(Boolean(parsed.isCollapsed));
      } catch (e) {
        console.error('Failed to parse pack builder local storage:', e);
      }
    } else {
      // Defaults
      setPackNameState('Compliance Audit Pack');
      setPackDescriptionState('Evidence pack draft for upcoming audit inspection.');
      setItemsState([]);
      setIsOpenState(false);
      setIsCollapsedState(false);
    }
    setIsLoaded(true);
  }, [getStorageKey]);

  // Save changes to localStorage
  const saveToStorage = (updatedName: string, updatedDesc: string, updatedItems: PackItem[], updatedOpen: boolean, updatedCollapsed: boolean) => {
    if (typeof window === 'undefined') return;
    const key = getStorageKey();
    localStorage.setItem(
      key,
      JSON.stringify({
        packName: updatedName,
        packDescription: updatedDesc,
        items: updatedItems,
        isOpen: updatedOpen,
        isCollapsed: updatedCollapsed,
      })
    );
  };

  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    if (isLoaded) saveToStorage(packName, packDescription, items, open, isCollapsed);
  };

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    if (isLoaded) saveToStorage(packName, packDescription, items, isOpen, collapsed);
  };

  const setPackName = (name: string) => {
    setPackNameState(name);
    if (isLoaded) saveToStorage(name, packDescription, items, isOpen, isCollapsed);
  };

  const setPackDescription = (desc: string) => {
    setPackDescriptionState(desc);
    if (isLoaded) saveToStorage(packName, desc, items, isOpen, isCollapsed);
  };

  // Default option checklist depending on the type of item
  const getDefaultOptionsForType = (type: PackItemType): Record<string, boolean> => {
    switch (type) {
      case 'requirement':
        return {
          includeDetails: true,
          includeEvidence: true,
          includeActions: true,
          includeReviews: true,
          includeImages: true,
          includeFiles: false // disabled by default (deferred)
        };
      case 'person':
        return {
          includeProfile: true,
          includeCompetencies: true,
          includeEvidence: true,
          includeImages: true,
          includeActions: true,
          includeFiles: false
        };
      case 'asset':
        return {
          includeProfile: true,
          includePrimaryImage: true,
          includeGallery: true,
          includeChecks: true,
          includeActions: true,
          includeFiles: false
        };
      case 'evidence':
        return {
          includeMetadata: true,
          includeLinkedRecords: true,
          includeFiles: false
        };
      case 'action':
        return {
          includeDetails: true,
          includeEvidence: true,
          includeImages: true,
          includeNotes: true,
          includeFiles: false
        };
      default:
        return {};
    }
  };

  const addItem = (newItem: Omit<PackItem, 'added_at' | 'included' | 'options'>) => {
    setItemsState(prev => {
      // Check for duplicate
      if (prev.some(item => item.id === newItem.id && item.type === newItem.type)) {
        return prev;
      }
      const itemToAdd: PackItem = {
        ...newItem,
        added_at: new Date().toISOString(),
        added_by: user?.full_name || 'System',
        included: true,
        options: getDefaultOptionsForType(newItem.type)
      };
      const updated = [...prev, itemToAdd];
      saveToStorage(packName, packDescription, updated, isOpen, isCollapsed);
      return updated;
    });
  };

  const removeItem = (id: string, type: PackItemType) => {
    setItemsState(prev => {
      const updated = prev.filter(item => !(item.id === id && item.type === type));
      saveToStorage(packName, packDescription, updated, isOpen, isCollapsed);
      return updated;
    });
  };

  const clearPack = () => {
    setItemsState([]);
    saveToStorage(packName, packDescription, [], isOpen, isCollapsed);
  };

  const updateItemOptions = (id: string, type: PackItemType, updatedOptions: Record<string, boolean>) => {
    setItemsState(prev => {
      const updated = prev.map(item => {
        if (item.id === id && item.type === type) {
          return { ...item, options: { ...item.options, ...updatedOptions } };
        }
        return item;
      });
      saveToStorage(packName, packDescription, updated, isOpen, isCollapsed);
      return updated;
    });
  };

  const toggleItemIncluded = (id: string, type: PackItemType) => {
    setItemsState(prev => {
      const updated = prev.map(item => {
        if (item.id === id && item.type === type) {
          return { ...item, included: !item.included };
        }
        return item;
      });
      saveToStorage(packName, packDescription, updated, isOpen, isCollapsed);
      return updated;
    });
  };

  return (
    <EvidencePackBuilderContext.Provider
      value={{
        isOpen,
        isCollapsed,
        packName,
        packDescription,
        items,
        setIsOpen,
        setIsCollapsed,
        setPackName,
        setPackDescription,
        addItem,
        removeItem,
        clearPack,
        updateItemOptions,
        toggleItemIncluded
      }}
    >
      {children}
    </EvidencePackBuilderContext.Provider>
  );
}

export function usePackBuilder() {
  const context = useContext(EvidencePackBuilderContext);
  if (!context) {
    throw new Error('usePackBuilder must be used within an EvidencePackBuilderProvider');
  }
  return context;
}
