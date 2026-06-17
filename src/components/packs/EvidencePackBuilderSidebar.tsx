'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  FolderArchive,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
  Package,
  FileText,
  Activity,
  Folder,
  Eye,
  ShieldAlert,
  Download,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { usePackBuilder, PackItem, PackItemType } from './EvidencePackBuilderProvider';
import { useApp } from '@/context/AppContext';
import {
  buildEvidencePackMetadataZip,
  buildFullEvidencePackZip,
  FULL_PACK_EXPORT_LIMITS,
  previewFullEvidencePackExport,
  type PackExportProgress
} from '@/lib/evidencePackExport';

const previewRootDate = 'YYYY-MM-DD';

function sanitizePreviewName(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return normalized.replace(/^-|-$/g, '') || 'Draft';
}

function getPreviewSummaryFile(type: PackItemType) {
  switch (type) {
    case 'requirement':
      return 'requirement-summary.json';
    case 'person':
      return 'person-summary.json';
    case 'asset':
      return 'asset-summary.json';
    case 'evidence':
      return 'evidence-metadata.json';
    case 'action':
      return 'action-summary.json';
    default:
      return 'item-summary.json';
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function EvidencePackBuilderSidebar() {
  const {
    user,
    organization,
    frameworkRequirements,
    requirementDocuments,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    reviews,
    requirementActions,
    people,
    competencyRecords,
    competencyTypes,
    competencyRecordDocuments,
    documents,
    actions,
    actionDocuments,
    actionObjectLinks,
    actionUpdates,
    assets,
    assetCheckAssignments,
    assetCheckRecords,
    assetCheckEvidenceLinks,
    assetHistoryEvents,
    imageAttachments
  } = useApp();

  const {
    isOpen,
    isCollapsed,
    setIsCollapsed,
    setIsOpen,
    packName,
    setPackName,
    packDescription,
    setPackDescription,
    items,
    removeItem,
    clearPack,
    updateItemOptions,
    toggleItemIncluded
  } = usePackBuilder();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFullExportConfirm, setShowFullExportConfirm] = useState(false);
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [fullExportProgress, setFullExportProgress] = useState<PackExportProgress | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const fullExportAbortRef = useRef<AbortController | null>(null);

  const groupedItems = useMemo<Record<PackItemType, PackItem[]>>(() => (
    items.reduce<Record<PackItemType, PackItem[]>>((acc, item) => {
      acc[item.type].push(item);
      return acc;
    }, {
      requirement: [],
      person: [],
      asset: [],
      evidence: [],
      action: []
    })
  ), [items]);

  const exportContext = useMemo(() => ({
    packName,
    packDescription,
    exportedBy: user?.full_name || 'Unknown user',
    exportedByUserId: user?.id || null,
    organisationId: organization?.id || '',
    organisationName: organization?.name || 'Unknown organisation',
    items,
    requirements: frameworkRequirements,
    requirementDocuments,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    reviews,
    requirementActions,
    people,
    competencyRecords,
    competencyTypes,
    competencyRecordDocuments,
    documents,
    actions,
    actionDocuments,
    actionObjectLinks,
    actionUpdates,
    assets,
    assetCheckAssignments,
    assetCheckRecords,
    assetCheckEvidenceLinks,
    assetHistoryEvents,
    imageAttachments
  }), [
    packName,
    packDescription,
    user?.full_name,
    user?.id,
    organization?.id,
    organization?.name,
    items,
    frameworkRequirements,
    requirementDocuments,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    reviews,
    requirementActions,
    people,
    competencyRecords,
    competencyTypes,
    competencyRecordDocuments,
    documents,
    actions,
    actionDocuments,
    actionObjectLinks,
    actionUpdates,
    assets,
    assetCheckAssignments,
    assetCheckRecords,
    assetCheckEvidenceLinks,
    assetHistoryEvents,
    imageAttachments
  ]);

  const activeCount = items.length;
  const includedItems = items.filter(item => item.included);
  const includedCount = includedItems.length;

  const fullExportPreview = useMemo(() => {
    if (!organization?.id || includedCount === 0) {
      return {
        candidateCount: 0,
        estimatedBytes: 0,
        warningThresholdReached: false,
        limitExceeded: false,
        missingSizeCount: 0,
        reasons: [] as string[]
      };
    }
    return previewFullEvidencePackExport(exportContext);
  }, [organization?.id, includedCount, exportContext]);

  if (!isOpen) return null;

  const toggleItemExpand = (itemKey: string) => {
    setExpandedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const getItemKey = (item: PackItem) => `${item.type}:${item.id}`;

  const getTypeIcon = (type: PackItemType) => {
    switch (type) {
      case 'requirement':
        return <ClipboardList className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" />;
      case 'person':
        return <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'asset':
        return <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'evidence':
        return <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'action':
        return <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: PackItemType) => {
    switch (type) {
      case 'requirement':
        return 'Requirement';
      case 'person':
        return 'Teammate';
      case 'asset':
        return 'Asset';
      case 'evidence':
        return 'Document';
      case 'action':
        return 'Action';
      default:
        return type;
    }
  };

  const getOptionLabel = (optKey: string) => {
    switch (optKey) {
      case 'includeDetails':
        return 'Include summary/details';
      case 'includeEvidence':
        return 'Include linked evidence metadata';
      case 'includeActions':
        return 'Include linked actions';
      case 'includeReviews':
        return 'Include reviews';
      case 'includeImages':
        return 'Include images metadata';
      case 'includeProfile':
        return 'Include profile summary';
      case 'includeCompetencies':
        return 'Include assigned competencies';
      case 'includePrimaryImage':
        return 'Include primary image metadata';
      case 'includeGallery':
        return 'Include gallery metadata';
      case 'includeChecks':
        return 'Include check records';
      case 'includeMetadata':
        return 'Include document metadata';
      case 'includeLinkedRecords':
        return 'Include linked records';
      case 'includeNotes':
        return 'Include action notes/updates';
      case 'includeFiles':
        return 'File export follows the enabled evidence/image sections above';
      default:
        return optKey;
    }
  };

  const handleMetadataExport = async () => {
    if (includedCount === 0) {
      setExportMessage(null);
      setExportError('Add at least one requirement, person, asset, evidence record or action before exporting.');
      return;
    }

    setIsExportingMetadata(true);
    setExportMessage(null);
    setExportError(null);

    try {
      const { blob, filename, rootFolderName, includedCount: exportedCount } = await buildEvidencePackMetadataZip(exportContext);

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setExportMessage(`Metadata ZIP exported: ${filename}. Included ${exportedCount} item${exportedCount === 1 ? '' : 's'} in ${rootFolderName}.`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Metadata ZIP export failed. Please try again.');
    } finally {
      setIsExportingMetadata(false);
    }
  };

  const handleOpenFullExportConfirm = () => {
    setExportMessage(null);
    setExportError(null);

    if (includedCount === 0) {
      setExportError('Add at least one requirement, person, asset, evidence record or action before exporting.');
      return;
    }
    if (!organization?.id) {
      setExportError('An active organisation is required before exporting a full pack.');
      return;
    }
    if (fullExportPreview.candidateCount === 0) {
      setExportError('No eligible private files are currently available for this pack. Export metadata only, or include evidence/image sections that have accessible files.');
      return;
    }
    if (fullExportPreview.limitExceeded) {
      setExportError('The current pack exceeds the full export safety limits. Reduce the selection before exporting files.');
      return;
    }
    setShowFullExportConfirm(true);
  };

  const handleConfirmFullExport = async () => {
    setShowFullExportConfirm(false);
    setIsExportingFull(true);
    setExportMessage(null);
    setExportError(null);
    setFullExportProgress({
      phase: 'collecting-metadata',
      message: 'Collecting metadata',
      totalCandidates: fullExportPreview.candidateCount,
      processedCandidates: 0,
      includedFiles: 0,
      failedFiles: 0,
      deferredFiles: 0,
      totalBytes: 0
    });

    const controller = new AbortController();
    fullExportAbortRef.current = controller;

    try {
      const result = await buildFullEvidencePackZip(exportContext, {
        signal: controller.signal,
        onProgress: setFullExportProgress
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setExportMessage(
        `Full ZIP exported: ${result.filename}. Included ${result.includedFileCount} file${result.includedFileCount === 1 ? '' : 's'}, failed ${result.failedFileCount}, deferred ${result.deferredFileCount}.`
      );
      setFullExportProgress(prev => prev ? { ...prev, phase: 'complete', message: 'Export complete' } : prev);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExportError('Full export was cancelled before completion.');
        setFullExportProgress(prev => prev ? { ...prev, phase: 'cancelled', message: 'Export cancelled' } : prev);
      } else {
        setExportError(error instanceof Error ? error.message : 'Full ZIP export failed. Please try again.');
        setFullExportProgress(prev => prev ? { ...prev, phase: 'failed', message: 'Export failed' } : prev);
      }
    } finally {
      setIsExportingFull(false);
      fullExportAbortRef.current = null;
    }
  };

  const handleCancelFullExport = () => {
    fullExportAbortRef.current?.abort();
  };

  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className="w-12 bg-card border-l border-border hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-between py-4 select-none shrink-0"
        title="Expand Evidence Pack Builder"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className="p-1.5 hover:bg-muted rounded text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative p-1 text-indigo-600 dark:text-indigo-400">
            <FolderArchive className="w-5 h-5" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[8px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 select-none rotate-90 whitespace-nowrap my-20 origin-center">
          Pack Builder
        </span>
        <button
          type="button"
          className="p-1 hover:bg-muted rounded text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <aside className="w-80 border-l border-border bg-card flex flex-col h-full shrink-0 select-none animate-in slide-in-from-right duration-250 z-30">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Pack Builder</h3>
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Local Draft
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Close pack builder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl text-[9.5px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5 leading-relaxed">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <div>
              <span className="font-bold">Local Draft:</span> Metadata ZIP export is always available. Full private-file export is available for local testing only and uses temporary in-memory access for selected, permitted files.
            </div>
          </div>

          <div className="space-y-3 bg-muted/20 border border-border/60 p-3 rounded-xl">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Pack Name</label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground font-semibold placeholder-muted-foreground"
                placeholder="Enter pack name..."
              />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
              <textarea
                value={packDescription}
                onChange={(e) => setPackDescription(e.target.value)}
                rows={2}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground resize-none placeholder-muted-foreground leading-relaxed"
                placeholder="Describe this audit pack's purpose..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Draft Contents ({activeCount})</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearPack}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {activeCount === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-xl bg-muted/10">
                <Folder className="w-8 h-8 mx-auto text-indigo-500/60 dark:text-indigo-400/60 stroke-[1.5]" />
                <h4 className="text-xs font-bold text-foreground mt-2">Pack is empty</h4>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-normal max-w-[200px] mx-auto">
                  Open a requirement, person, asset, evidence record or action, then choose &quot;Add to pack&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(Object.keys(groupedItems) as PackItemType[]).map((type) => {
                  const itemsOfType = groupedItems[type];
                  if (itemsOfType.length === 0) return null;

                  return (
                    <div key={type} className="space-y-1.5">
                      <h4 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground pl-1">
                        {getTypeLabel(type)}s ({itemsOfType.length})
                      </h4>
                      <div className="space-y-1.5">
                        {itemsOfType.map((item) => {
                          const itemKey = getItemKey(item);
                          const isExpanded = !!expandedItems[itemKey];

                          return (
                            <div
                              key={item.id}
                              className={`border rounded-xl bg-card overflow-hidden transition-all ${
                                item.included ? 'border-border' : 'border-border/40 opacity-60'
                              }`}
                            >
                              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.included}
                                    onChange={() => toggleItemIncluded(item.id, item.type)}
                                    className="rounded border-border text-indigo-650 cursor-pointer h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className="shrink-0">{getTypeIcon(item.type)}</span>
                                  <span className="text-[11px] font-bold text-foreground truncate max-w-[130px]" title={item.title}>
                                    {item.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleItemExpand(itemKey)}
                                    className="p-1 hover:bg-muted rounded text-muted-foreground"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id, item.type)}
                                    className="p-1 hover:bg-rose-500/10 hover:text-rose-600 rounded text-muted-foreground transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-border bg-muted/10 p-2.5 space-y-2 text-[10px]">
                                  <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground block pl-0.5">
                                    Include Options
                                  </span>
                                  <div className="space-y-1.5 pl-0.5">
                                    {Object.keys(item.options).map((optKey) => {
                                      const isFileOption = optKey === 'includeFiles';
                                      return (
                                        <label
                                          key={optKey}
                                          className={`flex items-start gap-2 py-0.5 leading-normal ${
                                            isFileOption
                                              ? 'text-muted-foreground/70 cursor-not-allowed'
                                              : 'text-foreground hover:text-indigo-650 dark:hover:text-indigo-400 cursor-pointer select-none'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={item.options[optKey]}
                                            disabled={isFileOption}
                                            onChange={() => updateItemOptions(item.id, item.type, { [optKey]: !item.options[optKey] })}
                                            className="rounded border-border text-indigo-650 h-3.5 w-3.5 mt-0.5 shrink-0"
                                          />
                                          <div className="flex flex-col">
                                            <span className={`text-[10.5px] font-medium leading-tight ${
                                              isFileOption
                                                ? 'text-muted-foreground/70'
                                                : 'text-foreground/90'
                                            }`}>
                                              {getOptionLabel(optKey)}
                                            </span>
                                            {isFileOption && (
                                              <span className="text-[8px] text-emerald-700 dark:text-emerald-400 font-bold leading-tight mt-0.5 block">
                                                Full export follows the enabled evidence/image sections above.
                                              </span>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2.5 bg-muted/10 shrink-0">
          <div className="text-[10px] text-muted-foreground flex justify-between px-1">
            <span>Included Items:</span>
            <span className="font-bold text-foreground">{includedCount} / {activeCount}</span>
          </div>

          {exportMessage && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              {exportMessage}
            </div>
          )}

          {exportError && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-rose-800 dark:text-rose-300">
              {exportError}
            </div>
          )}

          {fullExportPreview.candidateCount > 0 && (
            <div className={`rounded-lg border px-2.5 py-2 text-[10px] leading-relaxed ${
              fullExportPreview.limitExceeded
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                : fullExportPreview.warningThresholdReached
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  : 'border-border/60 bg-muted/20 text-muted-foreground'
            }`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold text-foreground">
                  Full export preview: {fullExportPreview.candidateCount} file{fullExportPreview.candidateCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1">
                Estimated size: {formatBytes(fullExportPreview.estimatedBytes)}.
                {fullExportPreview.missingSizeCount > 0 && ` ${fullExportPreview.missingSizeCount} file${fullExportPreview.missingSizeCount === 1 ? '' : 's'} have unknown size before fetch.`}
              </div>
            </div>
          )}

          {fullExportProgress && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-indigo-900 dark:text-indigo-200 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{fullExportProgress.message}</span>
                <span className="uppercase tracking-wider text-[8px] font-black">{fullExportProgress.phase}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <span>Candidates: {fullExportProgress.totalCandidates}</span>
                <span>Processed: {fullExportProgress.processedCandidates}</span>
                <span>Included: {fullExportProgress.includedFiles}</span>
                <span>Failed: {fullExportProgress.failedFiles}</span>
                <span>Deferred: {fullExportProgress.deferredFiles}</span>
                <span>Bytes: {formatBytes(fullExportProgress.totalBytes)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Pack Manifest
          </button>

          <button
            type="button"
            onClick={handleMetadataExport}
            disabled={isExportingMetadata || isExportingFull}
            className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-650/60 text-white border border-transparent rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed"
          >
            {isExportingMetadata ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Exporting metadata ZIP...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export metadata pack (.zip)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={isExportingFull ? handleCancelFullExport : handleOpenFullExportConfirm}
            disabled={
              (!isExportingFull && (
                includedCount === 0 ||
                !organization?.id ||
                fullExportPreview.candidateCount === 0 ||
                fullExportPreview.limitExceeded
              )) || isExportingMetadata
            }
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white disabled:text-white/60 border border-transparent rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-colors disabled:cursor-not-allowed leading-tight"
          >
            {isExportingFull ? (
              <>
                <span>Cancel full export</span>
                <span className="text-[8px] text-white/80 font-medium">
                  Stop fetching files and keep the current draft unchanged.
                </span>
              </>
            ) : (
              <>
                <span>Export full pack with files (.zip)</span>
                <span className="text-[8px] text-white/80 font-medium">
                  Selected, permitted private files only. Signed URLs are never stored in the ZIP.
                </span>
              </>
            )}
          </button>

          <p className="px-1 text-[9px] leading-relaxed text-muted-foreground">
            Full export keeps the metadata summaries and adds actual private files only when they are selected, accessible and inside the active organisation. Missing or inaccessible files are logged, not silently omitted.
          </p>
        </div>
      </aside>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-2xl h-[70vh] rounded-2xl flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Planned Export Folder Structure</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  A preview of the export structure generated from the current local draft.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-2 shadow-xs leading-relaxed">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                <div>
                  <span className="font-bold block mb-0.5">Export Structure Preview</span>
                  This preview shows the folder layout and log files. Actual file inclusion depends on the selected records, enabled sections, active organisation and successful permission checks at export time.
                </div>
              </div>

              <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed min-h-[200px] flex flex-col justify-center">
                {includedItems.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 font-sans flex flex-col items-center justify-center space-y-3">
                    <Folder className="w-10 h-10 opacity-30 text-indigo-400 stroke-[1.5]" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-400">Preview Empty</p>
                      <p className="text-[10px] text-zinc-500 leading-normal max-w-[280px]">
                        Add records to your pack and tick their checkboxes to preview the planned export structure.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-indigo-400">LUMEN-Audit-Pack-{sanitizePreviewName(packName)}-{previewRootDate}/</span>
                    <div className="pl-4 space-y-1">
                      <div>|-- 00-Pack-Index/</div>
                      <div className="pl-4 text-zinc-400">|-- pack-summary.json</div>
                      <div className="pl-4 text-zinc-400">|-- pack-summary.csv</div>
                      <div className="pl-4 text-zinc-400">|-- included-items.json</div>
                      <div className="pl-4 text-zinc-400">|-- traceability-map.csv</div>
                      <div className="pl-4 text-zinc-400">`-- export-notes.txt</div>

                      {(Object.keys(groupedItems) as PackItemType[]).map((type) => {
                        const exported = groupedItems[type].filter(item => item.included);
                        if (exported.length === 0) return null;

                        const folderName = ({
                          requirement: '01-Requirements',
                          person: '02-People',
                          asset: '03-Assets',
                          action: '04-Actions',
                          evidence: '05-Evidence-Metadata'
                        } as Record<PackItemType, string>)[type];

                        return (
                          <React.Fragment key={type}>
                            <div>|-- {folderName}/</div>
                            {exported.map(item => (
                              <div key={item.id} className="pl-4">
                                <div>|-- {sanitizePreviewName(item.title)}-{item.id.slice(0, 8)}/</div>
                                <div className="pl-4 text-zinc-500">`-- {getPreviewSummaryFile(type)}</div>
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      <div>|-- 06-Evidence-Files/</div>
                      <div className="pl-4 text-zinc-400">`-- documents/...</div>
                      <div>|-- 07-Image-Attachments/</div>
                      <div className="pl-4 text-zinc-400">`-- assets|people|requirements|actions|documents/...</div>
                      <div>`-- 99-Export-Logs/</div>
                      <div className="pl-4 text-zinc-400">|-- included-files.csv</div>
                      <div className="pl-4 text-zinc-400">|-- failed-files.csv</div>
                      <div className="pl-4 text-zinc-400">|-- deferred-files.csv</div>
                      <div className="pl-4 text-zinc-400">`-- export-limitations.txt</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullExportConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Confirm Full Private-File Export</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  This export uses temporary in-memory access to fetch selected private files.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullExportConfirm(false)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] leading-relaxed text-amber-800 dark:text-amber-300">
                <div className="font-bold mb-1">Before exporting</div>
                <ul className="space-y-1 list-disc pl-4">
                  <li>Only selected, currently accessible files in this organisation will be fetched.</li>
                  <li>Missing or inaccessible files will be listed in <span className="font-bold">failed-files.csv</span>.</li>
                  <li>No signed URLs, public URLs or raw storage paths will be written into the ZIP.</li>
                  <li>Full export is for local testing only and does not certify compliance.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <div className="text-muted-foreground uppercase tracking-wider text-[8px] font-black">Pack Items</div>
                  <div className="text-foreground font-bold text-sm">{includedCount}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <div className="text-muted-foreground uppercase tracking-wider text-[8px] font-black">File Candidates</div>
                  <div className="text-foreground font-bold text-sm">{fullExportPreview.candidateCount}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <div className="text-muted-foreground uppercase tracking-wider text-[8px] font-black">Estimated Size</div>
                  <div className="text-foreground font-bold text-sm">{formatBytes(fullExportPreview.estimatedBytes)}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <div className="text-muted-foreground uppercase tracking-wider text-[8px] font-black">Hard Limits</div>
                  <div className="text-foreground font-bold text-[11px]">
                    {FULL_PACK_EXPORT_LIMITS.maxFiles} files / {formatBytes(FULL_PACK_EXPORT_LIMITS.maxTotalBytes)}
                  </div>
                </div>
              </div>

              {fullExportPreview.reasons.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-[10px] leading-relaxed">
                  <div className="font-bold text-foreground mb-1">Preflight notes</div>
                  <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
                    {fullExportPreview.reasons.map(reason => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowFullExportConfirm(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFullExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Export full pack with files
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
