'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Link as LinkIcon,
  ShieldCheck,
  UploadCloud,
  XCircle
} from 'lucide-react';

type ImportTypeId =
  | 'requirements'
  | 'people'
  | 'assets'
  | 'competency_types'
  | 'person_competency_records'
  | 'asset_check_types'
  | 'asset_check_assignments'
  | 'evidence_metadata';

type ProposedAction = 'create' | 'update' | 'skip' | 'error';
type ValidationMessage = { field: string; message: string };
type CsvRow = Record<string, string>;

type ImportTemplate = {
  id: ImportTypeId;
  title: string;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
  example: CsvRow;
  phaseNote: string;
};

type ParsedRow = {
  rowNumber: number;
  source: CsvRow;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  proposedAction: ProposedAction;
};

type ParseResult = {
  headers: string[];
  rows: ParsedRow[];
  missingColumns: string[];
  unknownColumns: string[];
};

const importTemplates: ImportTemplate[] = [
  {
    id: 'requirements',
    title: 'Requirements',
    description: 'Master obligations, controls, review dates, owners, and evidence expectations.',
    requiredColumns: ['external_id', 'title', 'category'],
    optionalColumns: ['description', 'risk_level', 'owner_email', 'review_frequency_months', 'next_review_date', 'evidence_required', 'source_system', 'source_reference', 'notes'],
    example: {
      external_id: 'example_requirement_001',
      title: 'Example Requirement',
      description: 'Describe what must be controlled.',
      category: 'Operational',
      risk_level: 'Medium',
      owner_email: 'owner@example.com',
      review_frequency_months: '12',
      next_review_date: '2026-12-31',
      evidence_required: 'true',
      source_system: 'legacy_register',
      source_reference: 'REQ-001',
      notes: 'Example row only.'
    },
    phaseNote: 'Preview only. Live requirement creation remains disabled until import batches are provisioned.'
  },
  {
    id: 'people',
    title: 'People',
    description: 'Employees, contractors, and other people who can hold competency records.',
    requiredColumns: ['external_id', 'first_name', 'last_name'],
    optionalColumns: ['employee_number', 'email', 'department', 'role', 'person_type', 'active', 'start_date', 'notes'],
    example: {
      external_id: 'example_person_001',
      employee_number: 'EMP-001',
      first_name: 'Example',
      last_name: 'Person',
      email: 'person@example.com',
      department: 'Operations',
      role: 'Operator',
      person_type: 'Employee',
      active: 'true',
      start_date: '2026-01-01',
      notes: 'Example row only.'
    },
    phaseNote: 'Preview only. People are not written to the live matrix from this screen in Phase 1.'
  },
  {
    id: 'assets',
    title: 'Assets',
    description: 'Vehicles, equipment, facilities, and other controlled assets.',
    requiredColumns: ['external_id', 'asset_name', 'asset_type'],
    optionalColumns: ['asset_number', 'category', 'subcategory', 'registration_or_serial', 'location', 'department', 'owner_email', 'active', 'notes'],
    example: {
      external_id: 'example_asset_001',
      asset_number: 'AST-001',
      asset_name: 'Example Asset',
      asset_type: 'Equipment',
      category: 'Operations',
      subcategory: 'Inspection',
      registration_or_serial: 'SERIAL-001',
      location: 'Main Site',
      department: 'Operations',
      owner_email: 'owner@example.com',
      active: 'true',
      notes: 'Example row only.'
    },
    phaseNote: 'Preview only. Asset creation waits for import batch commit support.'
  },
  {
    id: 'competency_types',
    title: 'Competency Types',
    description: 'Reusable competency definitions that can later be assigned to people.',
    requiredColumns: ['external_id', 'title', 'category'],
    optionalColumns: ['description', 'validity_period_months', 'evidence_required', 'default_risk_level', 'active', 'notes'],
    example: {
      external_id: 'example_competency_001',
      title: 'Example Competency',
      category: 'Operational',
      description: 'Describe the competency.',
      validity_period_months: '36',
      evidence_required: 'true',
      default_risk_level: 'Medium',
      active: 'true',
      notes: 'Example row only.'
    },
    phaseNote: 'Preview only. Registry persistence still depends on the live data service.'
  },
  {
    id: 'person_competency_records',
    title: 'Person Competency Records',
    description: 'Person-level completion, expiry, provider, trainer, certificate and evidence references.',
    requiredColumns: ['external_id', 'person_external_id', 'competency_external_id', 'status'],
    optionalColumns: ['completed_date', 'expiry_date', 'provider', 'trainer', 'certificate_number', 'evidence_file_name', 'notes'],
    example: {
      external_id: 'example_record_001',
      person_external_id: 'example_person_001',
      competency_external_id: 'example_competency_001',
      status: 'Valid',
      completed_date: '2026-01-01',
      expiry_date: '2027-01-01',
      provider: 'Example Provider',
      trainer: 'Example Trainer',
      certificate_number: 'CERT-001',
      evidence_file_name: 'example-certificate.pdf',
      notes: 'Example row only.'
    },
    phaseNote: 'Requires person and competency references. Unresolved links are held in preview.'
  },
  {
    id: 'asset_check_types',
    title: 'Asset Check Types',
    description: 'Reusable scheduled checks, inspections, services, reviews, or calibrations.',
    requiredColumns: ['external_id', 'title'],
    optionalColumns: ['category', 'description', 'frequency_months', 'warning_days', 'evidence_required', 'risk_level', 'active', 'notes'],
    example: {
      external_id: 'example_check_type_001',
      title: 'Example Check Type',
      category: 'Inspection',
      description: 'Describe the scheduled check.',
      frequency_months: '12',
      warning_days: '30',
      evidence_required: 'true',
      risk_level: 'Medium',
      active: 'true',
      notes: 'Example row only.'
    },
    phaseNote: 'Preview only. Check type writes remain gated behind import batch support.'
  },
  {
    id: 'asset_check_assignments',
    title: 'Asset Check Assignments',
    description: 'Assign asset check types to specific assets with due dates and overrides.',
    requiredColumns: ['external_id', 'asset_external_id', 'check_type_external_id'],
    optionalColumns: ['required', 'frequency_months_override', 'next_due_date', 'active', 'notes'],
    example: {
      external_id: 'example_assignment_001',
      asset_external_id: 'example_asset_001',
      check_type_external_id: 'example_check_type_001',
      required: 'true',
      frequency_months_override: '12',
      next_due_date: '2026-12-31',
      active: 'true',
      notes: 'Example row only.'
    },
    phaseNote: 'Requires asset and check type references. Unresolved links block commit.'
  },
  {
    id: 'evidence_metadata',
    title: 'Evidence Metadata',
    description: 'Metadata and external references for evidence. This does not upload files.',
    requiredColumns: ['external_id', 'file_name', 'document_title'],
    optionalColumns: ['evidence_type', 'category', 'issue_date', 'expiry_date', 'review_date', 'source_system', 'external_file_reference', 'tags', 'notes'],
    example: {
      external_id: 'example_evidence_001',
      file_name: 'example-record.pdf',
      document_title: 'Example Evidence Metadata',
      evidence_type: 'Certificate',
      category: 'Evidence',
      issue_date: '2026-01-01',
      expiry_date: '2027-01-01',
      review_date: '2026-12-01',
      source_system: 'legacy_drive',
      external_file_reference: 'external-file-id-only',
      tags: 'example;metadata-only',
      notes: 'No physical file is uploaded by this template.'
    },
    phaseNote: 'Metadata only. No fake file upload, signed URL, or storage path is created.'
  }
];

const futureImports = [
  'Evidence-to-Requirement Links',
  'Evidence-to-Person Links',
  'Evidence-to-Asset Links',
  'Evidence-to-Competency Links',
  'Actions'
];

const riskLevels = new Set(['low', 'medium', 'high', 'critical']);
const competencyStatuses = new Set(['valid', 'expiring soon', 'expired', 'missing', 'not required']);
const personTypes = new Set(['employee', 'contractor', 'agency', 'driver', 'visitor', 'consultant', 'other']);
const booleanValues = new Set(['true', 'false', 'yes', 'no', '1', '0', 'active', 'inactive']);

const normalize = (value: string) => value.trim().toLowerCase();
const isBlank = (value: string | undefined) => !value || value.trim() === '';
const allColumns = (template: ImportTemplate) => [...template.requiredColumns, ...template.optionalColumns];

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function serializeTemplate(template: ImportTemplate) {
  const headers = allColumns(template);
  return [
    headers.join(','),
    headers.map(header => escapeCsvValue(template.example[header] || '')).join(',')
  ].join('\n');
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  const headers = (rows[0] || []).map(header => header.trim());
  const dataRows = rows.slice(1).map(values => headers.reduce<CsvRow>((acc, header, index) => {
    acc[header] = values[index]?.trim() || '';
    return acc;
  }, {}));

  return { headers, rows: dataRows };
}

function isValidDate(value: string) {
  if (isBlank(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function dateBefore(a: string, b: string) {
  if (isBlank(a) || isBlank(b) || !isValidDate(a) || !isValidDate(b)) return false;
  return new Date(`${a}T00:00:00Z`).getTime() < new Date(`${b}T00:00:00Z`).getTime();
}

function isPositiveInteger(value: string) {
  if (isBlank(value)) return true;
  return /^\d+$/.test(value) && Number(value) >= 0;
}

function addMessage(list: ValidationMessage[], field: string, message: string) {
  list.push({ field, message });
}

function classifyRow(errors: ValidationMessage[], warnings: ValidationMessage[]): ProposedAction {
  if (errors.length > 0) return 'error';
  if (warnings.some(item => item.message.toLowerCase().includes('duplicate existing'))) return 'skip';
  return 'create';
}

export default function BulkImportCentrePage() {
  const searchParams = useSearchParams();
  const {
    frameworkRequirements,
    people,
    competencyTypes,
    assets,
    assetCheckTypes,
    documents
  } = useApp();

  const initialType = importTemplates.some(template => template.id === searchParams.get('type'))
    ? searchParams.get('type') as ImportTypeId
    : 'requirements';
  const [selectedType, setSelectedType] = useState<ImportTypeId>(initialType);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState('');

  const selectedTemplate = importTemplates.find(template => template.id === selectedType) || importTemplates[0];

  const existingLookups = useMemo(() => ({
    requirementTitles: new Set(frameworkRequirements.map(item => normalize(item.title))),
    personEmails: new Set(people.map(item => normalize(item.email || '')).filter(Boolean)),
    employeeNumbers: new Set(people.map(item => normalize(item.employee_number || '')).filter(Boolean)),
    competencyTitles: new Set(competencyTypes.map(item => normalize(item.title))),
    assetNumbers: new Set(assets.map(item => normalize(item.asset_number || '')).filter(Boolean)),
    assetSerials: new Set(assets.flatMap(item => [item.registration_number, item.serial_number]).map(value => normalize(value || '')).filter(Boolean)),
    checkTypeTitles: new Set(assetCheckTypes.map(item => normalize(item.title))),
    evidenceFileNames: new Set(documents.map(item => normalize(item.file_name || item.original_file_name || '')).filter(Boolean)),
    evidenceTitles: new Set(documents.map(item => normalize(item.title)).filter(Boolean))
  }), [assetCheckTypes, assets, competencyTypes, documents, frameworkRequirements, people]);

  const stats = useMemo(() => {
    const rows = parseResult?.rows || [];
    return {
      total: rows.length,
      create: rows.filter(row => row.proposedAction === 'create').length,
      update: rows.filter(row => row.proposedAction === 'update').length,
      skip: rows.filter(row => row.proposedAction === 'skip').length,
      error: rows.filter(row => row.proposedAction === 'error').length,
      warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0)
    };
  }, [parseResult]);

  const validateRows = (headers: string[], rows: CsvRow[], template: ImportTemplate): ParseResult => {
    const allowedColumns = new Set(allColumns(template));
    const missingColumns = template.requiredColumns.filter(column => !headers.includes(column));
    const unknownColumns = headers.filter(header => header && !allowedColumns.has(header));
    const fileExternalIds = new Set<string>();
    const duplicateExternalIds = new Set<string>();

    rows.forEach(row => {
      const externalId = normalize(row.external_id || '');
      if (!externalId) return;
      if (fileExternalIds.has(externalId)) duplicateExternalIds.add(externalId);
      fileExternalIds.add(externalId);
    });

    const peopleExternalIds = new Set(rows.map(row => normalize(row.external_id || '')).filter(Boolean));
    const competencyExternalIds = new Set(rows.map(row => normalize(row.external_id || '')).filter(Boolean));
    const assetExternalIds = new Set(rows.map(row => normalize(row.external_id || '')).filter(Boolean));
    const checkTypeExternalIds = new Set(rows.map(row => normalize(row.external_id || '')).filter(Boolean));

    const parsedRows = rows.map((row, index) => {
      const errors: ValidationMessage[] = [];
      const warnings: ValidationMessage[] = [];

      template.requiredColumns.forEach(column => {
        if (isBlank(row[column])) addMessage(errors, column, 'Required column is empty.');
      });

      if (missingColumns.length > 0) {
        addMessage(errors, 'headers', `Missing required columns: ${missingColumns.join(', ')}`);
      }

      if (isBlank(row.external_id)) {
        addMessage(errors, 'external_id', 'Stable external_id is required for safe preview, matching, and rollback.');
      } else if (duplicateExternalIds.has(normalize(row.external_id))) {
        addMessage(errors, 'external_id', 'Duplicate external_id appears in this file.');
      }

      Object.entries(row).forEach(([field, value]) => {
        if (value.length > 500) addMessage(warnings, field, 'Value is longer than 500 characters and may need cleanup before import.');
      });

      ['next_review_date', 'start_date', 'completed_date', 'expiry_date', 'next_due_date', 'issue_date', 'review_date'].forEach(field => {
        if (row[field] && !isValidDate(row[field])) addMessage(errors, field, 'Date must use YYYY-MM-DD format.');
      });

      ['review_frequency_months', 'validity_period_months', 'frequency_months', 'warning_days', 'frequency_months_override'].forEach(field => {
        if (row[field] && !isPositiveInteger(row[field])) addMessage(errors, field, 'Value must be a positive whole number.');
      });

      ['active', 'evidence_required', 'required'].forEach(field => {
        if (row[field] && !booleanValues.has(normalize(row[field]))) addMessage(errors, field, 'Boolean must be true/false, yes/no, 1/0, active/inactive.');
      });

      if (row.risk_level && !riskLevels.has(normalize(row.risk_level))) addMessage(errors, 'risk_level', 'Risk level must be Low, Medium, High, or Critical.');
      if (row.default_risk_level && !riskLevels.has(normalize(row.default_risk_level))) addMessage(errors, 'default_risk_level', 'Default risk level must be Low, Medium, High, or Critical.');
      if (row.person_type && !personTypes.has(normalize(row.person_type))) addMessage(errors, 'person_type', 'Person type is not recognised.');
      if (row.status && template.id === 'person_competency_records' && !competencyStatuses.has(normalize(row.status))) addMessage(errors, 'status', 'Status must be Valid, Expiring Soon, Expired, Missing, or Not Required.');

      if (template.id === 'requirements') {
        if (isBlank(row.category)) addMessage(errors, 'category', 'Category is required to prevent dumping-ground imports.');
        if (existingLookups.requirementTitles.has(normalize(row.title || ''))) addMessage(warnings, 'title', 'Possible duplicate existing requirement title. Proposed action is skip until reviewed.');
      }

      if (template.id === 'people') {
        if (row.email && existingLookups.personEmails.has(normalize(row.email))) addMessage(warnings, 'email', 'Possible duplicate existing person email. Proposed action is skip until reviewed.');
        if (row.employee_number && existingLookups.employeeNumbers.has(normalize(row.employee_number))) addMessage(warnings, 'employee_number', 'Possible duplicate existing employee number. Proposed action is skip until reviewed.');
      }

      if (template.id === 'assets') {
        if (row.asset_number && existingLookups.assetNumbers.has(normalize(row.asset_number))) addMessage(warnings, 'asset_number', 'Possible duplicate existing asset number. Proposed action is skip until reviewed.');
        if (row.registration_or_serial && existingLookups.assetSerials.has(normalize(row.registration_or_serial))) addMessage(warnings, 'registration_or_serial', 'Possible duplicate existing registration or serial number. Proposed action is skip until reviewed.');
      }

      if (template.id === 'competency_types' && existingLookups.competencyTitles.has(normalize(row.title || ''))) {
        addMessage(warnings, 'title', 'Possible duplicate existing competency type title. Proposed action is skip until reviewed.');
      }

      if (template.id === 'asset_check_types' && existingLookups.checkTypeTitles.has(normalize(row.title || ''))) {
        addMessage(warnings, 'title', 'Possible duplicate existing asset check type title. Proposed action is skip until reviewed.');
      }

      if (template.id === 'person_competency_records') {
        if (!peopleExternalIds.has(normalize(row.person_external_id || ''))) addMessage(errors, 'person_external_id', 'Unresolved person_external_id in this preview. Import/link people first.');
        if (!competencyExternalIds.has(normalize(row.competency_external_id || ''))) addMessage(errors, 'competency_external_id', 'Unresolved competency_external_id in this preview. Import/link competency types first.');
        if (dateBefore(row.expiry_date || '', row.completed_date || '')) addMessage(errors, 'expiry_date', 'Expiry date cannot be before completed date.');
      }

      if (template.id === 'asset_check_assignments') {
        if (!assetExternalIds.has(normalize(row.asset_external_id || ''))) addMessage(errors, 'asset_external_id', 'Unresolved asset_external_id in this preview. Import/link assets first.');
        if (!checkTypeExternalIds.has(normalize(row.check_type_external_id || ''))) addMessage(errors, 'check_type_external_id', 'Unresolved check_type_external_id in this preview. Import/link asset check types first.');
      }

      if (template.id === 'evidence_metadata') {
        if (isBlank(row.file_name) && isBlank(row.document_title)) addMessage(errors, 'file_name', 'Provide at least file_name or document_title.');
        if (dateBefore(row.expiry_date || '', row.issue_date || '')) addMessage(errors, 'expiry_date', 'Expiry date cannot be before issue date.');
        if (existingLookups.evidenceFileNames.has(normalize(row.file_name || '')) || existingLookups.evidenceTitles.has(normalize(row.document_title || ''))) {
          addMessage(warnings, 'file_name', 'Possible duplicate existing evidence metadata. Proposed action is skip until reviewed.');
        }
        addMessage(warnings, 'file_name', 'Metadata-only preview. No physical file is uploaded and no signed URL will be created.');
      }

      const proposedAction = classifyRow(errors, warnings);
      return { rowNumber: index + 2, source: row, errors, warnings, proposedAction };
    });

    return { headers, rows: parsedRows, missingColumns, unknownColumns };
  };

  const handleTemplateDownload = (template: ImportTemplate) => {
    const blob = new Blob([serializeTemplate(template)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumen_${template.id}_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setParseResult(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Upload a CSV file generated from one of the templates.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        setParseError('CSV file has no header row.');
        return;
      }
      setParseResult(validateRows(parsed.headers, parsed.rows, selectedTemplate));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unable to parse CSV file.');
    }
  };

  const statusClass = (action: ProposedAction) => {
    if (action === 'create') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300';
    if (action === 'update') return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300';
    if (action === 'skip') return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-600 dark:text-indigo-400">Preview-first data onboarding</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Bulk Import Centre</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Analyse customer CSV exports before anything reaches live records. Phase 1 downloads templates, parses CSV, validates rows, reports unresolved links, and keeps commit disabled until import batch storage is provisioned.
          </p>
        </div>
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground">
          <ShieldCheck className="w-4 h-4" /> Check workspace readiness
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['No direct live import', 'CSV uploads are parsed into a validation preview only.'],
          ['Evidence metadata only', 'Evidence imports never create fake files, signed URLs, or storage paths.'],
          ['External IDs required', 'Stable source IDs are required for matching, rollback, and future sync.']
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-extrabold text-foreground">{title}</span>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-extrabold">Preview Wizard</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
            {['Select type', 'Download template', 'Upload CSV', 'Parse file', 'Validate rows', 'Preview issues', 'Save draft', 'Commit'].map((step, index) => (
              <div key={step} className={`rounded-lg border p-2 text-[10px] font-extrabold ${
                index <= 5
                  ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-border bg-muted/30 text-muted-foreground'
              }`}>
                <span className="block text-[9px] opacity-70">Step {index + 1}</span>
                {step}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Steps 7 and 8 stay disabled until the import batch tables are applied and the commit workflow has rollback/audit support.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-extrabold">Recent Import Batches</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            No persisted batches are shown in Phase 1. Batch history will appear here after `import_batches` and `import_rows` are provisioned and connected.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-extrabold">Supported Phase 1 Imports</h2>
          <div className="space-y-2">
            {importTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedType(template.id);
                  setParseResult(null);
                  setFileName('');
                  setParseError('');
                }}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedType === template.id
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-foreground'
                    : 'border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="block text-xs font-extrabold">{template.title}</span>
                <span className="block text-[11px] mt-1 leading-relaxed">{template.description}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-dashed border-border p-3">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground">Future link imports</span>
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {futureImports.map(item => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">{selectedTemplate.title}</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{selectedTemplate.phaseNote}</p>
              </div>
              <button
                type="button"
                onClick={() => handleTemplateDownload(selectedTemplate)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Download className="w-4 h-4" /> Download CSV Template
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground">Required columns</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTemplate.requiredColumns.map(column => (
                    <span key={column} className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-700 dark:text-rose-300">{column}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground">Optional columns</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTemplate.optionalColumns.map(column => (
                    <span key={column} className="px-2 py-1 rounded-md bg-card border border-border text-[10px] font-bold text-muted-foreground">{column}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
              <span className="text-sm font-extrabold">Upload a CSV for validation preview</span>
              <span className="text-xs text-muted-foreground max-w-xl">
                Nothing is committed. The file is parsed in the browser and checked against the selected template and current workspace records.
              </span>
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileUpload} />
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold">
                <UploadCloud className="w-4 h-4" /> Choose CSV
              </span>
            </label>
            {fileName && <p className="text-xs text-muted-foreground mt-2">Selected file: <span className="font-bold text-foreground">{fileName}</span></p>}
            {parseError && <p className="text-xs text-rose-600 dark:text-rose-300 mt-2">{parseError}</p>}
          </div>

          {parseResult && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ['Rows', stats.total, 'text-foreground'],
                  ['Create', stats.create, 'text-emerald-600 dark:text-emerald-400'],
                  ['Skip', stats.skip, 'text-amber-600 dark:text-amber-400'],
                  ['Errors', stats.error, 'text-rose-600 dark:text-rose-400'],
                  ['Warnings', stats.warnings, 'text-indigo-600 dark:text-indigo-400']
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground">{label}</span>
                    <span className={`block text-2xl font-black mt-1 ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>

              {(parseResult.missingColumns.length > 0 || parseResult.unknownColumns.length > 0) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {parseResult.missingColumns.length > 0 && <p><strong>Missing required headers:</strong> {parseResult.missingColumns.join(', ')}</p>}
                      {parseResult.unknownColumns.length > 0 && <p><strong>Unknown headers:</strong> {parseResult.unknownColumns.join(', ')}. These are preserved in preview but should be mapped before commit.</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">Validation Preview</h3>
                    <p className="text-xs text-muted-foreground mt-1">Review row-level proposed actions, errors, warnings, duplicates, and unresolved links.</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Commit is disabled until import_batches, import_rows, and external_references are applied and verified."
                    className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-muted-foreground cursor-not-allowed"
                  >
                    Commit Disabled
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Row</th>
                        <th className="p-3 text-left">Action</th>
                        <th className="p-3 text-left">External ID</th>
                        <th className="p-3 text-left">Primary Label</th>
                        <th className="p-3 text-left">Messages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseResult.rows.map(row => {
                        const label = row.source.title || row.source.asset_name || [row.source.first_name, row.source.last_name].filter(Boolean).join(' ') || row.source.document_title || row.source.file_name || 'Untitled row';
                        return (
                          <tr key={`${row.rowNumber}-${row.source.external_id || label}`}>
                            <td className="p-3 font-bold text-muted-foreground">{row.rowNumber}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase ${statusClass(row.proposedAction)}`}>
                                {row.proposedAction === 'error' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                {row.proposedAction}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-muted-foreground">{row.source.external_id || 'Missing'}</td>
                            <td className="p-3 font-bold text-foreground">{label}</td>
                            <td className="p-3">
                              <div className="space-y-1">
                                {row.errors.map((error, index) => (
                                  <p key={`error-${index}`} className="text-rose-600 dark:text-rose-300"><strong>{error.field}:</strong> {error.message}</p>
                                ))}
                                {row.warnings.map((warning, index) => (
                                  <p key={`warning-${index}`} className="text-amber-700 dark:text-amber-300"><strong>{warning.field}:</strong> {warning.message}</p>
                                ))}
                                {row.errors.length === 0 && row.warnings.length === 0 && (
                                  <p className="text-emerald-600 dark:text-emerald-400">No row issues detected.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold">Phase 1 boundary</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This centre deliberately stops at analysis. Live commits require the proposed import batch schema, permission checks, row snapshots, duplicate review, and rollback handling. Evidence file or ZIP upload is deferred; this page accepts metadata references only.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/40"><LinkIcon className="w-3 h-3" /> Unresolved links are reported</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/40"><ShieldCheck className="w-3 h-3" /> No storage paths or signed URLs</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/40"><AlertTriangle className="w-3 h-3" /> Commit gated</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
