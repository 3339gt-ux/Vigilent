'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Action,
  AuditPack,
  EvidenceDocument,
  Requirement,
  RequirementStatus
} from '@/lib/types';
import {
  AlertCircle,
  Archive,
  Check,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  FolderArchive,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert
} from 'lucide-react';
import {
  calculateRequirementStatus,
  getLinkedDocumentsForRequirement,
  getRequirementStatusLabel
} from '@/lib/requirementsEngine';

type PackStatus = 'Draft' | 'Ready' | 'Sent' | 'Archived';

interface AssessedRequirement {
  requirement: Requirement;
  status: RequirementStatus;
  linkedDocuments: EvidenceDocument[];
  openActions: Action[];
  warnings: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 30;
const PACK_STATUSES: PackStatus[] = ['Draft', 'Ready', 'Sent', 'Archived'];

const normalizePackStatus = (status: AuditPack['status']): PackStatus =>
  status === 'Active' ? 'Ready' : status;

const daysUntil = (dateValue: string | null | undefined) => {
  if (!dateValue) return null;
  return Math.ceil((new Date(dateValue).getTime() - Date.now()) / DAY_MS);
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const statusClass = (status: RequirementStatus | PackStatus) => {
  if (status === 'GREEN' || status === 'Ready') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  if (status === 'AMBER' || status === 'Draft') return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
  if (status === 'RED') return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
  if (status === 'Sent') return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
  return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
};

export default function AuditPackBuilder() {
  const {
    frameworkRequirements,
    requirementDocuments,
    documents,
    actions,
    requirementActions,
    auditPacks,
    createPack,
    updatePackStatus,
    getDocumentSignedUrl
  } = useApp();

  const [step, setStep] = useState(1);
  const [packName, setPackName] = useState('');
  const [packDesc, setPackDesc] = useState('');
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [newlyCreatedPack, setNewlyCreatedPack] = useState<AuditPack | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assessedRequirements = useMemo<AssessedRequirement[]>(() => {
    return frameworkRequirements.map(requirement => {
      const linkedDocuments = getLinkedDocumentsForRequirement(requirement.id, documents, requirementDocuments);
      const status = calculateRequirementStatus(requirement, linkedDocuments);
      const linkedActionIds = new Set(
        requirementActions
          .filter(link => link.requirement_id === requirement.id)
          .map(link => link.action_id)
      );
      const openActions = actions.filter(action => linkedActionIds.has(action.id) && action.status !== 'Closed');
      const warnings: string[] = [];

      if (linkedDocuments.length === 0) {
        warnings.push('Missing linked evidence');
      }

      const dueDays = daysUntil(requirement.next_due_date);
      if (dueDays !== null && dueDays < 0) {
        warnings.push('Requirement review overdue');
      } else if (dueDays !== null && dueDays <= WARNING_DAYS) {
        warnings.push('Requirement review due soon');
      }

      linkedDocuments.forEach(document => {
        const expiryDays = daysUntil(document.expiry_date);
        if (document.status === 'Expired' || (expiryDays !== null && expiryDays < 0)) {
          warnings.push(`${document.title} expired`);
        } else if (document.status === 'Expiring Soon' || (expiryDays !== null && expiryDays <= WARNING_DAYS)) {
          warnings.push(`${document.title} expires soon`);
        }
      });

      if (openActions.length > 0) {
        warnings.push(`${openActions.length} open action${openActions.length === 1 ? '' : 's'}`);
      }

      return {
        requirement,
        status,
        linkedDocuments,
        openActions,
        warnings: Array.from(new Set(warnings))
      };
    });
  }, [actions, documents, frameworkRequirements, requirementActions, requirementDocuments]);

  const filteredRequirements = assessedRequirements.filter(item => {
    const term = search.toLowerCase();
    return (
      item.requirement.title.toLowerCase().includes(term) ||
      item.requirement.category.toLowerCase().includes(term) ||
      (item.requirement.owner || '').toLowerCase().includes(term)
    );
  });

  const selectedRows = assessedRequirements.filter(item => selectedRequirementIds.includes(item.requirement.id));
  const selectedDocuments = Array.from(
    new Map(
      selectedRows
        .flatMap(item => item.linkedDocuments)
        .filter(document => document.status !== 'deleted')
        .map(document => [document.id, document])
    ).values()
  );
  const warningCount = selectedRows.reduce((total, item) => total + item.warnings.length, 0);
  const openActionCount = selectedRows.reduce((total, item) => total + item.openActions.length, 0);
  const missingEvidenceCount = selectedRows.filter(item => item.linkedDocuments.length === 0).length;

  const buildRowsForRequirements = (requirementIds: string[]) =>
    assessedRequirements.filter(item => requirementIds.includes(item.requirement.id));

  const toggleRequirementSelection = (id: string) => {
    setSelectedRequirementIds(prev =>
      prev.includes(id) ? prev.filter(requirementId => requirementId !== id) : [...prev, id]
    );
  };

  const resetBuilder = () => {
    setStep(1);
    setPackName('');
    setPackDesc('');
    setSelectedRequirementIds([]);
    setNewlyCreatedPack(null);
    setMessage(null);
    setError(null);
  };

  const handleCreatePack = async () => {
    if (!packName.trim() || selectedRequirementIds.length === 0) return;

    setIsCreating(true);
    setError(null);
    setMessage(null);
    try {
      const pack = await createPack(
        packName.trim(),
        packDesc.trim(),
        selectedRequirementIds,
        selectedDocuments.map(document => document.id)
      );
      setNewlyCreatedPack(pack);
      setMessage('Audit pack saved as Draft.');
      setStep(4);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unable to create audit pack.';
      setError(detail);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenDocument = async (document: EvidenceDocument) => {
    setOpeningDocumentId(document.id);
    setError(null);
    try {
      const signedUrl = await getDocumentSignedUrl(document.id);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unable to create a signed document URL.';
      setError(detail);
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const exportCsv = (name: string, rows: AssessedRequirement[]) => {
    const headers = [
      'Requirement',
      'Category',
      'Owner',
      'Status',
      'Next Due Date',
      'Linked Evidence',
      'Missing Evidence',
      'Open Actions',
      'Warnings'
    ];
    const csvRows = rows.map(item => [
      item.requirement.title,
      item.requirement.category,
      item.requirement.owner || 'Unassigned',
      getRequirementStatusLabel(item.status),
      item.requirement.next_due_date || '',
      item.linkedDocuments.map(document => document.title).join('; '),
      item.linkedDocuments.length === 0 ? 'Yes' : 'No',
      item.openActions.map(action => action.title).join('; '),
      item.warnings.join('; ')
    ]);
    const content = [headers, ...csvRows].map(row => row.map(csvEscape).join(',')).join('\r\n');
    const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'audit-pack'}.csv`;
    downloadTextFile(filename, content, 'text/csv;charset=utf-8');
  };

  const exportPrintPdf = (name: string, rows: AssessedRequirement[]) => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setError('Unable to open the print window. Check browser popup settings.');
      return;
    }

    const bodyRows = rows.map(item => `
      <tr>
        <td>${escapeHtml(item.requirement.title)}</td>
        <td>${escapeHtml(item.requirement.category)}</td>
        <td>${escapeHtml(item.requirement.owner || 'Unassigned')}</td>
        <td>${escapeHtml(getRequirementStatusLabel(item.status))}</td>
        <td>${escapeHtml(item.requirement.next_due_date || 'Not set')}</td>
        <td>${escapeHtml(item.linkedDocuments.map(document => document.title).join(', ') || 'Missing')}</td>
        <td>${escapeHtml(item.openActions.map(action => action.title).join(', ') || 'None')}</td>
        <td>${escapeHtml(item.warnings.join(', ') || 'None')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(name)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(name)}</h1>
          <p>Generated by Vigilen from selected requirements and linked private evidence records. Document files must be opened inside Vigilen using temporary signed URLs.</p>
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Next Due</th>
                <th>Linked Evidence</th>
                <th>Open Actions</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const selectedPackRows = newlyCreatedPack ? buildRowsForRequirements(newlyCreatedPack.requirements) : selectedRows;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="packs-heading">Audit Pack Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build internal audit packs from selected requirements, linked evidence records, warnings, and open actions.
        </p>
      </div>

      {(error || message) && (
        <div className={`border rounded-xl p-3 text-xs font-semibold flex items-start gap-2 ${
          error ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {error ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <Check className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Requirement Pack Workflow
            </span>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
              {['Details', 'Requirements', 'Review', 'Saved'].map((label, index) => (
                <span
                  key={label}
                  className={`px-2 py-0.5 rounded ${step === index + 1 ? 'bg-indigo-500/10 text-indigo-500' : ''}`}
                >
                  {index + 1}. {label}
                </span>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="pack-name-input" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Audit Pack Name
                </label>
                <input
                  id="pack-name-input"
                  type="text"
                  required
                  value={packName}
                  onChange={event => setPackName(event.target.value)}
                  placeholder="e.g. Q2 Operations Readiness Pack"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label htmlFor="pack-desc-input" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Purpose / Description
                </label>
                <textarea
                  id="pack-desc-input"
                  rows={3}
                  value={packDesc}
                  onChange={event => setPackDesc(event.target.value)}
                  placeholder="Briefly describe the operational scope for this pack."
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!packName.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg text-xs"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-muted-foreground">
                  Select Requirements ({selectedRequirementIds.length} chosen)
                </span>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search requirements..."
                    className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border/80 rounded-lg text-[10px] outline-none"
                  />
                </div>
              </div>

              <div className="border border-border/85 rounded-xl divide-y divide-border/60 max-h-[420px] overflow-y-auto bg-muted/10">
                {filteredRequirements.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">No requirements found.</p>
                ) : (
                  filteredRequirements.map(item => {
                    const isChecked = selectedRequirementIds.includes(item.requirement.id);
                    return (
                      <button
                        type="button"
                        key={item.requirement.id}
                        onClick={() => toggleRequirementSelection(item.requirement.id)}
                        className={`w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors ${
                          isChecked ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 text-xs overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="accent-indigo-600 rounded shrink-0 mt-0.5"
                          />
                          <div className="overflow-hidden">
                            <span className="font-bold block truncate text-foreground">{item.requirement.title}</span>
                            <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                              {item.requirement.category} | Owner: {item.requirement.owner || 'Unassigned'} | Evidence: {item.linkedDocuments.length}
                            </span>
                            {item.warnings.length > 0 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block truncate mt-1">
                                {item.warnings.join(' | ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 border ${statusClass(item.status)}`}>
                          {getRequirementStatusLabel(item.status)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-between text-xs">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg border border-border"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedRequirementIds.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg"
                >
                  Review Pack
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 border border-border/80 rounded-lg">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Requirements</span>
                  <strong className="block text-lg mt-1">{selectedRows.length}</strong>
                </div>
                <div className="p-3 bg-muted/40 border border-border/80 rounded-lg">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Linked Documents</span>
                  <strong className="block text-lg mt-1">{selectedDocuments.length}</strong>
                </div>
                <div className="p-3 bg-muted/40 border border-border/80 rounded-lg">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Missing Evidence</span>
                  <strong className="block text-lg mt-1">{missingEvidenceCount}</strong>
                </div>
                <div className="p-3 bg-muted/40 border border-border/80 rounded-lg">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Open Actions</span>
                  <strong className="block text-lg mt-1">{openActionCount}</strong>
                </div>
              </div>

              {warningCount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 flex gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This pack includes {warningCount} warning{warningCount === 1 ? '' : 's'} across missing evidence, due dates, expiry dates, and open actions.</span>
                </div>
              )}

              <div className="border border-border rounded-xl divide-y divide-border/60">
                {selectedRows.map(item => (
                  <div key={item.requirement.id} className="p-4 space-y-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <span className="font-bold block">{item.requirement.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.requirement.category} | Next due: {item.requirement.next_due_date || 'Not set'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 h-fit text-[9px] rounded font-bold uppercase border ${statusClass(item.status)}`}>
                        {getRequirementStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Linked Documents</span>
                        {item.linkedDocuments.length === 0 ? (
                          <p className="text-[10px] text-red-600 dark:text-red-400">No evidence linked.</p>
                        ) : (
                          item.linkedDocuments.map(document => (
                            <button
                              key={document.id}
                              onClick={() => handleOpenDocument(document)}
                              className="w-full text-left flex items-center gap-1.5 text-[10px] font-semibold text-indigo-500 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{openingDocumentId === document.id ? 'Creating signed URL...' : document.title}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Open Actions</span>
                        {item.openActions.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">None</p>
                        ) : (
                          item.openActions.map(action => (
                            <p key={action.id} className="text-[10px] text-foreground font-semibold">
                              {action.title}{action.due_date ? ` due ${action.due_date}` : ''}
                            </p>
                          ))
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Warnings</span>
                        {item.warnings.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">None</p>
                        ) : (
                          item.warnings.map(warning => (
                            <p key={warning} className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{warning}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg border border-border"
                >
                  Back
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportCsv(packName, selectedRows)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    onClick={() => exportPrintPdf(packName, selectedRows)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / PDF
                  </button>
                  <button
                    onClick={handleCreatePack}
                    disabled={isCreating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg flex items-center gap-1.5"
                  >
                    {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                    Save Draft Pack
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && newlyCreatedPack && (
            <div className="space-y-6 text-center py-6 text-xs max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileArchive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-foreground">Audit Pack Saved</h3>
                <p className="text-xs text-muted-foreground">
                  The pack is saved internally. Evidence files remain private and open through temporary signed URLs.
                </p>
              </div>
              <div className="bg-muted/40 border border-border/80 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Name:</span>
                  <span>{newlyCreatedPack.name}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Requirements:</span>
                  <span>{newlyCreatedPack.requirements.length}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Linked Documents:</span>
                  <span>{newlyCreatedPack.documents.length}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Status:</span>
                  <span>{normalizePackStatus(newlyCreatedPack.status)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCsv(newlyCreatedPack.name, selectedPackRows)}
                  className="w-1/3 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => exportPrintPdf(newlyCreatedPack.name, selectedPackRows)}
                  className="w-1/3 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={resetBuilder}
                  className="w-1/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                >
                  New Pack
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
            Audit Packs
          </span>

          {auditPacks.length === 0 ? (
            <div className="bg-card border border-border p-6 rounded-xl text-center text-xs text-muted-foreground">
              No audit packs created yet. Select requirements to build the first pack.
            </div>
          ) : (
            <div className="space-y-4">
              {auditPacks.map(pack => {
                const packStatus = normalizePackStatus(pack.status);
                const rows = buildRowsForRequirements(pack.requirements || []);
                return (
                  <div key={pack.id} className="bg-card border border-border p-4 rounded-xl space-y-4 text-xs shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="overflow-hidden mr-2">
                        <span className="font-bold block truncate text-foreground leading-normal" title={pack.name}>{pack.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                          Created {new Date(pack.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 border ${statusClass(packStatus)}`}>
                        {packStatus}
                      </span>
                    </div>

                    {pack.description && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                        {pack.description}
                      </p>
                    )}

                    <div className="p-2.5 bg-muted/40 rounded-lg space-y-1.5 text-[10px] font-semibold text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Requirements:</span>
                        <span className="text-foreground font-bold">{(pack.requirements || []).length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Linked documents:</span>
                        <span className="text-foreground font-bold">{pack.documents.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Private access:</span>
                        <span className="text-foreground font-bold">Signed URLs only</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor={`pack-status-${pack.id}`} className="block text-[10px] font-bold uppercase text-muted-foreground">
                        Status
                      </label>
                      <select
                        id={`pack-status-${pack.id}`}
                        value={packStatus}
                        onChange={event => updatePackStatus(pack.id, event.target.value as PackStatus)}
                        className="w-full px-2 py-1.5 bg-muted border border-border/80 rounded text-[10px] font-bold outline-none"
                      >
                        {PACK_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => exportCsv(pack.name, rows)}
                        disabled={rows.length === 0}
                        className="py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground font-bold border border-border rounded flex items-center justify-center gap-1 text-[10px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                      <button
                        onClick={() => exportPrintPdf(pack.name, rows)}
                        disabled={rows.length === 0}
                        className="py-1.5 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground font-bold border border-border rounded flex items-center justify-center gap-1 text-[10px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-card border border-border p-4 rounded-xl text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <FolderArchive className="w-4 h-4 text-indigo-500" />
              Pack Contents
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Packs store requirement IDs and linked document IDs only. Documents remain in private storage and must be opened from inside Vigilen.
            </p>
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Archive className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Archived packs stay available in the register but are no longer treated as active working packs.</span>
            </div>
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Exports are summaries of the pack register and do not include public document links.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
