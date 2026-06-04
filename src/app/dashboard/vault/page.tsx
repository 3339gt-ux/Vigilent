'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { BulkUploadConfigurationPanel } from '@/components/BulkUploadConfigurationPanel';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { Action, EvidenceDocument } from '@/lib/types';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { calculateEvidenceFileHash } from '@/lib/evidenceStorage';
import {
  FolderLock,
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
  AlertCircle
} from 'lucide-react';

export default function EvidenceVault() {
  const {
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
    uploadActionAttachment
  } = useApp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'title' | 'expiry' | 'uploaded'>('uploaded');
  const [vaultView, setVaultView] = useState<'active' | 'archive'>('active');
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Vehicle');
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
  const [duplicateWarning, setDuplicateWarning] = useState<{
    file: File;
    fileHash: string;
    matches: EvidenceDocument[];
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heuristic metadata auto-suggester based on filename
  const handleFileNameChange = (val: string) => {
    setNewFileName(val);

    // 1. Guess category
    if (val.toLowerCase().includes('mot') || val.toLowerCase().includes('hgv') || val.toLowerCase().includes('truck') || val.toLowerCase().includes('van')) {
      setNewCategory('Vehicle');
    } else if (val.toLowerCase().includes('cpc') || val.toLowerCase().includes('driver') || val.toLowerCase().includes('license') || val.toLowerCase().includes('qualification')) {
      setNewCategory('Driver');
    } else if (val.toLowerCase().includes('fire') || val.toLowerCase().includes('warehouse') || val.toLowerCase().includes('loler') || val.toLowerCase().includes('lift')) {
      setNewCategory('Facility');
    } else if (val.toLowerCase().includes('insurance') || val.toLowerCase().includes('licence') || val.toLowerCase().includes('transit')) {
      setNewCategory('General');
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
      setNewCategory('Vehicle');
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
      const duplicates = await findPossibleDuplicateDocuments(newFile, fileHash);
      if (duplicates.length > 0) {
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
    if (confirm('Archive this evidence document? The private file remains stored, but the record will be hidden from normal views.')) {
      await deleteDocument(id);
      setSelectedDoc(null);
      setVaultView('archive');
    }
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
    if (!confirm('Permanently delete this archived evidence document? This cannot be undone. Vygilence will mark the record permanently deleted, clean links, and attempt to remove the private storage object.')) return;
    await permanentlyDeleteDocument(id);
    setSelectedArchiveIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const handleBulkRestore = async () => {
    for (const id of selectedArchiveIds) await restoreDocument(id);
    setSelectedArchiveIds(new Set());
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedArchiveIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedArchiveIds.size} archived document(s)? This cannot be undone.`)) return;
    for (const id of selectedArchiveIds) await permanentlyDeleteDocument(id);
    setSelectedArchiveIds(new Set());
  };

  const sourceDocs = vaultView === 'archive' ? archivedDocuments : documents;
  // Filtered documents list
  const filteredDocs = sourceDocs
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
                            doc.file_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || doc.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'expiry') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      }
      // default uploaded sorting (created_at descending)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const selectedDocumentActionLinks = selectedDoc
    ? actionDocuments.filter(link => link.document_id === selectedDoc.id)
    : [];
  const selectedDocumentActions = selectedDocumentActionLinks
    .map(link => actions.find(action => action.id === link.action_id))
    .filter((action): action is Action => Boolean(action));
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

  const getDocumentLinkSummary = (docId: string) => {
    const requirementCount = requirementDocuments.filter(link => link.document_id === docId).length;
    const criterionCount = requirementEvidenceCriterionMatches.filter(match => match.document_id === docId && match.match_status !== 'Rejected').length;
    const actionCount = actionDocuments.filter(link => link.document_id === docId).length;
    const competencyCount = competencyRecordDocuments.filter(link => link.document_id === docId).length;
    return { requirementCount, criterionCount, actionCount, competencyCount };
  };

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
        <div className={isLarge ? "w-full h-full flex items-center justify-center" : "w-full"}>
          <Image
            src={url}
            alt={doc.title}
            width={isLarge ? 1280 : 640}
            height={isLarge ? 720 : 360}
            unoptimized
            className={`w-full object-contain rounded-xl bg-muted/30 border border-border/40 ${isLarge ? "max-h-[55vh]" : "max-h-40"}`}
          />
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
            <FileText className={isLarge ? "w-7 h-7" : "w-4.5 h-4.5"} />
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
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
      <div className="border-t lg:border-t-0 lg:border-l border-border/60 bg-card overflow-y-auto p-5 space-y-5 text-xs">
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
              <option value="Vehicle">Vehicle</option>
              <option value="Driver">Driver</option>
              <option value="Facility">Facility</option>
              <option value="General">General</option>
              <option value="Actions">Actions</option>
              <option value="Training & Competency">Training & Competency</option>
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
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
          id="vault-open-upload-modal-btn"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-xs">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Upload and Link Evidence</h2>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          Upload a private evidence file, select it from the table, then use <strong className="text-foreground">Linked Requirements</strong> in the detail panel to connect the record to one or more requirements. Files open through temporary signed URLs only.
        </p>
      </div>

      <EvidenceDropzone
        label="Drop evidence files anywhere here or choose files"
        helperText={`Creates private Evidence Vault documents in General by default. Configure metadata and links after upload. Max ${formatMaxEvidenceUploadSize()}.`}
        buttonLabel="Upload files"
        multiple
        onUpload={uploadVaultFile}
        onComplete={docs => setBulkConfigDocs(docs)}
        findDuplicates={findPossibleDuplicateDocuments}
      />

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
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg font-bold transition-all shadow-sm shadow-indigo-650/15 flex items-center gap-1.5"
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

      {/* Grid: Search, Filters, and Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

        {/* Main vault browser list (2 cols) */}
        <div className="xl:col-span-2 space-y-4">

          {/* Controls Bar */}
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                id="vault-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents or files..."
                className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">

              {/* Category selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                <select
                  id="vault-filter-cat"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Driver">Driver</option>
                  <option value="Facility">Facility</option>
                  <option value="General">General</option>
                  <option value="Actions">Actions</option>
                </select>
              </div>

              {/* Status filter */}
              <select
                id="vault-filter-status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Unclassified">Unclassified</option>
              </select>

              {/* Sort filter */}
              <select
                id="vault-sort-by"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'title' | 'expiry' | 'uploaded')}
                className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
              >
                <option value="uploaded">Sort: Upload Date</option>
                <option value="title">Sort: Document Name</option>
                <option value="expiry">Sort: Expiry Date</option>
              </select>

            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    {vaultView === 'archive' && <th className="p-4 select-none w-10">Select</th>}
                    <th className="p-4 select-none">Document Name</th>
                    <th className="p-4 select-none">Category</th>
                    <th className="p-4 select-none">{vaultView === 'archive' ? 'Archived' : 'Expiry Date'}</th>
                    <th className="p-4 select-none text-center">Status</th>
                    <th className="p-4 select-none text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={vaultView === 'archive' ? 6 : 5} className="p-12 text-center">
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
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors"
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
                            {(search || selectedCategory !== 'All' || selectedStatus !== 'All') && (
                              <button
                                onClick={() => {
                                  setSearch('');
                                  setSelectedCategory('All');
                                  setSelectedStatus('All');
                                }}
                                className="px-3 py-1 bg-muted hover:bg-muted/80 border border-border rounded-lg text-[10px] font-bold text-foreground transition-colors"
                              >
                                Reset Search Filters
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map(doc => {
                      const isSelected = selectedDoc?.id === doc.id;
                      const linkSummary = getDocumentLinkSummary(doc.id);
                      return (
                        <tr
                          key={doc.id}
                          className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${
                            isSelected
                              ? 'bg-indigo-500/5 border-l-indigo-600'
                              : 'border-l-transparent'
                          }`}
                          onClick={() => handleSelectDoc(doc)}
                        >
                          {vaultView === 'archive' && (
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                                checked={selectedArchiveIds.has(doc.id)}
                                onChange={event => setSelectedArchiveIds(prev => {
                                  const next = new Set(prev);
                                  if (event.target.checked) next.add(doc.id);
                                  else next.delete(doc.id);
                                  return next;
                                })}
                              />
                            </td>
                          )}
                          <td className="p-4">
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
                                className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0 hover:bg-indigo-500/20"
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
                                <span className="font-bold block truncate">{doc.title}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">{doc.file_name}</span>
                                {doc.file_hash && <span className="text-[9px] text-amber-500 font-bold">Duplicate checks enabled</span>}
                                {vaultView === 'archive' && (
                                  <span className="text-[9px] text-muted-foreground block">
                                    Links: {linkSummary.requirementCount} req, {linkSummary.criterionCount} criteria, {linkSummary.actionCount} actions, {linkSummary.competencyCount} competencies
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-muted-foreground">
                            {doc.category}
                          </td>
                          <td className="p-4 font-semibold text-muted-foreground">
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
                          <td className="p-4 text-center">
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
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {vaultView === 'archive' ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestoreDoc(doc.id);
                                    }}
                                    className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-bold text-[10px]"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePermanentDeleteDoc(doc.id);
                                    }}
                                    className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded font-bold text-[10px]"
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
                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDoc(doc.id);
                                }}
                                className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right column: Detail Drawer (1 col) */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
          {selectedDoc ? (
            <div className="space-y-6">

              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Metadata Profile</span>
                  <h2 className="text-base font-extrabold truncate max-w-[200px]" title={selectedDoc.title}>
                    {selectedDoc.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
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
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                    <option value="Actions">Actions</option>
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
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 border border-dashed border-border rounded-xl bg-muted/10 p-6">
              <FolderLock className="w-10 h-10 text-muted-foreground/30" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">No Document Selected</span>
                <p className="text-[10px] max-w-[180px] leading-normal mx-auto">
                  Select a document from the registry list to view properties, manage linked requirements, or edit tags.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Upload Dialog Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
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
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                    <option value="Actions">Actions</option>
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
          className="fixed z-[55] w-80 bg-card/95 backdrop-blur-md border border-indigo-500/20 rounded-2xl shadow-2xl p-4 space-y-3 transition-all duration-200"
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
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[88vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-5 border-b border-border/60 shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-650 dark:text-indigo-400">Private Vault Preview</span>
                <h3 className="text-base font-extrabold text-foreground truncate mt-0.5">{largePreviewDoc.title}</h3>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{largePreviewDoc.original_file_name || largePreviewDoc.file_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => window.open(largePreviewUrl || await getDocumentSignedUrl(largePreviewDoc.id), '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-650/10 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Open File
                </button>
                <button
                  onClick={() => { setLargePreviewDoc(null); setLargePreviewUrl(''); }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/60"
                  aria-label="Close preview"
                >
                  <X className="w-4.5 h-4.5" />
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
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
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
              <button
                onClick={duplicateWarning.onCancel}
                className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold text-xs transition-colors"
              >
                Cancel Upload
              </button>
              <button
                onClick={duplicateWarning.onConfirm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-indigo-650/15"
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

    </div>
  );
}
