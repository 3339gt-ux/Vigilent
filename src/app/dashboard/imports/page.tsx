'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
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
type ValidationKind = 'required' | 'format' | 'duplicate' | 'unresolved' | 'guidance' | 'safety';
type ValidationFilter = 'all' | 'valid' | 'warnings' | 'errors' | 'duplicates' | 'unresolved';
type ValidationMessage = { field: string; message: string; kind: ValidationKind };
type CsvRow = Record<string, string>;

type ImportTemplate = {
  id: ImportTypeId;
  title: string;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
  exampleRows: CsvRow[];
  phaseNote: string;
};

type ParsedRow = {
  rowNumber: number;
  source: CsvRow;
  mappedData: CsvRow;
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
    exampleRows: [
      {
        external_id: 'req-forklift-training',
        title: 'Forklift Operator Training',
        description: 'Operators must have current training evidence before operating forklift equipment.',
        category: 'Training',
        risk_level: 'High',
        owner_email: 'operations.manager@example.com',
        review_frequency_months: '12',
        next_review_date: '2026-10-31',
        evidence_required: 'true',
        source_system: 'example_template',
        source_reference: 'TRAIN-001',
        notes: 'Example row only. Replace before using customer data.'
      },
      {
        external_id: 'req-weekly-vehicle-check',
        title: 'Weekly Vehicle Check',
        description: 'Operational vehicles should have a scheduled weekly check record.',
        category: 'Fleet',
        risk_level: 'Medium',
        owner_email: 'fleet.manager@example.com',
        review_frequency_months: '6',
        next_review_date: '2026-09-30',
        evidence_required: 'true',
        source_system: 'example_template',
        source_reference: 'FLEET-001',
        notes: 'Example row only. This does not claim regulatory compliance.'
      }
    ],
    phaseNote: 'Preview only. Live requirement creation remains disabled until import batches are provisioned.'
  },
  {
    id: 'people',
    title: 'People',
    description: 'Employees, contractors, and other people who can hold competency records.',
    requiredColumns: ['external_id', 'first_name', 'last_name'],
    optionalColumns: ['employee_number', 'email', 'department', 'role', 'person_type', 'active', 'start_date', 'notes'],
    exampleRows: [
      {
        external_id: 'person-001',
        employee_number: 'EMP-001',
        first_name: 'Avery',
        last_name: 'Morgan',
        email: 'avery.morgan@example.com',
        department: 'Operations',
        role: 'Forklift Operator',
        person_type: 'Employee',
        active: 'true',
        start_date: '2025-04-01',
        notes: 'Example person for linked competency samples.'
      },
      {
        external_id: 'person-002',
        employee_number: 'EMP-002',
        first_name: 'Riley',
        last_name: 'Patel',
        email: 'riley.patel@example.com',
        department: 'Fleet',
        role: 'Driver',
        person_type: 'Employee',
        active: 'true',
        start_date: '2024-09-15',
        notes: 'Example person for linked competency samples.'
      }
    ],
    phaseNote: 'Preview only. People are not written to the live matrix from this screen in Phase 1.'
  },
  {
    id: 'assets',
    title: 'Assets',
    description: 'Vehicles, equipment, facilities, and other controlled assets.',
    requiredColumns: ['external_id', 'asset_name', 'asset_type'],
    optionalColumns: ['asset_number', 'category', 'subcategory', 'registration_or_serial', 'location', 'department', 'owner_email', 'active', 'notes'],
    exampleRows: [
      {
        external_id: 'asset-forklift-001',
        asset_number: 'FLT-001',
        asset_name: 'Warehouse Forklift 1',
        asset_type: 'Forklift',
        category: 'Warehouse Equipment',
        subcategory: 'Materials Handling',
        registration_or_serial: 'SERIAL-FLT-001',
        location: 'Main Warehouse',
        department: 'Operations',
        owner_email: 'maintenance.manager@example.com',
        active: 'true',
        notes: 'Example asset for linked check assignment samples.'
      },
      {
        external_id: 'asset-trailer-001',
        asset_number: 'TRL-001',
        asset_name: 'Delivery Trailer 1',
        asset_type: 'Trailer',
        category: 'Fleet',
        subcategory: 'Trailers',
        registration_or_serial: 'TRAILER-001',
        location: 'Yard',
        department: 'Fleet',
        owner_email: 'fleet.manager@example.com',
        active: 'true',
        notes: 'Example asset for linked check assignment samples.'
      }
    ],
    phaseNote: 'Preview only. Asset creation waits for import batch commit support.'
  },
  {
    id: 'competency_types',
    title: 'Competency Types',
    description: 'Reusable competency definitions that can later be assigned to people.',
    requiredColumns: ['external_id', 'title', 'category'],
    optionalColumns: ['description', 'validity_period_months', 'evidence_required', 'default_risk_level', 'active', 'notes'],
    exampleRows: [
      {
        external_id: 'comp-forklift',
        title: 'Forklift Operation',
        category: 'Training',
        description: 'Competency record for operating forklift equipment.',
        validity_period_months: '36',
        evidence_required: 'true',
        default_risk_level: 'High',
        active: 'true',
        notes: 'Example competency type for linked records.'
      },
      {
        external_id: 'comp-driver-cpc',
        title: 'Driver CPC',
        category: 'Training',
        description: 'Competency record for professional driving qualification tracking.',
        validity_period_months: '60',
        evidence_required: 'true',
        default_risk_level: 'Medium',
        active: 'true',
        notes: 'Example competency type for linked records.'
      }
    ],
    phaseNote: 'Preview only. Registry persistence still depends on the live data service.'
  },
  {
    id: 'person_competency_records',
    title: 'Person Competency Records',
    description: 'Person-level completion, expiry, provider, trainer, certificate and evidence references.',
    requiredColumns: ['external_id', 'person_external_id', 'competency_external_id', 'status'],
    optionalColumns: ['completed_date', 'expiry_date', 'provider', 'trainer', 'certificate_number', 'evidence_file_name', 'notes'],
    exampleRows: [
      {
        external_id: 'person-001-comp-forklift-2026',
        person_external_id: 'person-001',
        competency_external_id: 'comp-forklift',
        status: 'Valid',
        completed_date: '2026-01-15',
        expiry_date: '2029-01-15',
        provider: 'Example Training Provider',
        trainer: 'Jordan Lee',
        certificate_number: 'CERT-FLT-001',
        evidence_file_name: 'avery-morgan-forklift-certificate.pdf',
        notes: 'Example metadata reference only. Upload the evidence file separately later.'
      },
      {
        external_id: 'person-002-comp-driver-cpc-2026',
        person_external_id: 'person-002',
        competency_external_id: 'comp-driver-cpc',
        status: 'Valid',
        completed_date: '2026-02-10',
        expiry_date: '2031-02-10',
        provider: 'Example Training Provider',
        trainer: 'Sam Quinn',
        certificate_number: 'CERT-CPC-002',
        evidence_file_name: 'riley-patel-driver-cpc-record.pdf',
        notes: 'Example metadata reference only. Upload the evidence file separately later.'
      }
    ],
    phaseNote: 'Requires person and competency references. Unresolved links are held in preview.'
  },
  {
    id: 'asset_check_types',
    title: 'Asset Check Types',
    description: 'Reusable scheduled checks, inspections, services, reviews, or calibrations.',
    requiredColumns: ['external_id', 'title'],
    optionalColumns: ['category', 'description', 'frequency_months', 'warning_days', 'evidence_required', 'risk_level', 'active', 'notes'],
    exampleRows: [
      {
        external_id: 'check-weekly-forklift',
        title: 'Weekly Forklift Check',
        category: 'Inspection',
        description: 'Scheduled weekly condition check for forklift equipment.',
        frequency_months: '1',
        warning_days: '7',
        evidence_required: 'true',
        risk_level: 'High',
        active: 'true',
        notes: 'Example check type for linked asset assignments.'
      },
      {
        external_id: 'check-annual-trailer',
        title: 'Annual Trailer Inspection',
        category: 'Inspection',
        description: 'Scheduled annual inspection record for trailers.',
        frequency_months: '12',
        warning_days: '30',
        evidence_required: 'true',
        risk_level: 'Medium',
        active: 'true',
        notes: 'Example check type for linked asset assignments.'
      }
    ],
    phaseNote: 'Preview only. Check type writes remain gated behind import batch support.'
  },
  {
    id: 'asset_check_assignments',
    title: 'Asset Check Assignments',
    description: 'Assign asset check types to specific assets with due dates and overrides.',
    requiredColumns: ['external_id', 'asset_external_id', 'check_type_external_id'],
    optionalColumns: ['required', 'frequency_months_override', 'next_due_date', 'active', 'notes'],
    exampleRows: [
      {
        external_id: 'asset-forklift-001-check-weekly-forklift',
        asset_external_id: 'asset-forklift-001',
        check_type_external_id: 'check-weekly-forklift',
        required: 'true',
        frequency_months_override: '1',
        next_due_date: '2026-07-01',
        active: 'true',
        notes: 'Example assignment. Import assets and check types first.'
      },
      {
        external_id: 'asset-trailer-001-check-annual-trailer',
        asset_external_id: 'asset-trailer-001',
        check_type_external_id: 'check-annual-trailer',
        required: 'true',
        frequency_months_override: '12',
        next_due_date: '2027-01-31',
        active: 'true',
        notes: 'Example assignment. Import assets and check types first.'
      }
    ],
    phaseNote: 'Requires asset and check type references. Unresolved links block commit.'
  },
  {
    id: 'evidence_metadata',
    title: 'Evidence Metadata',
    description: 'Metadata and external references for evidence. This does not upload files.',
    requiredColumns: ['external_id', 'file_name', 'document_title'],
    optionalColumns: ['evidence_type', 'category', 'issue_date', 'expiry_date', 'review_date', 'source_system', 'external_file_reference', 'tags', 'notes'],
    exampleRows: [
      {
        external_id: 'evidence-forklift-cert-person-001',
        file_name: 'avery-morgan-forklift-certificate.pdf',
        document_title: 'Avery Morgan Forklift Certificate Metadata',
        evidence_type: 'Training Certificate',
        category: 'Training',
        issue_date: '2026-01-15',
        expiry_date: '2029-01-15',
        review_date: '2028-12-15',
        source_system: 'example_template',
        external_file_reference: 'legacy-drive-ref-001',
        tags: 'training;forklift;metadata-only',
        notes: 'Metadata only. This does not upload or link a physical evidence file.'
      },
      {
        external_id: 'evidence-weekly-forklift-check',
        file_name: 'forklift-weekly-check-template-reference.pdf',
        document_title: 'Weekly Forklift Check Metadata',
        evidence_type: 'Inspection Record',
        category: 'Asset Checks',
        issue_date: '2026-06-01',
        expiry_date: '2026-07-01',
        review_date: '2026-06-24',
        source_system: 'example_template',
        external_file_reference: 'legacy-drive-ref-002',
        tags: 'asset-check;metadata-only',
        notes: 'Metadata only. Upload the real file through Evidence Vault in a later workflow.'
      }
    ],
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

const exampleReferenceIds = {
  people: new Set(['person-001', 'person-002']),
  competencyTypes: new Set(['comp-forklift', 'comp-driver-cpc']),
  assets: new Set(['asset-forklift-001', 'asset-trailer-001']),
  assetCheckTypes: new Set(['check-weekly-forklift', 'check-annual-trailer'])
};

const importOrder = [
  ['Requirements', 'Load the obligation/control list before linking evidence or reporting readiness.'],
  ['People', 'People must exist before person competency records can be matched.'],
  ['Assets', 'Assets must exist before scheduled checks can be assigned.'],
  ['Competency Types', 'Competency definitions must exist before person records reference them.'],
  ['Asset Check Types', 'Reusable check definitions must exist before asset assignments reference them.'],
  ['Person Competency Records', 'These rows need matching people and competency types.'],
  ['Asset Check Assignments', 'These rows need matching assets and check types.'],
  ['Evidence Metadata', 'Metadata can be previewed after base records; files are uploaded separately.'],
  ['Evidence link imports later', 'Relationship imports need confirmed base records and link targets.'],
  ['File/ZIP imports later', 'Bulk file upload needs storage, scanning, rollback, and audit controls.']
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

function serializeTemplate(template: ImportTemplate, mode: 'blank' | 'example') {
  const headers = allColumns(template);
  return [
    headers.join(','),
    ...(mode === 'example'
      ? template.exampleRows.map(row => headers.map(header => escapeCsvValue(row[header] || '')).join(','))
      : [])
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

function addMessage(list: ValidationMessage[], field: string, message: string, kind: ValidationKind = 'guidance') {
  list.push({ field, message, kind });
}

function classifyRow(errors: ValidationMessage[], warnings: ValidationMessage[]): ProposedAction {
  if (errors.length > 0) return 'error';
  if (warnings.some(item => item.kind === 'duplicate')) return 'skip';
  return 'create';
}

function rowStatus(row: ParsedRow) {
  if (row.errors.length > 0) return 'Error';
  if (row.warnings.length > 0) return 'Warning';
  return 'Valid';
}

function rowPrimaryLabel(row: ParsedRow) {
  return row.source.title
    || row.source.asset_name
    || [row.source.first_name, row.source.last_name].filter(Boolean).join(' ')
    || row.source.document_title
    || row.source.file_name
    || 'Untitled row';
}

function flattenMessages(messages: ValidationMessage[]) {
  return messages.map(message => `${message.field}: ${message.message}`).join(' | ');
}

function messageFieldsByKind(row: ParsedRow, kind: ValidationKind) {
  return [...row.errors, ...row.warnings]
    .filter(message => message.kind === kind)
    .map(message => message.field)
    .join('; ');
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
  const [dropNotice, setDropNotice] = useState('');
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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
    const warningRows = rows.filter(row => row.errors.length === 0 && row.warnings.length > 0).length;
    const errorRows = rows.filter(row => row.errors.length > 0).length;
    const duplicateRows = rows.filter(row => [...row.errors, ...row.warnings].some(message => message.kind === 'duplicate')).length;
    const unresolvedRows = rows.filter(row => [...row.errors, ...row.warnings].some(message => message.kind === 'unresolved')).length;
    return {
      total: rows.length,
      valid: rows.filter(row => row.errors.length === 0 && row.warnings.length === 0).length,
      warningRows,
      errorRows,
      duplicateRows,
      unresolvedRows,
      create: rows.filter(row => row.proposedAction === 'create').length,
      update: rows.filter(row => row.proposedAction === 'update').length,
      skip: rows.filter(row => row.proposedAction === 'skip').length,
      error: rows.filter(row => row.proposedAction === 'error').length,
      warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0)
    };
  }, [parseResult]);

  const filteredRows = useMemo(() => {
    const rows = parseResult?.rows || [];
    if (validationFilter === 'valid') return rows.filter(row => row.errors.length === 0 && row.warnings.length === 0);
    if (validationFilter === 'warnings') return rows.filter(row => row.errors.length === 0 && row.warnings.length > 0);
    if (validationFilter === 'errors') return rows.filter(row => row.errors.length > 0);
    if (validationFilter === 'duplicates') return rows.filter(row => [...row.errors, ...row.warnings].some(message => message.kind === 'duplicate'));
    if (validationFilter === 'unresolved') return rows.filter(row => [...row.errors, ...row.warnings].some(message => message.kind === 'unresolved'));
    return rows;
  }, [parseResult, validationFilter]);

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
        if (isBlank(row[column])) addMessage(errors, column, `${column} is required. Add a value before this row can be imported.`, 'required');
      });

      if (missingColumns.length > 0) {
        addMessage(errors, 'headers', `This file is missing required column headers: ${missingColumns.join(', ')}. Download the latest template and keep these column names unchanged.`, 'required');
      }

      if (isBlank(row.external_id)) {
        addMessage(errors, 'external_id', 'External ID is required. Add external_id so this row can be matched, audited, and rolled back safely later.', 'required');
      } else if (duplicateExternalIds.has(normalize(row.external_id))) {
        addMessage(errors, 'external_id', 'Duplicate external_id appears in this file. Give each row a unique stable source ID before import.', 'duplicate');
      }

      Object.entries(row).forEach(([field, value]) => {
        if (value.length > 500) addMessage(warnings, field, 'This value is longer than 500 characters. Shorten it or confirm it belongs in notes before import.', 'guidance');
      });

      ['next_review_date', 'start_date', 'completed_date', 'expiry_date', 'next_due_date', 'issue_date', 'review_date'].forEach(field => {
        if (row[field] && !isValidDate(row[field])) addMessage(errors, field, 'Date is invalid. Use YYYY-MM-DD, for example 2026-12-31.', 'format');
      });

      ['review_frequency_months', 'validity_period_months', 'frequency_months', 'warning_days', 'frequency_months_override'].forEach(field => {
        if (row[field] && !isPositiveInteger(row[field])) addMessage(errors, field, 'Use a whole number only, for example 12 for twelve months.', 'format');
      });

      ['active', 'evidence_required', 'required'].forEach(field => {
        if (row[field] && !booleanValues.has(normalize(row[field]))) addMessage(errors, field, 'Use true/false, yes/no, 1/0, or active/inactive.', 'format');
      });

      if (row.risk_level && !riskLevels.has(normalize(row.risk_level))) addMessage(errors, 'risk_level', 'Risk level is not recognised. Use Low, Medium, High, or Critical.', 'format');
      if (row.default_risk_level && !riskLevels.has(normalize(row.default_risk_level))) addMessage(errors, 'default_risk_level', 'Default risk level is not recognised. Use Low, Medium, High, or Critical.', 'format');
      if (row.person_type && !personTypes.has(normalize(row.person_type))) addMessage(errors, 'person_type', 'Person type is not recognised. Use Employee, Contractor, Agency, Driver, Visitor, Consultant, or Other.', 'format');
      if (row.status && template.id === 'person_competency_records' && !competencyStatuses.has(normalize(row.status))) addMessage(errors, 'status', 'Status is not recognised. Use Valid, Expiring Soon, Expired, Missing, or Not Required.', 'format');

      if (template.id === 'requirements') {
        if (isBlank(row.category)) addMessage(errors, 'category', 'Category is required. Add a category so requirements do not become a mixed dumping ground.', 'required');
        if (existingLookups.requirementTitles.has(normalize(row.title || ''))) addMessage(warnings, 'title', 'Possible duplicate existing requirement title. Review this row before creating another requirement.', 'duplicate');
      }

      if (template.id === 'people') {
        if (row.email && existingLookups.personEmails.has(normalize(row.email))) addMessage(warnings, 'email', 'Possible duplicate person email. Confirm whether this row updates an existing person instead of creating a duplicate.', 'duplicate');
        if (row.employee_number && existingLookups.employeeNumbers.has(normalize(row.employee_number))) addMessage(warnings, 'employee_number', 'Possible duplicate employee number. Confirm whether this row updates an existing person instead of creating a duplicate.', 'duplicate');
      }

      if (template.id === 'assets') {
        if (row.asset_number && existingLookups.assetNumbers.has(normalize(row.asset_number))) addMessage(warnings, 'asset_number', 'Possible duplicate asset number. Confirm whether this row updates an existing asset instead of creating a duplicate.', 'duplicate');
        if (row.registration_or_serial && existingLookups.assetSerials.has(normalize(row.registration_or_serial))) addMessage(warnings, 'registration_or_serial', 'Possible duplicate registration or serial number. Check the asset identity before import.', 'duplicate');
      }

      if (template.id === 'competency_types' && existingLookups.competencyTitles.has(normalize(row.title || ''))) {
        addMessage(warnings, 'title', 'Possible duplicate competency type title. Review the registry before creating another competency type.', 'duplicate');
      }

      if (template.id === 'asset_check_types' && existingLookups.checkTypeTitles.has(normalize(row.title || ''))) {
        addMessage(warnings, 'title', 'Possible duplicate asset check type title. Review the Asset Matrix check types before creating another one.', 'duplicate');
      }

      if (template.id === 'person_competency_records') {
        const personReference = normalize(row.person_external_id || '');
        const competencyReference = normalize(row.competency_external_id || '');
        if (personReference && exampleReferenceIds.people.has(personReference)) {
          addMessage(warnings, 'person_external_id', 'This person reference matches the bundled example set. For real imports, import People first and verify the external ID mapping.', 'guidance');
        } else if (!peopleExternalIds.has(personReference)) {
          addMessage(errors, 'person_external_id', 'Person reference was not found. Import the People template first or correct person_external_id.', 'unresolved');
        }
        if (competencyReference && exampleReferenceIds.competencyTypes.has(competencyReference)) {
          addMessage(warnings, 'competency_external_id', 'This competency reference matches the bundled example set. For real imports, import Competency Types first and verify the external ID mapping.', 'guidance');
        } else if (!competencyExternalIds.has(competencyReference)) {
          addMessage(errors, 'competency_external_id', 'Competency type was not found. Import the Competency Types template first or correct competency_external_id.', 'unresolved');
        }
        if (dateBefore(row.expiry_date || '', row.completed_date || '')) addMessage(errors, 'expiry_date', 'Expiry date is before the completed date. Correct one of the dates before import.', 'format');
      }

      if (template.id === 'asset_check_assignments') {
        const assetReference = normalize(row.asset_external_id || '');
        const checkTypeReference = normalize(row.check_type_external_id || '');
        if (assetReference && exampleReferenceIds.assets.has(assetReference)) {
          addMessage(warnings, 'asset_external_id', 'This asset reference matches the bundled example set. For real imports, import Assets first and verify the external ID mapping.', 'guidance');
        } else if (!assetExternalIds.has(assetReference)) {
          addMessage(errors, 'asset_external_id', 'Asset reference was not found. Import the Assets template first or correct asset_external_id.', 'unresolved');
        }
        if (checkTypeReference && exampleReferenceIds.assetCheckTypes.has(checkTypeReference)) {
          addMessage(warnings, 'check_type_external_id', 'This check type reference matches the bundled example set. For real imports, import Asset Check Types first and verify the external ID mapping.', 'guidance');
        } else if (!checkTypeExternalIds.has(checkTypeReference)) {
          addMessage(errors, 'check_type_external_id', 'Check type was not found. Import the Asset Check Types template first or correct check_type_external_id.', 'unresolved');
        }
      }

      if (template.id === 'evidence_metadata') {
        if (isBlank(row.file_name) && isBlank(row.document_title)) addMessage(errors, 'file_name', 'Evidence metadata needs a file name or document title so users can identify the record.', 'required');
        if (dateBefore(row.expiry_date || '', row.issue_date || '')) addMessage(errors, 'expiry_date', 'Expiry date is before the issue date. Correct one of the dates before import.', 'format');
        if (existingLookups.evidenceFileNames.has(normalize(row.file_name || '')) || existingLookups.evidenceTitles.has(normalize(row.document_title || ''))) {
          addMessage(warnings, 'file_name', 'Possible duplicate evidence metadata. Confirm whether this row should update an existing evidence record later.', 'duplicate');
        }
        addMessage(warnings, 'file_name', 'Evidence metadata imports do not upload files. Upload physical evidence separately through the private Evidence Vault workflow.', 'safety');
      }

      const proposedAction = classifyRow(errors, warnings);
      const mappedData = allColumns(template).reduce<CsvRow>((acc, column) => {
        if (!isBlank(row[column])) acc[column] = row[column];
        return acc;
      }, {});
      return { rowNumber: index + 2, source: row, mappedData, errors, warnings, proposedAction };
    });

    return { headers, rows: parsedRows, missingColumns, unknownColumns };
  };

  const handleTemplateDownload = (template: ImportTemplate, mode: 'blank' | 'example') => {
    const blob = new Blob([serializeTemplate(template, mode)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumen_${template.id}_${mode === 'example' ? 'example' : 'blank'}_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleValidationReportDownload = () => {
    if (!parseResult) return;
    const headers = [
      'import_type',
      'row_number',
      'external_id',
      'proposed_action',
      'status',
      'errors',
      'warnings',
      'unresolved_links',
      'duplicate_keys'
    ];
    const reportRows = parseResult.rows.map(row => [
      selectedType,
      String(row.rowNumber),
      row.source.external_id || '',
      row.proposedAction,
      rowStatus(row),
      flattenMessages(row.errors),
      flattenMessages(row.warnings),
      messageFieldsByKind(row, 'unresolved'),
      messageFieldsByKind(row, 'duplicate')
    ]);
    const csv = [
      headers.join(','),
      ...reportRows.map(row => row.map(value => escapeCsvValue(value)).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumen_${selectedType}_validation_report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const toggleExpandedRow = (rowNumber: number) => {
    setExpandedRows(current => {
      const next = new Set(current);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const parseSelectedFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setDropNotice('');
    setParseResult(null);
    setValidationFilter('all');
    setExpandedRows(new Set());

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Only CSV files are accepted here. Evidence file uploads are disabled on the Bulk Import Centre page.');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await parseSelectedFile(file);
    event.target.value = '';
  };

  const handlePageDrag = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setDropNotice('Drop CSV files into the import upload box. Evidence uploads are disabled on this page.');
  };

  const handlePageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsCsvDragging(false);
    setDropNotice('Drop CSV files into the import upload box. Evidence uploads are disabled on this page.');
  };

  const handleCsvDrag = (event: React.DragEvent<HTMLLabelElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setDropNotice('');
    setIsCsvDragging(true);
  };

  const handleCsvDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsCsvDragging(false);
    }
  };

  const handleCsvDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsCsvDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (event.dataTransfer.files.length > 1) {
      setDropNotice('Only the first CSV file will be parsed. Use one import template at a time.');
    }
    await parseSelectedFile(file);
  };

  const statusClass = (action: ProposedAction) => {
    if (action === 'create') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300';
    if (action === 'update') return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300';
    if (action === 'skip') return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300';
  };

  return (
    <div
      className="space-y-6"
      onDragEnter={handlePageDrag}
      onDragOver={handlePageDrag}
      onDrop={handlePageDrop}
    >
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

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold">Recommended Import Order</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Import order matters because relationship rows need stable external IDs from base records. Phase 1.5 still previews only, but the same order should be used when live import is eventually enabled.
            </p>
          </div>
          <span className="inline-flex px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
            Live commit remains disabled
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {importOrder.map(([title, body], index) => (
            <div key={title} className="rounded-lg border border-border bg-muted/25 p-3">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300">Step {index + 1}</span>
              <p className="text-xs font-extrabold text-foreground mt-1">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{body}</p>
            </div>
          ))}
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
                  setDropNotice('');
                  setValidationFilter('all');
                  setExpandedRows(new Set());
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTemplateDownload(selectedTemplate, 'blank')}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground"
                >
                  <Download className="w-4 h-4" /> Blank template
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateDownload(selectedTemplate, 'example')}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Example template
                </button>
              </div>
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
            <label
              onDragEnter={handleCsvDrag}
              onDragOver={handleCsvDrag}
              onDragLeave={handleCsvDragLeave}
              onDrop={handleCsvDrop}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isCsvDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <FileSpreadsheet className={`w-8 h-8 ${isCsvDragging ? 'text-indigo-600 dark:text-indigo-300' : 'text-indigo-500'}`} />
              <span className="text-sm font-extrabold">Upload a CSV for validation preview</span>
              <span className="text-xs text-muted-foreground max-w-xl">
                Drop one CSV file here or choose a template file. Nothing is committed, and evidence uploads are disabled on this page.
              </span>
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileUpload} />
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold">
                <UploadCloud className="w-4 h-4" /> Choose CSV
              </span>
            </label>
            {dropNotice && <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">{dropNotice}</p>}
            {fileName && <p className="text-xs text-muted-foreground mt-2">Selected file: <span className="font-bold text-foreground">{fileName}</span></p>}
            {parseError && <p className="text-xs text-rose-600 dark:text-rose-300 mt-2">{parseError}</p>}
          </div>

          {parseResult && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                {[
                  ['Total rows', stats.total, 'text-foreground'],
                  ['Valid rows', stats.valid, 'text-emerald-600 dark:text-emerald-400'],
                  ['Rows with warnings', stats.warningRows, 'text-amber-600 dark:text-amber-400'],
                  ['Rows with errors', stats.errorRows, 'text-rose-600 dark:text-rose-400'],
                  ['Duplicates', stats.duplicateRows, 'text-orange-600 dark:text-orange-300'],
                  ['Unresolved links', stats.unresolvedRows, 'text-violet-600 dark:text-violet-300'],
                  ['Proposed creates', stats.create, 'text-indigo-600 dark:text-indigo-400'],
                  ['Updates / skips', `${stats.update} / ${stats.skip}`, 'text-muted-foreground']
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
                <div className="p-4 border-b border-border flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">Validation Preview</h3>
                    <p className="text-xs text-muted-foreground mt-1">Review row-level proposed actions, errors, warnings, duplicates, and unresolved links. This is still preview-only.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        ['all', 'All', stats.total],
                        ['valid', 'Valid', stats.valid],
                        ['warnings', 'Warnings', stats.warningRows],
                        ['errors', 'Errors', stats.errorRows],
                        ['duplicates', 'Duplicates', stats.duplicateRows],
                        ['unresolved', 'Unresolved Links', stats.unresolvedRows]
                      ].map(([id, label, count]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setValidationFilter(id as ValidationFilter)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold transition-colors ${
                            validationFilter === id
                              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                              : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {label} <span className="opacity-70">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleValidationReportDownload}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground"
                    >
                      <Download className="w-4 h-4" /> Download Validation Report CSV
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Commit is disabled until import_batches, import_rows, external_references, rollback, audit logging, and hosted RLS verification are complete."
                      className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-muted-foreground cursor-not-allowed"
                    >
                      Commit to live records disabled
                    </button>
                  </div>
                </div>
                <div className="border-b border-border bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                  Live imports require import batch persistence, rollback, hosted Supabase migration/RLS verification, and audit logging. No CSV rows are written to live records from this screen.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Details</th>
                        <th className="p-3 text-left">Row</th>
                        <th className="p-3 text-left">External ID</th>
                        <th className="p-3 text-left">Action</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Primary Label</th>
                        <th className="p-3 text-left">Errors</th>
                        <th className="p-3 text-left">Warnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRows.map(row => {
                        const label = rowPrimaryLabel(row);
                        const status = rowStatus(row);
                        const expanded = expandedRows.has(row.rowNumber);
                        return (
                          <React.Fragment key={`${row.rowNumber}-${row.source.external_id || label}`}>
                            <tr>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedRow(row.rowNumber)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/30 hover:bg-muted text-[10px] font-bold"
                                >
                                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {expanded ? 'Hide' : 'View'}
                                </button>
                              </td>
                              <td className="p-3 font-bold text-muted-foreground">{row.rowNumber}</td>
                              <td className="p-3 font-mono text-[11px] text-muted-foreground">{row.source.external_id || 'Missing'}</td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase ${statusClass(row.proposedAction)}`}>
                                  {row.proposedAction === 'error' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                  {row.proposedAction}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-extrabold ${
                                  status === 'Error'
                                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                    : status === 'Warning'
                                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                  {status}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-foreground">{label}</td>
                              <td className="p-3 font-black text-rose-600 dark:text-rose-300">{row.errors.length}</td>
                              <td className="p-3 font-black text-amber-700 dark:text-amber-300">{row.warnings.length}</td>
                            </tr>
                            {expanded && (
                              <tr className="bg-muted/20">
                                <td colSpan={8} className="p-4">
                                  <div className="grid gap-3 xl:grid-cols-2">
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <h4 className="text-xs font-extrabold">Validation details</h4>
                                      <div className="mt-2 space-y-2">
                                        {row.errors.length > 0 && (
                                          <div>
                                            <span className="text-[10px] uppercase tracking-widest font-extrabold text-rose-600 dark:text-rose-300">Errors</span>
                                            <ul className="mt-1 space-y-1 text-xs text-rose-700 dark:text-rose-300">
                                              {row.errors.map((error, index) => <li key={`error-detail-${index}`}><strong>{error.field}:</strong> {error.message}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                        {row.warnings.length > 0 && (
                                          <div>
                                            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300">Warnings</span>
                                            <ul className="mt-1 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                                              {row.warnings.map((warning, index) => <li key={`warning-detail-${index}`}><strong>{warning.field}:</strong> {warning.message}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                        {row.errors.length === 0 && row.warnings.length === 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">No row issues detected.</p>}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <h4 className="text-xs font-extrabold">Original source row</h4>
                                      <div className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                                        {Object.entries(row.source).map(([field, value]) => <div key={`source-${field}`}><span className="text-foreground">{field}</span>: {value || '(blank)'}</div>)}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <h4 className="text-xs font-extrabold">Mapped data</h4>
                                      <div className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                                        {Object.entries(row.mappedData).map(([field, value]) => <div key={`mapped-${field}`}><span className="text-foreground">{field}</span>: {value}</div>)}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <h4 className="text-xs font-extrabold">Link and duplicate checks</h4>
                                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        <p><strong>Unresolved links:</strong> {messageFieldsByKind(row, 'unresolved') || 'None detected'}</p>
                                        <p><strong>Duplicate matches:</strong> {messageFieldsByKind(row, 'duplicate') || 'None detected'}</p>
                                        <p><strong>Next step:</strong> {row.errors.length > 0 ? 'Fix errors before this row can be considered for import.' : row.warnings.length > 0 ? 'Review warnings before approving any future import batch.' : 'This row is ready for future staged import review.'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">No rows match this filter.</td>
                        </tr>
                      )}
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
