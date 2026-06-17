'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { BulkUploadConfigurationPanel } from '@/components/BulkUploadConfigurationPanel';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { EVIDENCE_CATEGORY_GROUPS, flattenCategoryGroups } from '@/lib/categoryPresets';
import { exportCsv, exportDateStamp, ExportRow } from '@/lib/exportData';
import { Action, EvidenceDocument, Asset, RecordImageAttachment } from '@/lib/types';
import { ImageLightbox } from '@/components/media/ImageLightbox';
import { PackBuilderAddButton } from '@/components/packs/PackBuilderAddButton';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { calculateEvidenceFileHash } from '@/lib/evidenceStorage';
import { getDuplicateChecksEnabled, setDuplicateChecksEnabled } from '@/lib/userPreferences';
import {
  Search,
  Filter,
  Upload,
  Eye,
  Trash2,
  Calendar,
  X,
  FileText,
  Loader2,
  FileCheck,
  Plus,
  RefreshCw,
  FolderArchive,
  Inbox,
  AlertCircle,
  ChevronDown,
  Download,
  Archive,
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';
import {
  useFilterFavourites,
  useSavedViews,
  FilterFavouriteButton,
  ActiveFilterChips,
  SavedViewsBar,
  StarredFilterSelect,
  ColumnVisibilityControls,
  SavedView,
  PaginationControls,
  BulkSelectionToolbar,
  DensityControls,
  useBulkSelection,
  useGlobalDensityPreference,
  usePagination,
  usePersistentViewState
} from '@/components/FilterControls';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export default function EvidenceVault() {
  const {
    user,
    organization,
    documents,
    archivedDocuments,
    frameworkRequirements,
    requirementDocuments,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    actions,
    requirementActions,
    actionUpdates,
    actionDocuments,
    uploadDocument,
    updateDocumentMetadata,
    getDocumentSignedUrl,
    deleteDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    findPossibleDuplicateDocuments,
    linkDocumentToRequirement,
    unlinkDocumentFromRequirement,
    linkDocumentToEvidenceCriterion,
    unlinkDocumentFromEvidenceCriterion,
    linkDocumentToCompetencyRecord,
    unlinkDocumentFromCompetencyRecord,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    evidenceCategories,
    upsertEvidenceCategory,
    archiveEvidenceCategory,
    assets,
    assetCheckEvidenceLinks,
    unlinkAssetCheckEvidence
  } = useApp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'title' | 'expiry' | 'uploaded'>('uploaded');
  const [vaultView, setVaultView] = useState<'active' | 'archive'>('active');
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());

  // Premium filters
  const [linkFilter, setLinkFilter] = useState<'All' | 'Linked Only' | 'Unlinked Only'>('All');
  const [docTypeFilter, setDocTypeFilter] = useState('All');
  const [uploadedByFilter, setUploadedByFilter] = useState('All');
  const [showOnlyStarredDocs, setShowOnlyStarredDocs] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [duplicateChecksEnabled, setDuplicateChecksEnabledState] = useState(() => getDuplicateChecksEnabled());
  const { interfaceDetailLevel } = useInterfaceDetailLevel();

  const activeFiltersCount = useMemo(() => {
    return [
      selectedCategory !== 'All',
      selectedStatus !== 'All',
      linkFilter !== 'All',
      docTypeFilter !== 'All',
      uploadedByFilter !== 'All',
      showOnlyStarredDocs
    ].filter(Boolean).length;
  }, [selectedCategory, selectedStatus, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs]);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      setDuplicateChecksEnabledState(customEvent.detail?.enabled ?? getDuplicateChecksEnabled());
    };
    window.addEventListener('lumen-duplicate-checks-updated', handleUpdate);
    return () => window.removeEventListener('lumen-duplicate-checks-updated', handleUpdate);
  }, []);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkReviewDate, setBulkReviewDate] = useState('');
  const [bulkExpiryDate, setBulkExpiryDate] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [lastBulkUndo, setLastBulkUndo] = useState<null | {
    label: string;
    documents: EvidenceDocument[];
  }>(null);

  // Favourites Persistence
  const { favourites, toggleFavourite, isFavourite, clearFavourites, FavouritesConfirmModal } = useFilterFavourites(user?.id || 'guest', 'vault', organization?.id);

  // Saved Views System
  const defaultViews: SavedView[] = [
    {
      id: 'expiring-soon',
      name: 'Expiring Soon',
      filters: { selectedStatus: 'Expiring Soon' }
    },
    {
      id: 'expired-evidence',
      name: 'Expired Evidence',
      filters: { selectedStatus: 'Expired' }
    },
    {
      id: 'unlinked-evidence',
      name: 'Unlinked Evidence',
      filters: { linkFilter: 'Unlinked Only' }
    },
    {
      id: 'pdf-documents',
      name: 'PDF Files',
      filters: { docTypeFilter: 'PDF' }
    }
  ];

  const {
    allViews,
    activeViewId,
    setActiveViewId,
    saveCurrentView,
    deleteCustomView
  } = useSavedViews(user?.id || 'guest', 'vault', defaultViews, organization?.id);
  const { globalDensity, setGlobalDensity } = useGlobalDensityPreference(user?.id || 'guest', organization?.id);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setLinkFilter('All');
    setDocTypeFilter('All');
    setUploadedByFilter('All');
    setShowOnlyStarredDocs(false);
    setActiveViewId(null);
  };

  const handleSelectView = (view: SavedView | null) => {
    if (view === null) {
      handleResetFilters();
      setActiveViewId(null);
    } else {
      const f = view.filters;
      setSearch(f.search || '');
      setSelectedCategory(f.selectedCategory || 'All');
      setSelectedStatus(f.selectedStatus || 'All');
      setLinkFilter(f.linkFilter || 'All');
      setDocTypeFilter(f.docTypeFilter || 'All');
      setUploadedByFilter(f.uploadedByFilter || 'All');
      setShowOnlyStarredDocs(!!f.showOnlyStarredDocs);
      setActiveViewId(view.id);
    }
  };

  const handleSaveView = (name: string) => {
    const filters = {
      search,
      selectedCategory,
      selectedStatus,
      linkFilter,
      docTypeFilter,
      uploadedByFilter,
      showOnlyStarredDocs
    };
    saveCurrentView(name, filters);
  };

  const isViewModified = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = allViews.find(v => v.id === activeViewId);
    if (!activeView) return false;
    const f = activeView.filters;
    return (
      search !== (f.search || '') ||
      selectedCategory !== (f.selectedCategory || 'All') ||
      selectedStatus !== (f.selectedStatus || 'All') ||
      linkFilter !== (f.linkFilter || 'All') ||
      docTypeFilter !== (f.docTypeFilter || 'All') ||
      uploadedByFilter !== (f.uploadedByFilter || 'All') ||
      showOnlyStarredDocs !== (!!f.showOnlyStarredDocs)
    );
  }, [activeViewId, allViews, search, selectedCategory, selectedStatus, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs]);

  const { storageKey: vaultViewStateKey } = usePersistentViewState(
    user?.id || 'guest',
    organization?.id,
    'vault',
    {
      search,
      selectedCategory,
      selectedStatus,
      sortBy,
      vaultView,
      linkFilter,
      docTypeFilter,
      uploadedByFilter,
      showOnlyStarredDocs,
      density,
      hiddenColumns,
      activeViewId
    },
    stored => {
      if (typeof stored.search === 'string') setSearch(stored.search);
      if (typeof stored.selectedCategory === 'string') setSelectedCategory(stored.selectedCategory);
      if (typeof stored.selectedStatus === 'string') setSelectedStatus(stored.selectedStatus);
      if (stored.sortBy === 'title' || stored.sortBy === 'expiry' || stored.sortBy === 'uploaded') setSortBy(stored.sortBy);
      if (stored.vaultView === 'active' || stored.vaultView === 'archive') setVaultView(stored.vaultView);
      if (stored.linkFilter === 'All' || stored.linkFilter === 'Linked Only' || stored.linkFilter === 'Unlinked Only') setLinkFilter(stored.linkFilter);
      if (typeof stored.docTypeFilter === 'string') setDocTypeFilter(stored.docTypeFilter);
      if (typeof stored.uploadedByFilter === 'string') setUploadedByFilter(stored.uploadedByFilter);
      if (typeof stored.showOnlyStarredDocs === 'boolean') setShowOnlyStarredDocs(stored.showOnlyStarredDocs);
      if (stored.density === 'comfortable' || stored.density === 'compact') setDensity(stored.density);
      if (Array.isArray(stored.hiddenColumns)) setHiddenColumns(stored.hiddenColumns.filter((item): item is string => typeof item === 'string'));
      if (typeof stored.activeViewId === 'string' || stored.activeViewId === null) setActiveViewId(stored.activeViewId);
    },
    [search, selectedCategory, selectedStatus, sortBy, vaultView, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs, density, hiddenColumns, activeViewId]
  );

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newFileName, setNewFileName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Side-drawer / Editing state
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editReview, setEditReview] = useState('');
  const [editTraining, setEditTraining] = useState('');
  const [editCalibration, setEditCalibration] = useState('');
  const [editTags, setEditTags] = useState('');
  const [metaKey, setMetaKey] = useState('');
  const [metaVal, setMetaVal] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(vaultViewStateKey) || '{}');
      if (!stored.density) setDensity(globalDensity);
    } catch {
      setDensity(globalDensity);
    }
  }, [globalDensity, vaultViewStateKey]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const docId = params.get('document') || params.get('id');
      const filterParam = params.get('filter');
      const statusParam = params.get('status');
      const linkParam = params.get('link') || params.get('linkFilter');
      const categoryParam = params.get('category');

      if (statusParam) {
        const normalizedStatus = statusParam.toLowerCase();
        if (normalizedStatus === 'expired') setSelectedStatus('Expired');
        else if (normalizedStatus === 'expiring' || normalizedStatus === 'expiring soon') setSelectedStatus('Expiring Soon');
        else if (normalizedStatus === 'unclassified') setSelectedStatus('Unclassified');
        else if (normalizedStatus === 'active') setSelectedStatus('Active');
      }

      if (linkParam) {
        const normalizedLink = linkParam.toLowerCase();
        if (normalizedLink === 'unlinked' || normalizedLink === 'unlinked only') setLinkFilter('Unlinked Only');
        else if (normalizedLink === 'linked' || normalizedLink === 'linked only') setLinkFilter('Linked Only');
      }

      if (categoryParam) {
        setSelectedCategory(categoryParam);
      }

      if (filterParam && filterParam.startsWith('doc:')) {
        const dId = filterParam.replace('doc:', '');
        const doc = documents.find(d => d.id === dId);
        if (doc) {
          setSelectedDoc(doc);
        }
      } else if (docId) {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          setSelectedDoc(doc);
        }
      }
    }
  }, [documents]);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [selectedRequirementId, setSelectedRequirementId] = useState('');
  const [selectedCriterionId, setSelectedCriterionId] = useState('');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [bulkConfigDocs, setBulkConfigDocs] = useState<EvidenceDocument[]>([]);
  const [previewDoc, setPreviewDoc] = useState<EvidenceDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewPosition, setPreviewPosition] = useState({ top: 96, left: 24 });
  const [largePreviewDoc, setLargePreviewDoc] = useState<EvidenceDocument | null>(null);
  const [largePreviewUrl, setLargePreviewUrl] = useState('');
  const [lightboxAttachments, setLightboxAttachments] = useState<RecordImageAttachment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    file: File;
    fileHash: string;
    matches: EvidenceDocument[];
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  useBodyScrollLock(Boolean(showUploadModal || largePreviewDoc || duplicateWarning));
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const previewCacheRef = useRef<Record<string, string>>({});
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heuristic metadata auto-suggester based on filename
  const handleFileNameChange = (val: string) => {
    setNewFileName(val);

    // 1. Guess category
    if (val.toLowerCase().includes('mot') || val.toLowerCase().includes('hgv') || val.toLowerCase().includes('truck') || val.toLowerCase().includes('van')) {
      setNewCategory('Fleet');
    } else if (val.toLowerCase().includes('cpc') || val.toLowerCase().includes('driver') || val.toLowerCase().includes('license') || val.toLowerCase().includes('qualification')) {
      setNewCategory('Training & Competency');
    } else if (val.toLowerCase().includes('fire') || val.toLowerCase().includes('warehouse') || val.toLowerCase().includes('loler') || val.toLowerCase().includes('lift')) {
      setNewCategory('Warehouse');
    } else if (val.toLowerCase().includes('insurance') || val.toLowerCase().includes('licence') || val.toLowerCase().includes('transit')) {
      setNewCategory('Insurance');
    }

    // 2. Guess expiry date (e.g., if filename contains "2027-06-30" or "30-06-2027")
    const dateMatch = val.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (dateMatch) {
      setNewExpiry(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
    } else {
      // Guess year check
      const yearMatch = val.match(/202[6-9]/);
      if (yearMatch) {
        setNewExpiry(`${yearMatch[0]}-12-31`); // Default to year end
      }
    }

    // Guess Title from filename if blank
    if (!newTitle) {
      const cleanName = val
        .replace(/\.[^/.]+$/, "") // strip extension
        .replace(/[-_]/g, " ") // replace dashes
        .replace(/\b\w/g, c => c.toUpperCase()); // title case
      setNewTitle(cleanName);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setNewFile(file);
    setUploadError('');
    setUploadSuccess('');
    if (file) handleFileNameChange(file.name);
  };

  const performUpload = async (file: File, fileHash: string) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      await uploadDocument({
        file,
        title: newTitle,
        category: newCategory,
        expiry_date: newExpiry || null,
        issue_date: newIssue || null,
        file_hash: fileHash,
        metadata: {}
      });

      // Reset
      setNewTitle('');
      setNewCategory('General');
      setNewFileName('');
      setNewFile(null);
      setNewExpiry('');
      setNewIssue('');
      setUploadSuccess('Document uploaded to private storage.');
      setShowUploadModal(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newFile) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const fileHash = await calculateEvidenceFileHash(newFile);
      const duplicates = duplicateChecksEnabled ? await findPossibleDuplicateDocuments(newFile, fileHash) : [];
      if (duplicateChecksEnabled && duplicates.length > 0) {
        setIsUploading(false);
        setDuplicateWarning({
          file: newFile,
          fileHash,
          matches: duplicates,
          onConfirm: () => {
            setDuplicateWarning(null);
            performUpload(newFile, fileHash);
          },
          onCancel: () => {
            setDuplicateWarning(null);
            setUploadError('Upload cancelled because a possible duplicate already exists.');
          }
        });
        return;
      }
      await performUpload(newFile, fileHash);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      setIsUploading(false);
    }
  };

  const uploadVaultFile = async (file: File, updateStatus: (status: 'validating' | 'uploading' | 'saving record' | 'linking' | 'complete' | 'failed') => void) => {
    updateStatus('saving record');
    return uploadDocument({
      file,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name,
      category: 'General',
      expiry_date: null,
      issue_date: new Date().toISOString().split('T')[0],
      metadata: { source: 'vault_dropzone' },
      tags: []
    });
  };

  const evidenceCategoryOptions = useMemo(() => {
    const names = new Set<string>([
      ...flattenCategoryGroups(EVIDENCE_CATEGORY_GROUPS),
      ...documents.map(document => document.category),
      ...archivedDocuments.map(document => document.category),
      ...evidenceCategories.filter(category => category.active).map(category => category.name)
    ].filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [archivedDocuments, documents, evidenceCategories]);

  const filteredCatOptions = useMemo(() => {
    const query = catSearchQuery.toLowerCase().trim();
    if (!query) return evidenceCategoryOptions;
    return evidenceCategoryOptions.filter(cat => cat.toLowerCase().includes(query));
  }, [evidenceCategoryOptions, catSearchQuery]);

  const sortedCategories = useMemo(() => {
    const list = evidenceCategoryOptions;
    const starred = list.filter(c => isFavourite(`cat:${c}`));
    const regular = list.filter(c => !isFavourite(`cat:${c}`));
    return [...starred, ...regular];
  }, [evidenceCategoryOptions, favourites, isFavourite]);

  const uploadedByList = useMemo(() => {
    const ids = new Set<string>([
      ...documents.map(d => d.uploaded_by).filter(Boolean) as string[],
      ...archivedDocuments.map(d => d.uploaded_by).filter(Boolean) as string[]
    ]);
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
  }, [documents, archivedDocuments]);

  const getUploaderName = (uploadedBy: string | null) => {
    if (!uploadedBy) return 'System / Guest';
    if (uploadedBy === user?.id) return user.full_name || 'Me';
    if (uploadedBy === 'usr-jane-doe') return 'Jane Doe';
    const person = people.find(p => p.id === uploadedBy);
    if (person) return person.display_name;
    return uploadedBy;
  };

  const sortedUploaders = useMemo(() => {
    const starred = uploadedByList.filter(u => isFavourite(`uploader:${u}`));
    const regular = uploadedByList.filter(u => !isFavourite(`uploader:${u}`));
    return ['All', ...starred, ...regular];
  }, [uploadedByList, favourites, isFavourite]);

  const handleCreateEvidenceCategory = async (overrideName?: string) => {
    const nameToUse = (overrideName || newCustomCategory).trim();
    if (!nameToUse) return;
    try {
      await upsertEvidenceCategory({
        name: nameToUse,
        category_group: 'Custom',
        description: 'Custom evidence category',
        active: true
      });
      setNewCategory(nameToUse);
      setSelectedCategory(nameToUse);
      setNewCustomCategory('');
      setCategoryMessage('Evidence category created.');
    } catch (error) {
      setCategoryMessage(error instanceof Error ? error.message : 'Could not create evidence category.');
    }
  };

  const handleArchiveEvidenceCategory = async (categoryId: string) => {
    const category = evidenceCategories.find(item => item.id === categoryId);
    if (!category) return;
    const inUse = [...documents, ...archivedDocuments].some(document => document.category === category.name);
    setConfirmRequest({
      title: 'Archive Category',
      description: inUse
        ? `Archive "${category.name}"?\n\nExisting evidence keeps this category text, but it will be hidden from the managed custom category list.`
        : `Archive unused category "${category.name}"?`,
      confirmLabel: 'Archive',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await archiveEvidenceCategory(categoryId);
          if (selectedCategory === category.name) setSelectedCategory('All');
          setCategoryMessage('Evidence category archived.');
        } catch (error) {
          setCategoryMessage(error instanceof Error ? error.message : 'Could not archive evidence category.');
        }
      }
    });
  };

  const syncDocumentEditState = (doc: EvidenceDocument) => {
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditExpiry(doc.expiry_date || '');
    setEditIssue(doc.issue_date || '');
    setEditReview(doc.review_date || '');
    setEditTraining(doc.training_date || '');
    setEditCalibration(doc.calibration_date || '');
    setEditTags((doc.tags || []).join(', '));
    setMetaKey('');
    setMetaVal('');
    setFileError('');
    setSaveError('');
    setSaveSuccess('');
    setSelectedRequirementId('');
    setSelectedCriterionId('');
  };

  const applyUpdatedDocument = (doc: EvidenceDocument) => {
    if (selectedDoc?.id === doc.id) setSelectedDoc(doc);
    if (previewDoc?.id === doc.id) setPreviewDoc(doc);
    if (largePreviewDoc?.id === doc.id) setLargePreviewDoc(doc);
  };

  const positionPreview = (anchor?: HTMLElement | null) => {
    if (!anchor || typeof window === 'undefined') return;
    const rect = anchor.getBoundingClientRect();
    const width = 320;
    const height = 340;
    const gap = 12;
    const margin = 16;
    const hasRightSpace = rect.right + gap + width <= window.innerWidth - margin;
    const left = hasRightSpace
      ? rect.right + gap
      : Math.max(margin, rect.left - width - gap);
    const top = Math.min(Math.max(margin, rect.top), Math.max(margin, window.innerHeight - height - margin));
    setPreviewPosition({ top, left });
  };

  const cancelPreviewClose = () => {
    if (previewCloseTimerRef.current) clearTimeout(previewCloseTimerRef.current);
  };

  const startPreview = (doc: EvidenceDocument, anchor?: HTMLElement | null) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    cancelPreviewClose();
    positionPreview(anchor);
    setPreviewDoc(doc);
    setPreviewError('');
    previewTimerRef.current = setTimeout(async () => {
      try {
        const cached = previewCacheRef.current[doc.id];
        const url = cached || await getDocumentSignedUrl(doc.id);
        previewCacheRef.current[doc.id] = url;
        setPreviewUrl(url);
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : 'Preview unavailable. Open private file.');
        setPreviewUrl('');
      }
    }, 300);
  };

  const stopPreview = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (previewCloseTimerRef.current) clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = setTimeout(() => {
      setPreviewDoc(null);
      setPreviewUrl('');
      setPreviewError('');
    }, 350);
  };

  const openLargePreview = async (doc: EvidenceDocument) => {
    cancelPreviewClose();
    setSelectedDoc(doc);
    syncDocumentEditState(doc);
    setLargePreviewDoc(doc);
    setPreviewDoc(doc);
    if (!previewCacheRef.current[doc.id]) {
      try {
        previewCacheRef.current[doc.id] = await getDocumentSignedUrl(doc.id);
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : 'Preview unavailable. Open private file.');
      }
    }
    const url = previewCacheRef.current[doc.id] || '';
    setPreviewUrl(url);
    setLargePreviewUrl(url);
  };

  const openImageLightbox = (doc: EvidenceDocument) => {
    const imageDocs = filteredDocs.filter(d => d.mime_type?.startsWith('image/'));
    const mapped: RecordImageAttachment[] = imageDocs.map(d => ({
      id: d.id,
      organisation_id: d.organization_id,
      entity_type: 'evidence_document',
      entity_id: d.id,
      document_id: d.id,
      storage_bucket: 'evidence-documents',
      storage_path: d.storage_path || null,
      file_name: d.file_name,
      mime_type: d.mime_type || 'image/jpeg',
      file_size_bytes: d.file_size_bytes,
      width: null,
      height: null,
      image_role: 'gallery',
      caption: d.title,
      alt_text: d.title,
      crop_data: null,
      sort_order: 0,
      is_primary: false,
      uploaded_by: d.uploaded_by || null,
      created_at: d.created_at,
      updated_at: d.updated_at,
      archived_at: d.archived_at || null,
      archived_by: null
    }));
    setLightboxAttachments(mapped);
    const index = imageDocs.findIndex(d => d.id === doc.id);
    setLightboxIndex(index !== -1 ? index : 0);
  };

  const handleSelectDoc = (doc: EvidenceDocument) => {
    setSelectedDoc(doc);
    syncDocumentEditState(doc);
  };

  const handleLinkRequirement = async () => {
    if (!selectedDoc || !selectedRequirementId) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await linkDocumentToRequirement(selectedRequirementId, selectedDoc.id);
      setSelectedRequirementId('');
      setSaveSuccess('Evidence linked to requirement.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not link this evidence record.');
    }
  };

  const handleUnlinkRequirement = async (requirementId: string) => {
    if (!selectedDoc) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await unlinkDocumentFromRequirement(requirementId, selectedDoc.id);
      setSaveSuccess('Evidence link removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove this evidence link.');
    }
  };

  const handleLinkCriterion = async () => {
    if (!selectedDoc || !selectedCriterionId) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await linkDocumentToEvidenceCriterion(selectedCriterionId, selectedDoc.id);
      setSelectedCriterionId('');
      setSaveSuccess('Evidence linked to criterion.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not link this evidence criterion.');
    }
  };

  const handleUnlinkCriterion = async (criterionId: string) => {
    if (!selectedDoc) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await unlinkDocumentFromEvidenceCriterion(criterionId, selectedDoc.id);
      setSaveSuccess('Evidence criterion link removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove this evidence criterion link.');
    }
  };

  const handleUnlinkAction = async (actionId: string) => {
    if (!selectedDoc) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await unlinkDocumentFromAction(actionId, selectedDoc.id);
      setSaveSuccess('Action attachment link removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove this action attachment link.');
    }
  };

  const handleUnlinkCompetencyRecord = async (recordId: string) => {
    if (!selectedDoc) return;
    setSaveError('');
    setSaveSuccess('');
    try {
      await unlinkDocumentFromCompetencyRecord(recordId, selectedDoc.id);
      setSaveSuccess('Competency evidence link removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove this competency evidence link.');
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedDoc) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const tags = editTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        title: editTitle,
        category: editCategory,
        expiry_date: editExpiry || null,
        issue_date: editIssue || null,
        review_date: editReview || null,
        training_date: editTraining || null,
        calibration_date: editCalibration || null,
        tags
      });
      applyUpdatedDocument(updated);
      syncDocumentEditState(updated);
      setSaveSuccess('Document metadata saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save document metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPrivateFile = async () => {
    if (!selectedDoc) return;
    setIsOpeningFile(true);
    setFileError('');
    try {
      await openLargePreview(selectedDoc);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not open this file.');
    } finally {
      setIsOpeningFile(false);
    }
  };

  const handleAddMetaItem = async () => {
    if (!selectedDoc || !metaKey || !metaVal) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const updatedMeta = { ...selectedDoc.metadata, [metaKey]: metaVal };
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        metadata: updatedMeta
      });
      applyUpdatedDocument(updated);
      syncDocumentEditState(updated);
      setSaveSuccess('Custom attribute added.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not add custom attribute.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMetaItem = async (keyToRemove: string) => {
    if (!selectedDoc) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const updatedMeta = { ...selectedDoc.metadata };
      delete updatedMeta[keyToRemove];
      const updated = await updateDocumentMetadata(selectedDoc.id, {
        metadata: updatedMeta
      });
      applyUpdatedDocument(updated);
      syncDocumentEditState(updated);
      setSaveSuccess('Custom attribute removed.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not remove custom attribute.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    setConfirmRequest({
      title: 'Archive Document',
      description: 'Archive this evidence document? The private file remains stored, but the record will be hidden from normal views.',
      confirmLabel: 'Archive',
      tone: 'warning',
      onConfirm: async () => {
        await deleteDocument(id);
        setSelectedDoc(null);
        setVaultView('archive');
      }
    });
  };

  const handleRestoreDoc = async (id: string) => {
    await restoreDocument(id);
    setSelectedArchiveIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handlePermanentDeleteDoc = async (id: string) => {
    setConfirmRequest({
      title: 'Permanently Delete Document',
      description: 'Permanently delete this archived evidence document? This cannot be undone. LUMÉN will mark the record permanently deleted, clean links, and attempt to remove the private storage object.',
      confirmLabel: 'Delete Permanently',
      tone: 'danger',
      onConfirm: async () => {
        await permanentlyDeleteDocument(id);
        setSelectedArchiveIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (selectedDoc?.id === id) setSelectedDoc(null);
      }
    });
  };

  const handleBulkRestore = async () => {
    for (const id of selectedArchiveIds) await restoreDocument(id);
    setSelectedArchiveIds(new Set());
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedArchiveIds.size === 0) return;
    setConfirmRequest({
      title: 'Permanently Delete Documents',
      description: `Permanently delete ${selectedArchiveIds.size} archived document(s)? This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      tone: 'danger',
      onConfirm: async () => {
        for (const id of selectedArchiveIds) await permanentlyDeleteDocument(id);
        setSelectedArchiveIds(new Set());
      }
    });
  };

  const resetBulkInputs = () => {
    setBulkCategory('');
    setBulkStatus('');
    setBulkReviewDate('');
    setBulkExpiryDate('');
  };

  const applyDocumentBulkMetadata = async () => {
    if (selectedDocs.length === 0) return;
    const updates: Partial<EvidenceDocument> = {};
    if (bulkCategory) updates.category = bulkCategory;
    if (bulkStatus) updates.status = bulkStatus as EvidenceDocument['status'];
    if (bulkReviewDate) updates.review_date = bulkReviewDate;
    if (bulkExpiryDate) updates.expiry_date = bulkExpiryDate;
    if (Object.keys(updates).length === 0) {
      setBulkMessage('Choose at least one bulk edit value before applying.');
      return;
    }
    setConfirmRequest({
      title: 'Apply Metadata Changes',
      description: `Apply metadata changes to ${selectedDocs.length} evidence record(s)? This operation will be audit logged through the normal document update path.`,
      confirmLabel: 'Apply Changes',
      tone: 'primary',
      onConfirm: async () => {
        setBulkMessage('');
        setLastBulkUndo({ label: 'Undo evidence metadata bulk edit', documents: selectedDocs });
        try {
          for (const doc of selectedDocs) {
            await updateDocumentMetadata(doc.id, updates);
          }
          documentSelection.clearSelection();
          resetBulkInputs();
          setBulkMessage(`Updated ${selectedDocs.length} evidence record(s).`);
        } catch (error) {
          setBulkMessage(error instanceof Error ? error.message : 'Bulk evidence update failed.');
        }
      }
    });
  };

  const applyDocumentBulkArchive = async () => {
    if (selectedDocs.length === 0) return;
    const isRestore = vaultView === 'archive';
    setConfirmRequest({
      title: isRestore ? 'Restore Documents' : 'Archive Documents',
      description: isRestore
        ? `Restore ${selectedDocs.length} selected evidence record(s)?`
        : `Archive ${selectedDocs.length} selected evidence record(s)? Files remain private and restorable from the archive.`,
      confirmLabel: isRestore ? 'Restore' : 'Archive',
      tone: isRestore ? 'primary' : 'warning',
      onConfirm: async () => {
        setBulkMessage('');
        setLastBulkUndo({ label: 'Undo evidence archive', documents: selectedDocs });
        try {
          for (const doc of selectedDocs) {
            if (vaultView === 'archive') await restoreDocument(doc.id);
            else await deleteDocument(doc.id);
          }
          documentSelection.clearSelection();
          setSelectedDoc(null);
          setBulkMessage(vaultView === 'archive' ? `Restored ${selectedDocs.length} evidence record(s).` : `Archived ${selectedDocs.length} evidence record(s).`);
        } catch (error) {
          setBulkMessage(error instanceof Error ? error.message : 'Bulk archive/restore failed.');
        }
      }
    });
  };

  const undoDocumentBulkAction = async () => {
    if (!lastBulkUndo) return;
    setConfirmRequest({
      title: 'Undo Bulk Action',
      description: `Restore previous values for ${lastBulkUndo.documents.length} evidence record(s)?`,
      confirmLabel: 'Undo',
      tone: 'primary',
      onConfirm: async () => {
        try {
          for (const doc of lastBulkUndo.documents) {
            const restorePayload: Partial<EvidenceDocument> = {
              title: doc.title,
              category: doc.category,
              status: doc.status,
              issue_date: doc.issue_date || null,
              expiry_date: doc.expiry_date || null,
              review_date: doc.review_date || null,
              training_date: doc.training_date || null,
              calibration_date: doc.calibration_date || null,
              tags: doc.tags || [],
              metadata: doc.metadata || {}
            };
            if (doc.status === 'deleted') await deleteDocument(doc.id);
            else {
              if (vaultView === 'archive') await restoreDocument(doc.id);
              await updateDocumentMetadata(doc.id, restorePayload);
            }
          }
          setBulkMessage('Previous evidence values restored.');
          setLastBulkUndo(null);
        } catch (error) {
          setBulkMessage(error instanceof Error ? error.message : 'Undo failed.');
        }
      }
    });
  };

  const getDocumentLinkSummary = (docId: string) => {
    const requirementCount = requirementDocuments.filter(link => link.document_id === docId).length;
    const criterionCount = requirementEvidenceCriterionMatches.filter(match => match.document_id === docId && match.match_status !== 'Rejected').length;
    const actionCount = actionDocuments.filter(link => link.document_id === docId).length;
    const competencyCount = competencyRecordDocuments.filter(link => link.document_id === docId).length;
    return { requirementCount, criterionCount, actionCount, competencyCount };
  };

  const getDocType = (doc: EvidenceDocument) => {
    const mime = (doc.mime_type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'Image';
    if (mime === 'application/pdf') return 'PDF';
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv') || doc.file_name.endsWith('.csv') || doc.file_name.endsWith('.xlsx') || doc.file_name.endsWith('.xls')) return 'Spreadsheet';
    if (mime.includes('word') || mime.includes('document') || mime.includes('text') || doc.file_name.endsWith('.docx') || doc.file_name.endsWith('.doc') || doc.file_name.endsWith('.txt')) return 'Document';
    return 'Other';
  };

  const isDocLinked = (docId: string) => {
    const summary = getDocumentLinkSummary(docId);
    return summary.requirementCount > 0 || summary.criterionCount > 0 || summary.actionCount > 0 || summary.competencyCount > 0;
  };

  const sourceDocs = useMemo(() => {
    return vaultView === 'archive' ? archivedDocuments : documents;
  }, [vaultView, archivedDocuments, documents]);

  const filteredDocs = useMemo(() => {
    return sourceDocs
      .filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
                              doc.file_name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || doc.status === selectedStatus;

        let matchesLink = true;
        if (linkFilter === 'Linked Only') {
          matchesLink = isDocLinked(doc.id);
        } else if (linkFilter === 'Unlinked Only') {
          matchesLink = !isDocLinked(doc.id);
        }

        let matchesDocType = true;
        if (docTypeFilter !== 'All') {
          matchesDocType = getDocType(doc) === docTypeFilter;
        }

        const matchesUploader = uploadedByFilter === 'All' || doc.uploaded_by === uploadedByFilter;
        const matchesStarred = !showOnlyStarredDocs || isFavourite(`doc:${doc.id}`);

        return matchesSearch && matchesCategory && matchesStatus && matchesLink && matchesDocType && matchesUploader && matchesStarred;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'expiry') {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [sourceDocs, search, selectedCategory, selectedStatus, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs, sortBy, favourites, isFavourite]);

  const {
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    paginatedItems: paginatedDocs
  } = usePagination(
    filteredDocs,
    user?.id || 'guest',
    organization?.id,
    'vault',
    [search, selectedCategory, selectedStatus, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs, sortBy, vaultView]
  );

  const documentSelection = useBulkSelection(paginatedDocs);
  const selectedDocs = sourceDocs.filter(doc => documentSelection.selectedIds.has(doc.id));

  const documentExportRows = (rows: EvidenceDocument[]): ExportRow[] => rows.map(doc => ({
    title: doc.title,
    category: doc.category,
    status: doc.status,
    original_filename: doc.original_file_name || '',
    safe_filename: doc.safe_file_name || doc.file_name,
    mime_type: doc.mime_type || '',
    file_size_bytes: doc.file_size_bytes,
    issue_date: doc.issue_date || '',
    expiry_date: doc.expiry_date || '',
    review_date: doc.review_date || '',
    training_date: doc.training_date || '',
    calibration_date: doc.calibration_date || '',
    uploaded_by: doc.uploaded_by || '',
    created_at: doc.created_at
  }));

  const exportDocuments = (scope: 'selected' | 'filtered') => {
    const rows = scope === 'selected' ? selectedDocs : filteredDocs;
    setConfirmRequest({
      title: 'Export Evidence Documents?',
      description: `You are about to export ${rows.length} document record${rows.length === 1 ? '' : 's'} as a CSV file. Do you want to download this data?`,
      confirmLabel: 'Export CSV',
      tone: 'primary',
      onConfirm: () => {
        try {
          exportCsv(`lumen-evidence-vault-${scope}-export-${exportDateStamp()}.csv`, documentExportRows(rows));
          setToast({ type: 'success', message: 'Evidence documents exported successfully.' });
        } catch (e) {
          setToast({ type: 'error', message: 'Failed to export documents.' });
        }
      }
    });
  };

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; valueLabel: string; onClear: () => void }[] = [];
    if (search) {
      chips.push({
        key: 'search',
        label: 'Search',
        valueLabel: `"${search}"`,
        onClear: () => setSearch('')
      });
    }
    if (selectedCategory !== 'All') {
      chips.push({
        key: 'category',
        label: 'Category',
        valueLabel: selectedCategory,
        onClear: () => setSelectedCategory('All')
      });
    }
    if (selectedStatus !== 'All') {
      chips.push({
        key: 'status',
        label: 'Status',
        valueLabel: selectedStatus,
        onClear: () => setSelectedStatus('All')
      });
    }
    if (linkFilter !== 'All') {
      chips.push({
        key: 'link',
        label: 'Link Status',
        valueLabel: linkFilter,
        onClear: () => setLinkFilter('All')
      });
    }
    if (docTypeFilter !== 'All') {
      chips.push({
        key: 'docType',
        label: 'Doc Type',
        valueLabel: docTypeFilter,
        onClear: () => setDocTypeFilter('All')
      });
    }
    if (uploadedByFilter !== 'All') {
      chips.push({
        key: 'uploadedBy',
        label: 'Uploader',
        valueLabel: getUploaderName(uploadedByFilter),
        onClear: () => setUploadedByFilter('All')
      });
    }
    if (showOnlyStarredDocs) {
      chips.push({
        key: 'starred',
        label: 'Favourites Only',
        valueLabel: 'Yes',
        onClear: () => setShowOnlyStarredDocs(false)
      });
    }
    return chips;
  }, [search, selectedCategory, selectedStatus, linkFilter, docTypeFilter, uploadedByFilter, showOnlyStarredDocs]);

  const columnsOptions = useMemo(() => {
    return [
      { id: 'name', title: 'Document Name', visible: !hiddenColumns.includes('name') },
      { id: 'category', title: 'Category', visible: !hiddenColumns.includes('category') },
      { id: 'date', title: vaultView === 'archive' ? 'Archived' : 'Expiry Date', visible: !hiddenColumns.includes('date') },
      { id: 'status', title: 'Status', visible: !hiddenColumns.includes('status') },
      { id: 'actions', title: 'Actions', visible: !hiddenColumns.includes('actions') }
    ];
  }, [hiddenColumns, vaultView]);

  const handleToggleColumn = (id: string) => {
    setHiddenColumns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllColumns = (visible: boolean) => {
    if (visible) {
      setHiddenColumns([]);
    } else {
      setHiddenColumns(columnsOptions.filter(c => c.id !== 'name').map(c => c.id));
    }
  };

  const selectedDocumentActionLinks = selectedDoc
    ? actionDocuments.filter(link => link.document_id === selectedDoc.id)
    : [];
  const selectedDocumentActions = selectedDocumentActionLinks
    .map(link => actions.find(action => action.id === link.action_id))
    .filter((action): action is Action => Boolean(action));
  const selectedDocumentAssetLinks = selectedDoc
    ? assetCheckEvidenceLinks.filter(link => link.document_id === selectedDoc.id)
    : [];
  const selectedDocumentCriterionMatches = selectedDoc
    ? requirementEvidenceCriterionMatches.filter(match => match.document_id === selectedDoc.id && match.match_status !== 'Rejected')
    : [];
  const selectedDocumentCriteria = selectedDocumentCriterionMatches
    .map(match => requirementEvidenceCriteria.find(criterion => criterion.id === match.criterion_id))
    .filter((criterion): criterion is NonNullable<typeof criterion> => Boolean(criterion));
  const currentSelectedAction = selectedAction
    ? actions.find(action => action.id === selectedAction.id) || selectedAction
    : null;
  const selectedActionRequirements = currentSelectedAction
    ? frameworkRequirements.filter(requirement =>
        requirementActions.some(link => link.action_id === currentSelectedAction.id && link.requirement_id === requirement.id)
      )
    : [];

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getDocumentLinkedData = (docId: string) => {
    const linkedRequirements = requirementDocuments
      .filter(link => link.document_id === docId)
      .map(link => frameworkRequirements.find(requirement => requirement.id === link.requirement_id))
      .filter((requirement): requirement is NonNullable<typeof requirement> => Boolean(requirement));
    const linkedCriteria = requirementEvidenceCriterionMatches
      .filter(match => match.document_id === docId && match.match_status !== 'Rejected')
      .map(match => requirementEvidenceCriteria.find(criterion => criterion.id === match.criterion_id))
      .filter((criterion): criterion is NonNullable<typeof criterion> => Boolean(criterion));
    const linkedActions = actionDocuments
      .filter(link => link.document_id === docId)
      .map(link => actions.find(action => action.id === link.action_id))
      .filter((action): action is Action => Boolean(action));
    const linkedCompetencies = competencyRecordDocuments
      .filter(link => link.document_id === docId)
      .map(link => {
        const record = competencyRecords.find(candidate => candidate.id === link.competency_record_id);
        const person = record ? people.find(candidate => candidate.id === record.person_id) : null;
        const type = record ? competencyTypes.find(candidate => candidate.id === record.competency_type_id) : null;
        return record && type ? { record, person, type } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    return { linkedRequirements, linkedCriteria, linkedActions, linkedCompetencies };
  };

  const renderPreviewContent = (doc: EvidenceDocument, url: string, isLarge: boolean = false) => {
    const mime = doc.mime_type || '';
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 w-full">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-muted-foreground font-medium">{previewError || 'Retrieving secure preview URL...'}</p>
        </div>
      );
    }
    if (mime.startsWith('image/')) {
      return (
        <div className={isLarge ? "relative w-full h-full flex items-center justify-center group" : "w-full"}>
          <Image
            src={url}
            alt={doc.title}
            width={isLarge ? 1280 : 640}
            height={isLarge ? 720 : 360}
            unoptimized
            className={`w-full object-contain rounded-xl bg-muted/30 border border-border/40 transition-all ${isLarge ? "max-h-[55vh] cursor-zoom-in hover:opacity-90" : "max-h-40"}`}
            onClick={() => {
              if (isLarge) {
                openImageLightbox(doc);
              }
            }}
          />
          {isLarge && (
            <button
              type="button"
              onClick={() => openImageLightbox(doc)}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-[10px] font-bold tracking-wide flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-3.5 h-3.5" /> Enlarge Image
            </button>
          )}
        </div>
      );
    }
    if (mime === 'application/pdf') {
      return (
        <iframe
          src={url}
          title={doc.title}
          className={`w-full rounded-xl border border-border/80 bg-muted/10 ${isLarge ? "h-[55vh]" : "h-40"}`}
        />
      );
    }
    return (
      <div className="w-full flex items-center justify-center">
        <div className={`w-full border border-border/80 rounded-xl text-center flex flex-col items-center justify-center bg-muted/10 ${isLarge ? "max-w-md p-6 my-4 space-y-3.5" : "p-4 space-y-2"}`}>
          <div className={`bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 ${isLarge ? "w-14 h-14" : "w-9 h-9"}`}>
            <FileText className={isLarge ? "w-7 h-7" : "w-4 h-4"} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground truncate max-w-[240px] mx-auto">{doc.original_file_name || doc.file_name}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Type: {mime.split('/').pop()?.toUpperCase() || 'Unknown'} • Size: {formatBytes(doc.file_size_bytes)}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal max-w-xs mx-auto">
            Direct preview is only supported for PDF documents and image files. Excel sheets, Word files, and Zip archives can be viewed by opening the private link directly.
          </p>
          {isLarge && (
            <button
              onClick={async () => window.open(url, '_blank', 'noopener,noreferrer')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              Open File in New Tab
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEditablePreviewMetadataPanel = (doc: EvidenceDocument) => {
    const editable = selectedDoc?.id === doc.id;
    const metadata = doc.metadata || {};
    const linkedData = getDocumentLinkedData(doc.id);
    const linkedRequirementIds = new Set(requirementDocuments.filter(link => link.document_id === doc.id).map(link => link.requirement_id));
    const linkedCriterionIds = new Set(requirementEvidenceCriterionMatches.filter(match => match.document_id === doc.id && match.match_status !== 'Rejected').map(match => match.criterion_id));

    return (
      <div className="border-t lg:border-t-0 lg:border-l border-border/60 bg-card solid-panel overflow-y-auto p-5 space-y-5 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Metadata Profile</span>
          <h4 className="text-sm font-extrabold text-foreground truncate" title={doc.title}>{doc.title}</h4>
          {!editable && (
            <p className="text-[10px] text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              This preview is not loaded into the metadata editor. Close and reopen the preview from the document row to edit it.
            </p>
          )}
        </div>

        {saveError && (
          <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
            {saveSuccess}
          </div>
        )}

        <section className="space-y-3">
          <div>
            <label htmlFor="preview-edit-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Document Title
            </label>
            <input
              id="preview-edit-title"
              type="text"
              value={editTitle}
              disabled={!editable || isSaving}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="preview-edit-category" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Category
            </label>
            <select
              id="preview-edit-category"
              value={editCategory}
              disabled={!editable || isSaving}
              onChange={e => setEditCategory(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none disabled:opacity-60"
            >
              {evidenceCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['preview-edit-issue', 'Issue', editIssue, setEditIssue],
              ['preview-edit-expiry', 'Expiry', editExpiry, setEditExpiry],
              ['preview-edit-review', 'Review', editReview, setEditReview],
              ['preview-edit-training', 'Training', editTraining, setEditTraining],
              ['preview-edit-calibration', 'Calibration', editCalibration, setEditCalibration]
            ].map(([id, label, value, setter]) => (
              <div key={id as string}>
                <label htmlFor={id as string} className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {label as string}
                </label>
                <input
                  id={id as string}
                  type="date"
                  value={value as string}
                  disabled={!editable || isSaving}
                  onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none disabled:opacity-60"
                />
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="preview-edit-tags" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Tags
            </label>
            <input
              id="preview-edit-tags"
              type="text"
              value={editTags}
              disabled={!editable || isSaving}
              onChange={e => setEditTags(e.target.value)}
              placeholder="fleet, driver, annual"
              className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none disabled:opacity-60"
            />
          </div>

          <button
            onClick={handleSaveMetadata}
            disabled={!editable || isSaving || !editTitle.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
            Save Primary Metadata
          </button>
        </section>

        <section className="border-t border-border/60 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Requirements</span>
          {linkedData.linkedRequirements.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">This record is not linked to a requirement yet.</p>
          ) : (
            <div className="space-y-2">
              {linkedData.linkedRequirements.map(requirement => (
                <div key={requirement.id} className="flex justify-between items-center gap-2 p-2 bg-muted/50 rounded-lg text-[11px]">
                  <span className="font-bold truncate">{requirement.title}</span>
                  <button onClick={() => handleUnlinkRequirement(requirement.id)} disabled={!editable} className="text-rose-500 font-bold disabled:opacity-50">Unlink</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={selectedRequirementId}
              onChange={e => setSelectedRequirementId(e.target.value)}
              disabled={!editable}
              className="min-w-0 flex-1 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px] disabled:opacity-60"
            >
              <option value="">Select requirement</option>
              {frameworkRequirements.filter(requirement => !linkedRequirementIds.has(requirement.id)).map(requirement => (
                <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
              ))}
            </select>
            <button onClick={handleLinkRequirement} disabled={!editable || !selectedRequirementId} className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md text-[10px] font-bold">
              Link
            </button>
          </div>
        </section>

        <section className="border-t border-border/60 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Evidence Criteria</span>
          {linkedData.linkedCriteria.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">This record is not matched to evidence coverage criteria.</p>
          ) : (
            <div className="space-y-2">
              {linkedData.linkedCriteria.map(criterion => {
                const requirement = frameworkRequirements.find(item => item.id === criterion.requirement_id);
                return (
                  <div key={criterion.id} className="p-2 bg-muted/50 border border-border/60 rounded-lg text-[11px] space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold truncate">{criterion.title}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">{criterion.is_required ? 'Required' : 'Optional'}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{requirement?.title || 'Requirement'} | {criterion.evidence_type || 'Evidence'}</p>
                    <button onClick={() => handleUnlinkCriterion(criterion.id)} disabled={!editable} className="text-rose-500 font-bold text-[10px] disabled:opacity-50">Unlink criterion</button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={selectedCriterionId}
              onChange={e => setSelectedCriterionId(e.target.value)}
              disabled={!editable}
              className="min-w-0 flex-1 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px] disabled:opacity-60"
            >
              <option value="">Select criterion</option>
              {requirementEvidenceCriteria.filter(criterion => !linkedCriterionIds.has(criterion.id)).map(criterion => (
                <option key={criterion.id} value={criterion.id}>{criterion.title}</option>
              ))}
            </select>
            <button onClick={handleLinkCriterion} disabled={!editable || !selectedCriterionId} className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md text-[10px] font-bold">
              Link
            </button>
          </div>
        </section>

        <section className="border-t border-border/60 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Actions</span>
          {linkedData.linkedActions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">This record is not attached to any action.</p>
          ) : (
            <div className="space-y-2">
              {linkedData.linkedActions.map(action => {
                const relatedRequirement = frameworkRequirements.find(requirement =>
                  requirementActions.some(link => link.action_id === action.id && link.requirement_id === requirement.id)
                );
                return (
                  <div key={action.id} className="p-3 bg-muted/50 border border-border/60 rounded-lg text-[11px] space-y-2">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{action.title}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {relatedRequirement?.title || 'No related requirement'} | Owner: {action.owner || 'Unassigned'}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground shrink-0">{action.status}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-muted-foreground">Due: <strong className="text-foreground">{action.target_due_date || action.due_date || 'No date'}</strong></span>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedAction(action)} className="text-indigo-500 font-bold">Open</button>
                        <button onClick={() => handleUnlinkAction(action.id)} disabled={!editable} className="text-rose-500 font-bold disabled:opacity-50">Unlink</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-border/60 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Competency Records</span>
          {linkedData.linkedCompetencies.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">This record is not linked to any competency record.</p>
          ) : (
            <div className="space-y-2">
              {linkedData.linkedCompetencies.map(item => (
                <div key={item.record.id} className="p-2 rounded-lg bg-muted/50 border border-border/60 text-[11px] space-y-1.5">
                  <span className="font-bold block text-foreground">{item.type.title}</span>
                  <span className="text-[10px] text-muted-foreground block">{item.person?.display_name || 'Unassigned person'} | {item.record.status}</span>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-muted-foreground">Open from Competency Matrix.</span>
                    <button onClick={() => handleUnlinkCompetencyRecord(item.record.id)} disabled={!editable} className="text-rose-500 font-bold disabled:opacity-50">Unlink</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-border/60 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Attributes</span>
          {Object.keys(metadata).length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">No custom attributes assigned.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center gap-2 p-2 bg-muted/50 rounded-lg text-[11px]">
                  <span className="font-semibold text-muted-foreground truncate">{key}:</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-foreground truncate">{String(value)}</span>
                    <button onClick={() => handleRemoveMetaItem(key)} disabled={!editable || isSaving} className="p-0.5 text-muted-foreground hover:text-rose-500 disabled:opacity-50" title="Remove attribute">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Attribute key"
              value={metaKey}
              disabled={!editable || isSaving}
              onChange={e => setMetaKey(e.target.value)}
              className="px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px] disabled:opacity-60"
            />
            <input
              type="text"
              placeholder="Value"
              value={metaVal}
              disabled={!editable || isSaving}
              onChange={e => setMetaVal(e.target.value)}
              className="px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px] disabled:opacity-60"
            />
          </div>
          <button onClick={handleAddMetaItem} disabled={!editable || isSaving || !metaKey || !metaVal} className="w-full py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" />
            Add Custom Attribute
          </button>
        </section>

        <section className="border-t border-border/60 pt-4 space-y-2 text-[10px] text-muted-foreground font-semibold">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">File Details</span>
          <div className="flex justify-between gap-3">
            <span>Storage filename</span>
            <span className="text-foreground font-bold truncate">{doc.file_name}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>File size</span>
            <span className="text-foreground font-bold">{formatBytes(doc.file_size_bytes)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Upload date</span>
            <span className="text-foreground font-bold">{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </section>

        <section className="border-t border-border/60 pt-4 space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Record Actions</span>
          {doc.status === 'deleted' ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleRestoreDoc(doc.id)} className="py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border font-bold">Restore</button>
              <button onClick={() => handlePermanentDeleteDoc(doc.id)} className="py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold">Delete Forever</button>
            </div>
          ) : (
            <button onClick={() => handleDeleteDoc(doc.id)} className="w-full py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-300 font-bold">Archive Document</button>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Head section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="vault-heading">Evidence Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Secure tracking registry for compliance records, testing logs, and certificates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/imports?type=evidence_metadata"
            className="flex items-center gap-2 px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-lg"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Import Metadata
          </Link>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
            id="vault-open-upload-modal-btn"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      <details className="group border border-border rounded-xl bg-card p-3.5 text-xs transition-all [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center justify-between font-bold text-foreground cursor-pointer focus:outline-none">
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>How to upload & link evidence?</span>
          </span>
          <span className="transition group-open:rotate-180 text-muted-foreground">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </span>
        </summary>
        <p className="text-muted-foreground mt-2 leading-relaxed pl-6">
          Upload a private evidence file, select it from the table, then use <strong className="text-foreground">Linked Requirements</strong> in the detail panel to connect the record to one or more requirements. Files open through temporary signed URLs only.
        </p>
      </details>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs">
        <span className="text-muted-foreground pl-1">
          Safety Check: <strong className="text-foreground">Verify files for potential duplicate content before saving.</strong>
        </span>
        <label className="inline-flex items-center gap-2 font-bold text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={duplicateChecksEnabled}
            onChange={event => {
              setDuplicateChecksEnabled(event.target.checked);
              setDuplicateChecksEnabledState(event.target.checked);
            }}
            className="accent-indigo-600 w-4 h-4"
          />
          Check duplicates before upload
        </label>
      </div>

      {!duplicateChecksEnabled && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-xl flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
          <div>
            <span className="font-bold">Duplicate Checking Disabled:</span> Uploads will bypass hash/metadata comparison. Please review files manually to avoid creating redundant evidence records.
          </div>
        </div>
      )}

      <EvidenceDropzone
        label="Drop evidence files anywhere here or choose files"
        helperText={`Creates private Evidence Vault documents in General by default. Configure metadata and links after upload. Max ${formatMaxEvidenceUploadSize()}.`}
        buttonLabel="Upload files"
        multiple
        onUpload={uploadVaultFile}
        onComplete={docs => setBulkConfigDocs(docs)}
        findDuplicates={duplicateChecksEnabled ? findPossibleDuplicateDocuments : undefined}
        onOpenExistingDocument={async (document) => {
          const url = await getDocumentSignedUrl(document.id);
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      />

      {/* Category Management consolidated to popover filter dropdown */}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-muted/60 p-1 border border-border/80 rounded-xl w-full sm:max-w-[280px] shrink-0 shadow-xs">
            <button
              onClick={() => { setVaultView('active'); setSelectedDoc(null); setSelectedArchiveIds(new Set()); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all ${
                vaultView === 'active'
                  ? 'bg-card text-foreground shadow-xs border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Active ({documents.length})
            </button>
            <button
              onClick={() => { setVaultView('archive'); setSelectedDoc(null); setSelectedArchiveIds(new Set()); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all ${
                vaultView === 'archive'
                  ? 'bg-card text-foreground shadow-xs border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Archive ({archivedDocuments.length})
            </button>
          </div>
        </div>

        {/* Dynamic Bulk Action Toolbar */}
        {vaultView === 'archive' && selectedArchiveIds.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-indigo-950 dark:text-indigo-50">{selectedArchiveIds.size}</span>
                <span className="text-indigo-700 dark:text-indigo-300 ml-1 font-medium">{selectedArchiveIds.size === 1 ? 'document selected' : 'documents selected'}</span>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={handleBulkRestore}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all shadow-sm shadow-indigo-650/15 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restore Selected
              </button>
              <button
                onClick={handleBulkPermanentDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors shadow-sm shadow-rose-600/15 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Forever
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vault browser: Search, Filters, and Table */}
      <div className="space-y-4">

        {/* Main vault browser list */}
        <div className="space-y-4">
          {/* Advanced Filter Ribbon Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl p-2.5 shadow-xs space-y-2.5">
              {interfaceDetailLevel === 'focused' ? (
                // FOCUSED VIEW LAYOUT
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="vault-search"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search documents or files..."
                          className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <FiltersAndToolsButton
                        isOpen={showFilters}
                        onClick={() => setShowFilters(!showFilters)}
                        activeFiltersCount={activeFiltersCount}
                        onClearFilters={handleResetFilters}
                      />
                      <button
                        type="button"
                        onClick={() => exportDocuments('filtered')}
                        className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
                    <div className="space-y-4">
                      {/* Density, Columns and Category Manager in a grid */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                            className="bg-muted hover:bg-muted/80 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Category Manager</span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>

                          {isCatDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)} />
                              <div className="absolute left-0 mt-1 w-64 bg-card solid-panel border border-border rounded-xl shadow-xl z-50 p-3 space-y-2.5">
                                {categoryMessage && (
                                  <div className={`p-1.5 text-[10px] font-semibold border rounded-lg text-center animate-fade-in ${
                                    categoryMessage.toLowerCase().includes('could not') || categoryMessage.toLowerCase().includes('failed')
                                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {categoryMessage}
                                  </div>
                                )}
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={catSearchQuery}
                                    onChange={(e) => setCatSearchQuery(e.target.value)}
                                    placeholder="Search or add category..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                                    autoFocus
                                  />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                                  {filteredCatOptions.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground italic text-center py-2">No matching categories.</p>
                                  ) : (
                                    filteredCatOptions.map(catName => {
                                      const isSelected = selectedCategory === catName;
                                      const customCatObj = evidenceCategories.find(c => c.name === catName && !c.is_system && c.active);
                                      return (
                                        <div
                                          key={catName}
                                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                            isSelected ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold' : 'hover:bg-muted text-foreground font-semibold'
                                          }`}
                                          onClick={() => {
                                            setSelectedCategory(catName);
                                            setIsCatDropdownOpen(false);
                                            setCatSearchQuery('');
                                          }}
                                        >
                                          <span className="truncate flex-1">{catName}</span>
                                          {customCatObj && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void handleArchiveEvidenceCategory(customCatObj.id);
                                              }}
                                              className="text-muted-foreground hover:text-rose-500 p-0.5 rounded hover:bg-muted-foreground/10 transition-colors shrink-0 cursor-pointer"
                                              title="Archive custom category"
                                            >
                                              <Archive className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                {catSearchQuery.trim() && !filteredCatOptions.some(c => c.toLowerCase() === catSearchQuery.trim().toLowerCase()) && (
                                  <div className="border-t border-border pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleCreateEvidenceCategory(catSearchQuery.trim());
                                        setIsCatDropdownOpen(false);
                                        setCatSearchQuery('');
                                      }}
                                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors animate-fade-in cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" /> Create Category &quot;{catSearchQuery.trim()}&quot;
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <ColumnVisibilityControls
                            columns={columnsOptions}
                            onToggleColumn={handleToggleColumn}
                            onToggleAll={handleToggleAllColumns}
                          />

                          <DensityControls
                            density={density}
                            onDensityChange={setDensity}
                            globalDensity={globalDensity}
                            onGlobalDensityChange={nextDensity => {
                              setGlobalDensity(nextDensity);
                              setDensity(nextDensity);
                            }}
                          />
                        </div>
                      </div>

                      {/* Filters grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <StarredFilterSelect
                          label="Category"
                          value={selectedCategory}
                          onChange={setSelectedCategory}
                          options={['All', ...sortedCategories]}
                          isStarred={(opt) => isFavourite(`cat:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`cat:${opt}`, opt, 'Category')}
                          allLabel="All Categories"
                        />
                        <StarredFilterSelect
                          label="Uploader"
                          value={uploadedByFilter}
                          onChange={setUploadedByFilter}
                          options={sortedUploaders}
                          isStarred={(opt) => isFavourite(`uploader:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`uploader:${opt}`, getUploaderName(opt), 'Uploader')}
                          allLabel="All Uploaders"
                        />
                        <StarredFilterSelect
                          label="Status"
                          value={selectedStatus}
                          onChange={setSelectedStatus}
                          options={['All', 'Active', 'Expiring Soon', 'Expired', 'Unclassified']}
                          isStarred={(opt) => isFavourite(`status:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`status:${opt}`, opt, 'Status')}
                          allLabel="All Statuses"
                        />
                        <StarredFilterSelect
                          label="Link Status"
                          value={linkFilter}
                          onChange={(val) => setLinkFilter(val as 'All' | 'Linked Only' | 'Unlinked Only')}
                          options={['All', 'Linked Only', 'Unlinked Only']}
                          isStarred={(opt) => isFavourite(`link:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`link:${opt}`, opt, 'Link Status')}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <StarredFilterSelect
                          label="Doc Type"
                          value={docTypeFilter}
                          onChange={setDocTypeFilter}
                          options={['All', 'PDF', 'Image', 'Spreadsheet', 'Document', 'Other']}
                          isStarred={(opt) => isFavourite(`doctype:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`doctype:${opt}`, opt, 'Doc Type')}
                          allLabel="All Doc Types"
                        />

                        <div className="flex flex-col gap-1">
                          <label htmlFor="vault-sort-by-focused" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort By</label>
                          <select
                            id="vault-sort-by-focused"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as 'title' | 'expiry' | 'uploaded')}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                          >
                            <option value="uploaded">Upload Date</option>
                            <option value="title">Document Name</option>
                            <option value="expiry">Expiry Date</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs">
                        <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOnlyStarredDocs}
                            onChange={e => setShowOnlyStarredDocs(e.target.checked)}
                            className="accent-indigo-650 w-3.5 h-3.5"
                          />
                          <span>Favourite Documents only</span>
                        </label>
                      </div>

                      {/* Saved Views Bar */}
                      <SavedViewsBar
                        views={allViews}
                        activeViewId={activeViewId}
                        onSelectView={handleSelectView}
                        onSaveCurrent={handleSaveView}
                        onDeleteCustom={deleteCustomView}
                        isViewModified={isViewModified}
                      />
                    </div>
                  </AdvancedControlsPanel>
                </>
              ) : (
                // ADVANCED VIEW LAYOUT
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Search and Toggle Filter Button */}
                    <div className="flex items-center gap-2 w-full md:max-w-md">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="vault-search"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search documents or files..."
                          className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 border border-border font-bold text-xs rounded-lg cursor-pointer transition-colors ${showFilters ? 'ring-2 ring-indigo-500/40' : ''}`}
                      >
                        <Filter className="w-4 h-4 text-indigo-500" />
                        <span>Filters</span>
                      </button>

                      {/* Category Manager Dropdown inline */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                          className="bg-muted hover:bg-muted/80 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Category Manager</span>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>

                        {isCatDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)} />
                            <div className="absolute right-0 mt-1 w-64 bg-card solid-panel border border-border rounded-xl shadow-xl z-50 p-3 space-y-2.5">
                              {categoryMessage && (
                                <div className={`p-1.5 text-[10px] font-semibold border rounded-lg text-center animate-fade-in ${
                                  categoryMessage.toLowerCase().includes('could not') || categoryMessage.toLowerCase().includes('failed')
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {categoryMessage}
                                </div>
                              )}
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={catSearchQuery}
                                  onChange={(e) => setCatSearchQuery(e.target.value)}
                                  placeholder="Search or add category..."
                                  className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                                  autoFocus
                                />
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                                {filteredCatOptions.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No matching categories.</p>
                                ) : (
                                  filteredCatOptions.map(catName => {
                                    const isSelected = selectedCategory === catName;
                                    const customCatObj = evidenceCategories.find(c => c.name === catName && !c.is_system && c.active);
                                    return (
                                      <div
                                        key={catName}
                                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                          isSelected ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold' : 'hover:bg-muted text-foreground font-semibold'
                                        }`}
                                        onClick={() => {
                                          setSelectedCategory(catName);
                                          setIsCatDropdownOpen(false);
                                          setCatSearchQuery('');
                                        }}
                                      >
                                        <span className="truncate flex-1">{catName}</span>
                                        {customCatObj && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleArchiveEvidenceCategory(customCatObj.id);
                                            }}
                                            className="text-muted-foreground hover:text-rose-500 p-0.5 rounded hover:bg-muted-foreground/10 transition-colors shrink-0 cursor-pointer"
                                            title="Archive custom category"
                                          >
                                            <Archive className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {catSearchQuery.trim() && !filteredCatOptions.some(c => c.toLowerCase() === catSearchQuery.trim().toLowerCase()) && (
                                <div className="border-t border-border pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCreateEvidenceCategory(catSearchQuery.trim());
                                      setIsCatDropdownOpen(false);
                                      setCatSearchQuery('');
                                    }}
                                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors animate-fade-in cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Create Category &quot;{catSearchQuery.trim()}&quot;
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Density and Column Visibility Toggles */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <ColumnVisibilityControls
                        columns={columnsOptions}
                        onToggleColumn={handleToggleColumn}
                        onToggleAll={handleToggleAllColumns}
                      />

                      <DensityControls
                        density={density}
                        onDensityChange={setDensity}
                        globalDensity={globalDensity}
                        onGlobalDensityChange={nextDensity => {
                          setGlobalDensity(nextDensity);
                          setDensity(nextDensity);
                        }}
                      />
                    </div>
                  </div>

                  {/* Collapsible advanced filters */}
                  {showFilters && (
                    <div className="border-t border-border/60 pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <StarredFilterSelect
                          label="Category"
                          value={selectedCategory}
                          onChange={setSelectedCategory}
                          options={['All', ...sortedCategories]}
                          isStarred={(opt) => isFavourite(`cat:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`cat:${opt}`, opt, 'Category')}
                          allLabel="All Categories"
                        />
                        <StarredFilterSelect
                          label="Uploader"
                          value={uploadedByFilter}
                          onChange={setUploadedByFilter}
                          options={sortedUploaders}
                          isStarred={(opt) => isFavourite(`uploader:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`uploader:${opt}`, getUploaderName(opt), 'Uploader')}
                          allLabel="All Uploaders"
                        />
                        <StarredFilterSelect
                          label="Status"
                          value={selectedStatus}
                          onChange={setSelectedStatus}
                          options={['All', 'Active', 'Expiring Soon', 'Expired', 'Unclassified']}
                          isStarred={(opt) => isFavourite(`status:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`status:${opt}`, opt, 'Status')}
                          allLabel="All Statuses"
                        />
                        <StarredFilterSelect
                          label="Link Status"
                          value={linkFilter}
                          onChange={(val) => setLinkFilter(val as 'All' | 'Linked Only' | 'Unlinked Only')}
                          options={['All', 'Linked Only', 'Unlinked Only']}
                          isStarred={(opt) => isFavourite(`link:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`link:${opt}`, opt, 'Link Status')}
                        />
                      </div>

                      {/* Second Row of Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <StarredFilterSelect
                          label="Doc Type"
                          value={docTypeFilter}
                          onChange={setDocTypeFilter}
                          options={['All', 'PDF', 'Image', 'Spreadsheet', 'Document', 'Other']}
                          isStarred={(opt) => isFavourite(`doctype:${opt}`)}
                          onToggleStar={(opt) => toggleFavourite(`doctype:${opt}`, opt, 'Doc Type')}
                          allLabel="All Doc Types"
                        />

                        <div className="flex flex-col gap-1">
                          <label htmlFor="vault-sort-by" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort By</label>
                          <select
                            id="vault-sort-by"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as 'title' | 'expiry' | 'uploaded')}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                          >
                            <option value="uploaded">Upload Date</option>
                            <option value="title">Document Name</option>
                            <option value="expiry">Expiry Date</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Toggles */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs">
                        <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOnlyStarredDocs}
                            onChange={e => setShowOnlyStarredDocs(e.target.checked)}
                            className="accent-indigo-650 w-3.5 h-3.5"
                          />
                          <span>Favourite Documents only</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Saved Views Bar */}
                  <SavedViewsBar
                    views={allViews}
                    activeViewId={activeViewId}
                    onSelectView={handleSelectView}
                    onSaveCurrent={handleSaveView}
                    onDeleteCustom={deleteCustomView}
                    isViewModified={isViewModified}
                  />
                </>
              )}

              {/* Active filter chips (always visible below the toolbar) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <ActiveFilterChips chips={filterChips} onClearAll={handleResetFilters} />
                {favourites.length > 0 && (
                  <button
                    onClick={clearFavourites}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline px-2.5 py-1 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    Clear Favourites ({favourites.length})
                  </button>
                )}
              </div>

              {/* Result Count Summary */}
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
                Filtered Documents: {filteredDocs.length} / {sourceDocs.length} documents
              </div>
            </div>
          </div>

          {bulkMessage && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {bulkMessage}
            </div>
          )}

          {/* Conditional rendering of export buttons for Advanced view */}
          {interfaceDetailLevel === 'advanced' && (
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <button type="button" onClick={() => exportDocuments('filtered')} className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export filtered
              </button>
              <button type="button" disabled={selectedDocs.length === 0} onClick={() => exportDocuments('selected')} className="px-3 py-1.5 bg-card hover:bg-muted disabled:opacity-40 border border-border rounded-lg font-bold text-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export selected
              </button>
            </div>
          )}

          <BulkSelectionToolbar
            selectedCount={documentSelection.selectedCount}
            recordLabel="evidence record(s)"
            onSelectVisible={documentSelection.selectVisible}
            onClear={documentSelection.clearSelection}
            message="Selection is not persisted after refresh."
          >
            <select
              value={bulkCategory}
              onChange={event => setBulkCategory(event.target.value)}
              className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none"
            >
              <option value="">Category...</option>
              {evidenceCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            {vaultView === 'active' && (
              <select
                value={bulkStatus}
                onChange={event => setBulkStatus(event.target.value)}
                className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none"
              >
                <option value="">Status...</option>
                {['Active', 'Expiring Soon', 'Expired', 'Unclassified'].map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            )}
            <label className="flex items-center gap-1 font-bold text-foreground">
              Review
              <input type="date" value={bulkReviewDate} onChange={event => setBulkReviewDate(event.target.value)} className="px-2 py-1.5 bg-card border border-border rounded-lg outline-none" />
            </label>
            <label className="flex items-center gap-1 font-bold text-foreground">
              Expiry
              <input type="date" value={bulkExpiryDate} onChange={event => setBulkExpiryDate(event.target.value)} className="px-2 py-1.5 bg-card border border-border rounded-lg outline-none" />
            </label>
            <button type="button" onClick={applyDocumentBulkMetadata} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
              Apply metadata
            </button>
            <button type="button" onClick={applyDocumentBulkArchive} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer">
              {vaultView === 'archive' ? 'Restore selected' : 'Archive selected'}
            </button>
            {lastBulkUndo && (
              <button type="button" onClick={undoDocumentBulkAction} className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer">
                {lastBulkUndo.label}
              </button>
            )}
          </BulkSelectionToolbar>

          <PaginationControls
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startItem={startItem}
            endItem={endItem}
            onPageChange={setCurrentPage}
            itemLabel="documents"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                  <th className={`${density === 'compact' ? 'p-2.5' : 'p-4'} select-none w-10`}>
                    <input
                      type="checkbox"
                      checked={documentSelection.allVisibleSelected}
                      onChange={event => {
                        if (event.target.checked) documentSelection.selectVisible();
                        else documentSelection.clearSelection();
                      }}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                      aria-label="Select visible evidence records"
                    />
                  </th>
                  {columnsOptions.map(col => {
                    if (!col.visible) return null;
                    return (
                      <th
                        key={col.id}
                        className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} ${col.id === 'status' ? 'text-center' : ''} ${col.id === 'actions' ? 'text-right' : ''} select-none`}
                      >
                        {col.title}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={1 + columnsOptions.filter(c => c.visible).length} className="p-12 text-center">
                      {sourceDocs.length === 0 ? (
                        vaultView === 'archive' ? (
                          <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-3 py-6">
                            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                              <FolderArchive className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">Archive is Empty</h4>
                              <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-normal">
                                Archived records are hidden from normal compliance logs but remain restorable here.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-4.5 py-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-650 flex items-center justify-center shadow-xs">
                              <Upload className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">Your Evidence Vault is Empty</h4>
                              <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-normal">
                                Upload a PDF certificate, spreadsheet log, or image to start building compliance readiness evidence.
                              </p>
                            </div>
                            <button
                              onClick={() => setShowUploadModal(true)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                            >
                              Upload First Document
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-3 py-6">
                          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                            <Inbox className="w-5 h-5 text-muted-foreground/60" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground">No matching documents</h4>
                            <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-normal">
                              Double-check your spelling, adjust compliance categories, or clear filters.
                            </p>
                          </div>
                          {(search || selectedCategory !== 'All' || selectedStatus !== 'All' || linkFilter !== 'All' || docTypeFilter !== 'All' || uploadedByFilter !== 'All' || showOnlyStarredDocs) && (
                            <button
                              onClick={handleResetFilters}
                              className="px-3 py-1 bg-muted hover:bg-muted/80 border border-border rounded-lg text-[10px] font-bold text-foreground transition-colors cursor-pointer"
                            >
                              Reset Search Filters
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map(doc => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const isBulkSelected = documentSelection.isSelected(doc.id);
                    const linkSummary = getDocumentLinkSummary(doc.id);
                    const paddingClass = density === 'compact' ? 'p-2 py-1.5' : 'p-4';
                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${
                          isSelected
                            ? 'bg-indigo-500/5 border-l-indigo-600'
                            : isBulkSelected
                              ? 'bg-indigo-500/5 border-l-indigo-400'
                            : 'border-l-transparent'
                        }`}
                        onClick={(event) => {
                          if (event.ctrlKey || event.metaKey) {
                            documentSelection.toggleSelected(doc.id);
                          } else {
                            handleSelectDoc(doc);
                          }
                        }}
                      >
                        <td className={paddingClass} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                            checked={isBulkSelected}
                            onChange={() => documentSelection.toggleSelected(doc.id)}
                            aria-label={`Select ${doc.title}`}
                          />
                        </td>
                        {columnsOptions.map(col => {
                          if (!col.visible) return null;
                          switch (col.id) {
                            case 'name':
                              return (
                                <td key="name" className={paddingClass}>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onMouseEnter={event => startPreview(doc, event.currentTarget)}
                                      onMouseLeave={stopPreview}
                                      onFocus={event => startPreview(doc, event.currentTarget)}
                                      onBlur={stopPreview}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openLargePreview(doc);
                                      }}
                                      className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0 hover:bg-indigo-500/20 cursor-pointer"
                                      title="Preview private file"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <div
                                      onMouseEnter={event => startPreview(doc, event.currentTarget)}
                                      onMouseLeave={stopPreview}
                                      onFocus={event => startPreview(doc, event.currentTarget)}
                                      onBlur={stopPreview}
                                      tabIndex={0}
                                      className="overflow-hidden max-w-[180px] sm:max-w-xs outline-none"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold block truncate">{doc.title}</span>
                                        <FilterFavouriteButton
                                          isStarred={isFavourite(`doc:${doc.id}`)}
                                          onToggle={() => toggleFavourite(`doc:${doc.id}`, doc.title, 'Evidence Document')}
                                        />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground block truncate">{doc.file_name}</span>
                                      {(vaultView === 'archive' || density === 'comfortable') && (
                                        <span className="text-[9px] text-muted-foreground block">
                                          Links: {linkSummary.requirementCount} req, {linkSummary.criterionCount} criteria, {linkSummary.actionCount} actions, {linkSummary.competencyCount} competencies
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            case 'category':
                              return (
                                <td key="category" className={`${paddingClass} font-semibold text-muted-foreground`}>
                                  {doc.category}
                                </td>
                              );
                            case 'date':
                              return (
                                <td key="date" className={`${paddingClass} font-semibold text-muted-foreground`}>
                                  {vaultView === 'archive' ? (
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                                      {doc.archived_at ? new Date(doc.archived_at).toLocaleDateString() : new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                                    </span>
                                  ) : doc.expiry_date ? (
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {doc.expiry_date}
                                    </span>
                                  ) : (
                                    <span className="text-amber-500 font-semibold italic text-[11px]">Unclassified</span>
                                  )}
                                </td>
                              );
                            case 'status':
                              return (
                                <td key="status" className={`${paddingClass} text-center`}>
                                  <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${
                                    vaultView === 'archive' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500' :
                                    doc.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                    doc.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                                    doc.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                                    'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                  }`}>
                                    {vaultView === 'archive' ? 'Archived' : doc.status}
                                  </span>
                                </td>
                              );
                            case 'actions':
                              return (
                                <td key="actions" className={`${paddingClass} text-right`}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {vaultView === 'archive' ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRestoreDoc(doc.id);
                                          }}
                                          className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-bold text-[10px] cursor-pointer"
                                        >
                                          Restore
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePermanentDeleteDoc(doc.id);
                                          }}
                                          className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded font-bold text-[10px] cursor-pointer"
                                        >
                                          Delete forever
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectDoc(doc);
                                          }}
                                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                          title="View Details"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDoc(doc.id);
                                          }}
                                          className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                                          title="Delete Document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel mounts only after selection so the table keeps the full central width by default. */}
        {selectedDoc && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="space-y-6">

              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Metadata Profile</span>
                  <h2 className="text-base font-extrabold truncate max-w-[200px]" title={selectedDoc.title}>
                    {selectedDoc.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PackBuilderAddButton
                    type="evidence"
                    id={selectedDoc.id}
                    title={selectedDoc.title}
                    sourceRoute="/dashboard/vault"
                  />
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editing Form */}
              <div className="space-y-4 text-xs">
                <button
                  onClick={handleOpenPrivateFile}
                  disabled={isOpeningFile}
                  className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isOpeningFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Open Private File
                </button>
              {fileError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {fileError}
                </div>
              )}

              {saveError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
                  {saveSuccess}
                </div>
              )}

                <div>
                  <label htmlFor="edit-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Document Title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="edit-category" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  >
                    {evidenceCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-issue" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Issue Date
                    </label>
                    <input
                      id="edit-issue"
                      type="date"
                      value={editIssue}
                      onChange={e => setEditIssue(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Expiry Date
                    </label>
                    <input
                      id="edit-expiry"
                      type="date"
                      value={editExpiry}
                      onChange={e => setEditExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="edit-review" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Review
                    </label>
                    <input
                      id="edit-review"
                      type="date"
                      value={editReview}
                      onChange={e => setEditReview(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-training" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Training
                    </label>
                    <input
                      id="edit-training"
                      type="date"
                      value={editTraining}
                      onChange={e => setEditTraining(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-calibration" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Calibration
                    </label>
                    <input
                      id="edit-calibration"
                      type="date"
                      value={editCalibration}
                      onChange={e => setEditCalibration(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-tags" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Tags
                  </label>
                  <input
                    id="edit-tags"
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="fleet, driver, annual"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveMetadata}
                  disabled={isSaving}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                  Save Primary Metadata
                </button>
              </div>

              {/* Custom Metadata Key-Value Items */}
              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Requirements</span>
                {requirementDocuments.filter(link => link.document_id === selectedDoc.id).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">This record is not linked to a requirement yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requirementDocuments
                      .filter(link => link.document_id === selectedDoc.id)
                      .map(link => {
                        const requirement = frameworkRequirements.find(item => item.id === link.requirement_id);
                        return (
                          <div key={link.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-[11px]">
                            <span className="font-bold truncate">{requirement?.title || 'Requirement'}</span>
                            <button
                              onClick={() => handleUnlinkRequirement(link.requirement_id)}
                              className="text-rose-500 font-bold"
                            >
                              Unlink
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={selectedRequirementId}
                    onChange={e => setSelectedRequirementId(e.target.value)}
                    className="min-w-0 flex-1 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  >
                    <option value="">Select requirement</option>
                    {frameworkRequirements.map(requirement => (
                      <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkRequirement}
                    disabled={!selectedRequirementId}
                    className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md text-[10px] font-bold"
                  >
                    Link
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Evidence Criteria</span>
                {selectedDocumentCriteria.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">This record is not matched to any evidence coverage criteria.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDocumentCriteria.map(criterion => {
                      const requirement = frameworkRequirements.find(item => item.id === criterion.requirement_id);
                      return (
                        <div key={criterion.id} className="p-2 bg-muted/50 border border-border/60 rounded-lg text-[11px]">
                          <div className="flex justify-between gap-2">
                            <span className="font-bold truncate">{criterion.title}</span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">{criterion.is_required ? 'Required' : 'Optional'}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {requirement?.title || 'Requirement'} | contributes to coverage when current
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Actions</span>
                {selectedDocumentActions.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">This record is not attached to any action.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDocumentActions.map(action => {
                      const relatedRequirement = frameworkRequirements.find(requirement =>
                        requirementActions.some(link => link.action_id === action.id && link.requirement_id === requirement.id)
                      );
                      return (
                        <div key={action.id} className="p-3 bg-muted/50 border border-border/60 rounded-lg text-[11px] space-y-2">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{action.title}</span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {relatedRequirement?.title || 'No related requirement'} | Owner: {action.owner || 'Unassigned'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] rounded-full border font-bold uppercase shrink-0 ${
                              action.status === 'Complete'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : action.status === 'Cancelled'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : action.status === 'In Progress'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {action.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span>Due: <strong className="text-foreground">{action.target_due_date || action.due_date || 'No date'}</strong></span>
                            <button
                              onClick={() => setSelectedAction(action)}
                              className="px-2 py-1 bg-indigo-500/10 text-indigo-500 font-bold rounded hover:bg-indigo-500/20"
                            >
                              Open linked action
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Assets</span>
                {selectedDocumentAssetLinks.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">This record is not linked to any assets.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDocumentAssetLinks.map(link => {
                      const asset = assets.find(item => item.id === link.asset_id);
                      if (!asset) return null;
                      return (
                        <div key={link.id} className="p-3 bg-muted/50 border border-border/60 rounded-lg text-[11px] space-y-2">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{asset.name}</span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                Type: {asset.asset_type} {asset.registration_number ? `| Reg: ${asset.registration_number}` : ''}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await unlinkAssetCheckEvidence(link.id);
                                  setToast({ type: 'success', message: 'Successfully unlinked evidence from asset.' });
                                } catch (err) {
                                  setToast({ type: 'error', message: 'Failed to unlink evidence.' });
                                }
                              }}
                              className="text-rose-500 font-bold shrink-0 text-[10px]"
                            >
                              Unlink
                            </button>
                          </div>
                          <div className="flex items-center justify-end text-[10px]">
                            <a
                              href={`/dashboard/matrix?asset=${asset.id}`}
                              className="px-2 py-1 bg-indigo-500/10 text-indigo-500 font-bold rounded hover:bg-indigo-500/20"
                            >
                              Go to Asset Workspace
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Attributes</span>

                {/* Meta listing */}
                {Object.keys(selectedDoc.metadata).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No custom attributes assigned. Add tags for vehicle ID, garage names, or driver licence numbers below.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(selectedDoc.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-[11px]">
                        <span className="font-semibold text-muted-foreground">{k}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{v}</span>
                          <button
                            onClick={() => handleRemoveMetaItem(k)}
                            className="p-0.5 text-muted-foreground hover:text-rose-500"
                            title="Remove attribute"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Meta form */}
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Attribute e.g. Fleet ID"
                    value={metaKey}
                    onChange={e => setMetaKey(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Value e.g. HGV-99"
                    value={metaVal}
                    onChange={e => setMetaVal(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-muted border border-border/80 rounded-md outline-none text-[11px]"
                  />
                </div>
                <button
                  onClick={handleAddMetaItem}
                  disabled={isSaving || !metaKey || !metaVal}
                  className="w-full py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Attribute
                </button>
              </div>

              {/* Physical Details */}
              <div className="border-t border-border/60 pt-4 space-y-2 text-[10px] text-muted-foreground font-semibold">
                <div className="flex justify-between">
                  <span>File Storage Name:</span>
                  <span className="text-foreground font-bold">{selectedDoc.file_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span className="text-foreground font-bold">{(selectedDoc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Uploaded On:</span>
                  <span className="text-foreground font-bold">{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
        </div>
        )}

      </div>

      {/* Upload Dialog Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Upload Evidence Document</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Private files are stored inside your active organisation.</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  File Attachment
                </label>
                <div className="border-2 border-dashed border-border/80 hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-muted/20">
                  <Upload className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                  <span className="font-semibold block text-[11px]">{newFileName || 'Select an evidence file'}</span>
                  <input
                    type="file"
                    required
                    accept={evidenceAcceptAttribute}
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                    className="mt-3 w-full text-center px-3 py-1.5 bg-card border border-border rounded-lg outline-none font-mono text-[10px]"
                  />
                  <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
                    PDF, DOCX, XLSX, PNG, JPG, or JPEG. Max {formatMaxEvidenceUploadSize()}.
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
                  {uploadSuccess}
                </div>
              )}

              <div>
                <label htmlFor="modal-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Compliance Document Title
                </label>
                <input
                  id="modal-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Forklift Thorough Examination Certificate"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Compliance Category
                  </label>
                  <select
                    id="modal-cat"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  >
                    {evidenceCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-issue" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Issue Date
                  </label>
                  <input
                    id="modal-issue"
                    type="date"
                    value={newIssue}
                    onChange={e => setNewIssue(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Expiry Date <span className="font-normal text-muted-foreground">(Leave blank if document has no expiry)</span>
                </label>
                <input
                  id="modal-expiry"
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  id="modal-upload-submit"
                  type="submit"
                  disabled={isUploading || !newTitle || !newFile}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Record Evidence'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewDoc && !largePreviewDoc && (
        <div
          className="fixed z-[55] w-80 bg-card solid-panel border border-indigo-500/20 rounded-2xl shadow-2xl p-4 space-y-3 transition-all duration-200"
          style={{ top: previewPosition.top, left: previewPosition.left }}
          onMouseEnter={cancelPreviewClose}
          onMouseLeave={stopPreview}
          onFocus={cancelPreviewClose}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 block mb-0.5">Document Preview</span>
              <span className="font-extrabold text-xs block truncate text-foreground">{previewDoc.title}</span>
              <span className="text-[10px] text-muted-foreground block truncate">{previewDoc.original_file_name || previewDoc.file_name}</span>
            </div>
            <div className="flex gap-1.5 items-center shrink-0">
              <button
                onClick={() => openLargePreview(previewDoc)}
                className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
              >
                Expand
              </button>
              <button
                onClick={stopPreview}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title="Dismiss preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-2">
            {renderPreviewContent(previewDoc, previewUrl, false)}
          </div>
        </div>
      )}

      {largePreviewDoc && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[88vh] bg-card solid-panel border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-5 border-b border-border/60 shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-650 dark:text-indigo-400">Private Vault Preview</span>
                <h3 className="text-base font-extrabold text-foreground truncate mt-0.5">{largePreviewDoc.title}</h3>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{largePreviewDoc.original_file_name || largePreviewDoc.file_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => window.open(largePreviewUrl || await getDocumentSignedUrl(largePreviewDoc.id), '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-650/10 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Open File
                </button>
                <button
                  onClick={() => { setLargePreviewDoc(null); setLargePreviewUrl(''); }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/60"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="bg-muted/20 p-6 overflow-hidden flex flex-col items-center justify-center relative">
                {renderPreviewContent(largePreviewDoc, largePreviewUrl || previewUrl, true)}
              </div>
              {renderEditablePreviewMetadataPanel(largePreviewDoc)}
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card solid-panel border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Potential Duplicate Document</span>
                <h3 className="text-base font-extrabold text-foreground mt-0.5">{duplicateWarning.file.name}</h3>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This file may already exist in the active organization. A hash match indicates identical content, while matching filename and metadata represents a possible duplicate.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {duplicateWarning.matches.map(match => {
                const hashMatches = Boolean(match.file_hash && match.file_hash === duplicateWarning.fileHash);
                return (
                  <div key={match.id} className="p-3 border rounded-xl transition-all bg-muted/20 border-border/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-foreground block truncate">{match.title}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{match.original_file_name || match.file_name}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${hashMatches ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                        {hashMatches ? 'Exact Content Match' : 'Metadata Match'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                      <span>Category: <strong className="text-foreground">{match.category}</strong></span>
                      <span>Status: <strong className="text-foreground">{match.status === 'deleted' ? 'Archived' : match.status}</strong></span>
                      <span>Uploaded: <strong className="text-foreground">{new Date(match.created_at).toLocaleDateString()}</strong></span>
                      <span>Expiry: <strong className="text-foreground">{match.expiry_date || 'None'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-border/60 pt-4">
              {duplicateWarning.matches[0] && (
                <button
                  onClick={async () => {
                    const url = await getDocumentSignedUrl(duplicateWarning.matches[0].id);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-xs transition-colors"
                >
                  View Existing
                </button>
              )}
              <button
                onClick={duplicateWarning.onCancel}
                className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold text-xs transition-colors"
              >
                Cancel Upload
              </button>
              <button
                onClick={duplicateWarning.onConfirm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-indigo-650/15"
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionDetailDrawer
        action={currentSelectedAction}
        requirements={selectedActionRequirements}
        documents={documents}
        actionUpdates={actionUpdates}
        actionDocuments={actionDocuments}
        onClose={() => setSelectedAction(null)}
        onUpdateAction={updateAction}
        onAddUpdate={addActionUpdate}
        onLinkDocument={linkDocumentToAction}
        onUnlinkDocument={unlinkDocumentFromAction}
        onUploadAttachment={uploadActionAttachment}
        onOpenDocument={getDocumentSignedUrl}
        onFindDuplicates={findPossibleDuplicateDocuments}
      />

      <BulkUploadConfigurationPanel
        documents={bulkConfigDocs}
        requirements={frameworkRequirements}
        criteria={requirementEvidenceCriteria}
        actions={actions}
        competencyRecords={competencyRecords}
        people={people}
        competencyTypes={competencyTypes}
        uploadContext="vault"
        onClose={() => setBulkConfigDocs([])}
        onUpdateDocument={updateDocumentMetadata}
        onLinkRequirement={linkDocumentToRequirement}
        onLinkCriterion={linkDocumentToEvidenceCriterion}
        onLinkAction={linkDocumentToAction}
        onLinkCompetencyRecord={linkDocumentToCompetencyRecord}
      />
      <FavouritesConfirmModal />
      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />

      {lightboxIndex !== null && lightboxAttachments.length > 0 && (
        <ImageLightbox
          attachments={lightboxAttachments}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onOpenOriginal={async (att) => {
            return await getDocumentSignedUrl(att.id);
          }}
        />
      )}
    </div>
  );
}
