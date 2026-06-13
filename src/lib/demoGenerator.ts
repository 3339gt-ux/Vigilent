// src/lib/demoGenerator.ts

import { MOCK_ORG, MOCK_PROFILE } from './db';
import {
  Person,
  CompetencyType,
  CompetencyRecord,
  CompetencyRecordDocument,
  Asset,
  AssetCheckType,
  AssetCheckAssignment,
  AssetCheckRecord,
  AssetCheckEvidenceLink,
  AssetRequirementLink,
  Requirement,
  EvidenceDocument,
  Action,
  ActionUpdate,
  ActionObjectLink,
  AuditLog,
  CellStatus,
  MatrixCell,
  RequirementDocument,
  CompetencyCategory,
  RequirementRiskLevel,
  ReviewFrequency,
  RequirementStatus,
  DocumentStatus,
  CompetencyStatus,
  ActionStatus,
  PersonType
} from './types';

// Linear Congruential / Mulberry32 Generator for perfect determinism
export function createPrng(seed: number) {
  let h = seed;
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Jessica', 'Robert', 'Karen',
  'William', 'Lisa', 'Joseph', 'Michelle', 'Thomas', 'Amanda', 'Charles', 'Stephanie', 'Daniel', 'Ashley',
  'Matthew', 'Melissa', 'Anthony', 'Deborah', 'Mark', 'Mary', 'Donald', 'Barbara', 'Steven', 'Susan',
  'Paul', 'Margaret', 'Andrew', 'Dorothy', 'Kenneth', 'Sandra', 'Joshua', 'Kevin', 'Donna', 'Brian',
  'Carol', 'George', 'Ruth', 'Edward', 'Sharon', 'Ronald', 'Timothy', 'Laura', 'Ryan', 'Rebecca'
];

const LAST_NAMES = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright',
  'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke',
  'O\'Brien', 'McCarthy', 'Kelly', 'Murphy', 'Gallagher', 'O\'Connor', 'Walsh', 'Byrne', 'Ryan', 'O\'Neill',
  'O\'Reilly', 'Doyle', 'Dunne', 'Fitzgerald', 'Kavanagh', 'O\'Donnell', 'Hughes', 'Campbell', 'Stewart', 'Bell'
];

const DEPARTMENTS = [
  'Warehouse', 'Transport', 'Fleet', 'Quality & Compliance', 'Security', 'HR / Training', 'Maintenance', 'Office/Admin'
];

const ROLES_BY_DEPT: Record<string, string[]> = {
  'Warehouse': ['Warehouse Operative', 'Warehouse Supervisor', 'Warehouse Manager'],
  'Transport': ['Driver', 'Transport Planner', 'Transport Manager'],
  'Fleet': ['Fleet Coordinator', 'Fleet Manager'],
  'Quality & Compliance': ['Compliance Officer', 'Compliance Auditor'],
  'Security': ['Security Guard', 'Security Supervisor'],
  'HR / Training': ['Trainer', 'HR Assistant', 'HR Manager'],
  'Maintenance': ['Maintenance Technician', 'Maintenance Supervisor'],
  'Office/Admin': ['Admin Assistant', 'Office Administrator', 'Receptionist']
};

const COMP_PREFIXES = [
  'Safety Induction', 'SOP Refresher', 'Equipment Operation', 'Emergency Protocol',
  'Maintenance Procedure', 'Compliance Audit', 'Environmental Guideline', 'Operational Review',
  'Technical Training', 'Quality Standard', 'Security Procedure', 'Administrative Protocol'
];

const COMP_SUBJECTS = [
  'Manual Handling', 'Chemical Hazards', 'Working at Heights', 'Lockout Tagout',
  'Vehicle Inspection', 'First Aid Response', 'Fire Extinguisher Use', 'Driver Fatigue Management',
  'Racking Safety', 'Cybersecurity Awareness', 'Data Protection GDPR', 'DSE Assessment',
  'Warehouse Lighting', 'Cold Chain Logistics', 'Forklift Counterbalance', 'VNA Truck Operation',
  'Reach Truck Operation', 'Power Pallet Truck', 'Lifting Gear Inspections', 'Asbestos Awareness',
  'Noise at Work Regulations', 'Confined Spaces Entry', 'Electrical Safety Code', 'Spill Kit Deployment',
  'Tail-lift Competency', 'Load Restraint Systems', 'Route Planning Safety', 'Tachograph Regulation compliance'
];

const COMP_LEVELS = [
  'T1', 'Level 1', 'Level 2', 'Refresher', 'Advanced', 'Section A', 'Part B', 'Phase 3'
];

const ASSET_LOCATIONS = [
  'Dublin HQ Depot', 'Cork Distribution Hub', 'Belfast Transit Centre', 'Manchester Logistics Park'
];

const ASSET_MAKES: Record<string, string[]> = {
  'Vehicle': ['Scania', 'Volvo', 'DAF', 'Mercedes-Benz', 'Ford'],
  'Trailer': ['Schmitz Cargobull', 'Krone', 'SDC', 'Gray & Adams'],
  'Forklift': ['Toyota', 'Linde', 'Jungheinrich', 'Crown', 'Hyster'],
  'Equipment': ['Chubb', 'Tyco', 'Linde Cryogenics', 'Apex Workshop'],
  'Facility': ['Apex Steel Structures', 'Kone Elevators', 'Assa Abloy']
};

const REQUIREMENT_TITLES = [
  'LOLER Lifting Inspection Check', 'CVRT Annual Commercial Road Testing', 'COSHH Hazardous Substance Log',
  'PUWER Work Equipment Conformity', 'Operator Licence Renewal Validation', 'CPC Card Driver Period Certification',
  'Fire Safety Drills Register', 'Racking Damage Visual Survey', 'Cold Chain Thermometer Calibration',
  'ISO 9001 Quality Audit Compliance', 'Risk Assessment Annual Sign-Off', 'First Aid Box Periodic Inventory',
  'Forklift Pre-Use Check Logs', 'Driver Hours Tachograph Audits', 'Warehouse Dock Leveller Servicing',
  'GDPR Data Consent Periodic Review'
];

const REQUIREMENT_CATEGORIES = [
  'Warehouse Operations', 'Fleet Compliance', 'Training Records', 'Security', 'Health & Safety',
  'Environmental', 'Document Control', 'Audit Readiness', 'Supplier Management', 'Asset Maintenance',
  'Incident Management', 'HR / People'
];

export function generateHighVolumeDataset(seed: number = 12345) {
  const rand = createPrng(seed);
  const orgId = MOCK_ORG.id;
  const profileId = MOCK_PROFILE.id;

  const daysFromNow = (days: number) => {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };

  const getRandomElement = <T>(arr: T[]): T => {
    return arr[Math.floor(rand() * arr.length)];
  };

  // 1. Generate People (200)
  const people: Person[] = [];
  for (let i = 1; i <= 200; i++) {
    const dept = getRandomElement(DEPARTMENTS);
    const roles = ROLES_BY_DEPT[dept] || ['General Operative'];
    const role = getRandomElement(roles);
    const fName = getRandomElement(FIRST_NAMES);
    const lName = getRandomElement(LAST_NAMES);
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@demo-apex.com`;
    const isActive = rand() > 0.1; // 90% active
    const type: PersonType = rand() > 0.15 ? 'Employee' : 'Contractor';

    people.push({
      id: `person-gen-${i}`,
      organisation_id: orgId,
      employee_number: `EMP-${10000 + i}`,
      first_name: fName,
      last_name: lName,
      display_name: `[DEMO] ${fName} ${lName}`,
      email,
      department: dept,
      role,
      person_type: type,
      start_date: daysFromNow(-365 * 2 - Math.floor(rand() * 1000)),
      end_date: isActive ? null : daysFromNow(-Math.floor(rand() * 180)),
      active: isActive,
      notes: `Generated stress-test profile for department ${dept}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 2. Generate Competency Types (300)
  const competencyTypes: CompetencyType[] = [];
  const categoriesList: CompetencyCategory[] = [
    'Safety', 'Equipment & Vehicle', 'Transport', 'Security', 'Quality & Compliance', 'Environmental', 'Operational', 'Professional', 'Industry Certification', 'Other'
  ];

  for (let i = 1; i <= 300; i++) {
    const prefix = getRandomElement(COMP_PREFIXES);
    const subject = getRandomElement(COMP_SUBJECTS);
    const lvl = getRandomElement(COMP_LEVELS);
    const title = `[DEMO] ${prefix} - ${subject} (${lvl})`;

    // Map to supported categories
    const category = getRandomElement(categoriesList);
    const validityMonths = rand() > 0.1 ? getRandomElement([12, 24, 36, 60]) : null;
    const defaultRisk: RequirementRiskLevel = getRandomElement(['Low', 'Medium', 'High', 'Critical']);
    const isEvidenceRequired = rand() > 0.2;

    competencyTypes.push({
      id: `comp-type-gen-${i}`,
      organisation_id: orgId,
      title,
      category,
      description: `Mock requirements validation details for ${title}.`,
      validity_period_months: validityMonths,
      refresher_period_months: validityMonths ? Math.floor(validityMonths * 0.8) : null,
      evidence_required: isEvidenceRequired,
      default_risk_level: defaultRisk,
      active: rand() > 0.05, // 95% active
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 3. Generate Competency Records (~1500)
  // Mapping logically by department/roles to avoid memory bloating
  const competencyRecords: CompetencyRecord[] = [];
  let recordCounter = 1;
  const activePeople = people.filter(p => p.active);
  const activeCompTypes = competencyTypes.filter(c => c.active);

  activePeople.forEach((person) => {
    // Determine target competency types matching department
    const relevantTypes = activeCompTypes.filter(type => {
      const p = rand();
      // General safety applies to everyone
      if (type.category === 'Safety' && p > 0.5) return true;
      if (type.category === 'Professional' && p > 0.8) return true;

      // Department matches
      if (person.department === 'Warehouse' && (type.title.includes('Warehouse') || type.category === 'Equipment & Vehicle') && p > 0.6) return true;
      if (person.department === 'Transport' && (type.category === 'Transport' || type.category === 'Equipment & Vehicle') && p > 0.6) return true;
      if (person.department === 'Security' && type.category === 'Security' && p > 0.6) return true;
      if (person.department === 'Quality & Compliance' && type.category === 'Quality & Compliance' && p > 0.6) return true;

      return false;
    }).slice(0, 10); // Limit to max 10 per person for realistic density

    relevantTypes.forEach(type => {
      const roll = rand();
      let status: CompetencyStatus = 'Valid';
      let compDate: string | null = null;
      let expDate: string | null = null;

      if (roll < 0.65) {
        // Valid
        compDate = daysFromNow(-180);
        expDate = type.validity_period_months ? daysFromNow((type.validity_period_months * 30) - 180) : null;
        status = 'Valid';
      } else if (roll < 0.80) {
        // Expired
        compDate = daysFromNow(-500);
        expDate = type.validity_period_months ? daysFromNow((type.validity_period_months * 30) - 500) : null;
        status = 'Expired';
      } else if (roll < 0.90) {
        // Expiring Soon
        compDate = daysFromNow(-340);
        expDate = type.validity_period_months ? daysFromNow(20) : null;
        status = 'Expiring Soon';
      } else {
        // Missing (do not add record or status Missing)
        status = 'Missing';
      }

      if (status !== 'Missing') {
        competencyRecords.push({
          id: `comp-rec-gen-${recordCounter++}`,
          organisation_id: orgId,
          person_id: person.id,
          competency_type_id: type.id,
          completed_date: compDate,
          expiry_date: expDate,
          trainer: getRandomElement(['Apex Internal Academy', 'External Certifications Ltd', 'Safeway Training']),
          provider: rand() > 0.5 ? 'Internal' : 'External',
          certificate_number: `CERT-${100000 + recordCounter}`,
          status,
          notes: `stress-test competency record generated with status ${status}.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  // 4. Generate Assets (200)
  const assets: Asset[] = [];
  const assetTypes = ['Vehicle', 'Trailer', 'Forklift', 'Equipment', 'Facility'];
  const subCategories: Record<string, string[]> = {
    'Facility': ['Warehouse 1', 'Warehouse 2', 'Garage', 'Offices', 'Yard'],
    'Vehicle': ['Tractor Unit', 'Rigid', 'Van', 'Company Car'],
    'Trailer': ['Refrigerated', 'Curtainsider', 'Box', 'Skeletal'],
    'Forklift': ['Electric Counterbalance', 'Diesel Counterbalance', 'Reach Truck', 'VNA', 'Power Pallet Truck'],
    'Equipment': ['Fire Safety', 'Racking', 'Dock Equipment', 'Workshop Equipment']
  };

  const parentCategories = getStorageItem('vigilen_asset_categories', []);

  for (let i = 1; i <= 200; i++) {
    const parentType = getRandomElement(assetTypes);
    const subs = subCategories[parentType] || ['General'];
    const subCat = getRandomElement(subs);
    const location = getRandomElement(ASSET_LOCATIONS);
    const make = getRandomElement(ASSET_MAKES[parentType] || ['Generic Make']);
    const modelStr = `${make} ${getRandomElement(['Pro-Series', 'X-100', 'Evolution', 'Sentinel', 'H1', 'L3'])}`;
    const lead = getRandomElement(activePeople);
    const reference = parentType === 'Vehicle' || parentType === 'Trailer'
      ? `261-D-${10000 + i}`
      : `${parentType.toUpperCase()}-${1000 + i}`;

    assets.push({
      id: `asset-gen-${i}`,
      organisation_id: orgId,
      category_id: null,
      asset_number: `AST-${parentType[0].toUpperCase()}-${i}`,
      name: `[DEMO] ${parentType} - ${reference}`,
      asset_type: parentType,
      category: subCat,
      registration_number: parentType === 'Vehicle' || parentType === 'Trailer' ? reference : null,
      serial_number: parentType !== 'Vehicle' && parentType !== 'Trailer' ? reference : `SER-${reference}`,
      make,
      model: modelStr,
      location,
      department: lead.department,
      owner: lead.display_name,
      status: 'active',
      notes: `Deterministic stress-test asset in ${location}. Lead owner is ${lead.display_name}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null
    });
  }

  // 5. Generate Asset Checks, Assignments, and Records
  // Asset Check Types
  const assetCheckTypes: AssetCheckType[] = [
    { id: 'check-type-cvrt', organisation_id: orgId, title: 'CVRT / MOT Inspection', description: 'Statutory safety test', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 30, evidence_required: true, category: 'Vehicle', default_status: 'Missing', risk_level: 'Critical', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-tax', organisation_id: orgId, title: 'Road Tax Renewal', description: 'Licencing tax', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 14, evidence_required: true, category: 'Vehicle', default_status: 'Missing', risk_level: 'Medium', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-tacho', organisation_id: orgId, title: 'Tachograph Calibration', description: '24-month calibration', default_frequency_value: 2, default_frequency_unit: 'years', default_warning_days: 60, evidence_required: true, category: 'Vehicle', default_status: 'Missing', risk_level: 'High', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-fridge', organisation_id: orgId, title: 'Fridge Temp Calibration', description: 'Cold chain integrity check', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 30, evidence_required: true, category: 'Trailer', default_status: 'Missing', risk_level: 'High', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-loler', organisation_id: orgId, title: 'LOLER Thorough Exam', description: 'Lifting gear inspection', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 30, evidence_required: true, category: 'Forklift', default_status: 'Missing', risk_level: 'High', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-forklift-service', organisation_id: orgId, title: 'Forklift Service', description: 'Scheduled maintenance', default_frequency_value: 6, default_frequency_unit: 'months', default_warning_days: 15, evidence_required: false, category: 'Forklift', default_status: 'Missing', risk_level: 'Medium', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-racking', organisation_id: orgId, title: 'Racking Load Check', description: 'Annual racking compliance check', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 30, evidence_required: true, category: 'Equipment', default_status: 'Missing', risk_level: 'High', active: true, created_at: nowIso(), updated_at: nowIso() },
    { id: 'check-type-fire-ext', organisation_id: orgId, title: 'Fire Safety Test', description: 'Fire extinguisher verification', default_frequency_value: 1, default_frequency_unit: 'years', default_warning_days: 30, evidence_required: true, category: 'Equipment', default_status: 'Missing', risk_level: 'Critical', active: true, created_at: nowIso(), updated_at: nowIso() }
  ];

  const checkAssignments: AssetCheckAssignment[] = [];
  const checkRecords: AssetCheckRecord[] = [];
  let checkRecordCounter = 1;

  assets.forEach((asset) => {
    // Map relevant check types
    let matchingTypes = assetCheckTypes.filter(t => t.category === asset.asset_type);
    if (asset.asset_type === 'Trailer' && asset.category === 'Refrigerated') {
      matchingTypes = [...matchingTypes, assetCheckTypes.find(t => t.id === 'check-type-fridge')!].filter(Boolean);
    }
    if (asset.asset_type === 'Equipment' && asset.category === 'Racking') {
      matchingTypes = assetCheckTypes.filter(t => t.id === 'check-type-racking');
    }

    matchingTypes.forEach(type => {
      const roll = rand();
      let status: 'valid' | 'due_soon' | 'expired' | 'overdue' | 'missing' = 'valid';
      let nextDue: string | null = null;
      let lastCompleted: string | null = null;

      if (roll < 0.70) {
        status = 'valid';
        nextDue = daysFromNow(120 + Math.floor(rand() * 200));
        lastCompleted = daysFromNow(-100);
      } else if (roll < 0.85) {
        status = 'due_soon';
        nextDue = daysFromNow(10 + Math.floor(rand() * 15));
        lastCompleted = daysFromNow(-340);
      } else if (roll < 0.95) {
        status = 'overdue';
        nextDue = daysFromNow(-Math.floor(rand() * 60) - 5);
        lastCompleted = daysFromNow(-400);
      } else {
        status = 'missing';
        nextDue = daysFromNow(-1);
        lastCompleted = null;
      }

      const asgId = `asg-${asset.id}-${type.id}`;
      checkAssignments.push({
        id: asgId,
        organisation_id: orgId,
        asset_id: asset.id,
        asset_check_type_id: type.id,
        required: true,
        frequency_value: type.default_frequency_value,
        frequency_unit: type.default_frequency_unit,
        warning_days: type.default_warning_days,
        first_due_date: null,
        next_due_date: nextDue,
        last_completed_date: lastCompleted,
        last_expiry_date: nextDue,
        status,
        notes: `stress-test checks for asset category ${asset.category}.`,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (lastCompleted) {
        checkRecords.push({
          id: `rec-check-${checkRecordCounter++}`,
          organisation_id: orgId,
          asset_id: asset.id,
          asset_check_assignment_id: asgId,
          asset_check_type_id: type.id,
          completed_at: lastCompleted,
          valid_from: daysFromNow(-365),
          valid_until: nextDue!,
          result_status: 'Pass',
          performed_by: 'Authorized Testing Inspector',
          reference: `CHK-${100000 + checkRecordCounter}`,
          notes: 'Standard periodic review passes compliance guidelines.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  // 6. Generate Requirements (100)
  const requirements: Requirement[] = [];
  for (let i = 1; i <= 100; i++) {
    const rawTitle = getRandomElement(REQUIREMENT_TITLES);
    const title = `[DEMO] ${rawTitle} (#${i})`;
    const category = getRandomElement(REQUIREMENT_CATEGORIES);
    const owner = getRandomElement(['Operations', 'Fleet Safety', 'Human Resources', 'Security lead', 'Quality auditor']);
    const status: RequirementStatus = rand() > 0.4 ? 'GREEN' : rand() > 0.5 ? 'AMBER' : 'RED';
    const riskLevel: RequirementRiskLevel = getRandomElement(['Low', 'Medium', 'High', 'Critical']);
    const freq: ReviewFrequency = getRandomElement(['Monthly', 'Quarterly', 'Annually']);

    requirements.push({
      id: `fw-req-gen-${i}`,
      title,
      description: `Detailed audit criteria checklists and evidence requirements for ${title}.`,
      owner,
      category,
      status,
      review_frequency: freq,
      review_date: daysFromNow(-90),
      next_due_date: status === 'RED' ? daysFromNow(-10) : daysFromNow(45 + Math.floor(rand() * 200)),
      risk_level: riskLevel,
      lifecycle_status: 'ACTIVE',
      organisation_id: orgId,
      created_by: profileId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: 'Mock notes generated to fulfill stress testing criteria.'
    });
  }

  // 7. Generate Evidence Records (500)
  const documents: EvidenceDocument[] = [];
  const docCategories = [
    'Vehicle Test Certificates', 'CPC Cards', 'First Aid Logs', 'Lifting Gear Inspections',
    'Racking Survey Sheets', 'Driver Training Records', 'Facility Maintenance Logs', 'Health & Safety Audits'
  ];

  for (let i = 1; i <= 500; i++) {
    const cat = getRandomElement(docCategories);
    const fileNum = 1000 + i;
    const title = `[DEMO] Compliance Evidence - File #${fileNum}`;
    const filename = `[DEMO]_evidence_file_${fileNum}.pdf`;

    const roll = rand();
    let status: DocumentStatus = 'Active';
    let expiry: string | null = null;
    const issue = daysFromNow(-180);

    if (roll < 0.70) {
      status = 'Active';
      expiry = daysFromNow(180 + Math.floor(rand() * 300));
    } else if (roll < 0.85) {
      status = 'Expiring Soon';
      expiry = daysFromNow(5 + Math.floor(rand() * 20));
    } else if (roll < 0.95) {
      status = 'Expired';
      expiry = daysFromNow(-10 - Math.floor(rand() * 100));
    } else {
      status = 'Unclassified';
      expiry = null;
    }

    documents.push({
      id: `doc-gen-${i}`,
      organization_id: orgId,
      uploaded_by: profileId,
      title,
      file_url: null,
      file_name: filename,
      original_file_name: filename,
      safe_file_name: filename,
      storage_path: `private/documents/gen-${i}.pdf`,
      mime_type: 'application/pdf',
      file_hash: `hash_demo_${Math.floor(rand() * 10000000)}`,
      file_size_bytes: 50 * 1024 + Math.floor(rand() * 1000000), // 50KB to 1MB
      category: cat,
      status,
      expiry_date: expiry,
      issue_date: issue,
      review_date: daysFromNow(-30),
      metadata: { demo_seeding_mode: true, seed },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 8. Generate Backlinks / Links
  // Link documents to requirements
  const requirementDocuments: RequirementDocument[] = [];
  const reqDocCount = 200; // link 200 times
  for (let i = 0; i < reqDocCount; i++) {
    const req = getRandomElement(requirements);
    const doc = getRandomElement(documents);
    requirementDocuments.push({
      id: `req-doc-gen-${i}`,
      organisation_id: orgId,
      requirement_id: req.id,
      document_id: doc.id,
      linked_by: profileId,
      created_at: new Date().toISOString()
    });
  }

  // Link documents to competency records
  const competencyRecordDocuments: CompetencyRecordDocument[] = [];
  const compDocCount = Math.min(competencyRecords.length, 300);
  for (let i = 0; i < compDocCount; i++) {
    const rec = competencyRecords[i];
    const doc = getRandomElement(documents);
    competencyRecordDocuments.push({
      id: `comp-doc-gen-${i}`,
      organisation_id: orgId,
      competency_record_id: rec.id,
      document_id: doc.id,
      linked_by: profileId,
      linked_at: new Date().toISOString()
    });
  }

  // Link check records to evidence
  const assetCheckEvidenceLinks: AssetCheckEvidenceLink[] = [];
  const checkRecordsWithEvidence = checkRecords.slice(0, 150);
  checkRecordsWithEvidence.forEach((rec, i) => {
    const doc = getRandomElement(documents);
    assetCheckEvidenceLinks.push({
      id: `asg-ev-link-gen-${i}`,
      organisation_id: orgId,
      asset_id: rec.asset_id,
      asset_check_assignment_id: rec.asset_check_assignment_id,
      asset_check_record_id: rec.id,
      document_id: doc.id,
      created_by: profileId,
      created_at: new Date().toISOString()
    });
  });

  // Link assets to requirements
  const assetRequirementLinks: AssetRequirementLink[] = [];
  assets.forEach((asset, idx) => {
    if (idx % 2 === 0) {
      const req = getRandomElement(requirements);
      const checkType = getRandomElement(assetCheckTypes);
      assetRequirementLinks.push({
        id: `asg-req-link-gen-${idx}`,
        organisation_id: orgId,
        asset_check_type_id: checkType.id,
        requirement_id: req.id,
        created_at: new Date().toISOString()
      });
    }
  });

  // 9. Generate Matrix Cells (Cheklists Matrix rows)
  const matrixCells: MatrixCell[] = [];
  let cellCounter = 1;
  const sampleAssets = assets.slice(0, 50); // limit checklist rows for matrix
  const sampleReqs = requirements.slice(0, 10); // limit checklist columns

  sampleAssets.forEach(asset => {
    sampleReqs.forEach(req => {
      const roll = rand();
      let cellStatus: CellStatus = 'Compliant';
      let docId: string | null = null;

      if (roll < 0.70) {
        cellStatus = 'Compliant';
        const doc = getRandomElement(documents);
        docId = doc.id;
      } else if (roll < 0.85) {
        cellStatus = 'Expiring Soon';
      } else if (roll < 0.92) {
        cellStatus = 'Expired';
      } else if (roll < 0.97) {
        cellStatus = 'Missing';
      } else {
        cellStatus = 'N/A';
      }

      matrixCells.push({
        id: `cell-gen-${cellCounter++}`,
        organization_id: orgId,
        requirement_id: req.id,
        target_name: asset.name,
        target_type: (asset.asset_type === 'Vehicle' || asset.asset_type === 'Trailer')
          ? 'Vehicle'
          : 'Facility',
        document_id: docId,
        status: cellStatus,
        last_checked_at: new Date().toISOString()
      });
    });
  });

  // 10. Actions / Tasks
  const actions: Action[] = [];
  const actionObjectLinks: ActionObjectLink[] = [];
  const actionUpdates: ActionUpdate[] = [];

  for (let i = 1; i <= 200; i++) {
    const actStatus: ActionStatus = getRandomElement(['Open', 'In Progress', 'Complete', 'Cancelled']);
    const owner = getRandomElement(activePeople);

    const title = `[DEMO] Corrective Action - Task #${i}`;
    const compDate = actStatus === 'Complete' ? daysFromNow(-5) : null;
    const due = daysFromNow(15 + Math.floor(rand() * 120));

    const act: Action = {
      id: `act-gen-${i}`,
      title,
      description: `Corrective action task generated deterministically to stress-test task registers. Assigned to lead ${owner.display_name}.`,
      status: actStatus,
      due_date: due,
      target_due_date: due,
      owner: owner.display_name,
      completed_at: compDate,
      completed_by: actStatus === 'Complete' ? profileId : null,
      closed_at: actStatus === 'Complete' || actStatus === 'Cancelled' ? daysFromNow(-1) : null,
      closed_by: actStatus === 'Complete' || actStatus === 'Cancelled' ? profileId : null,
      cancelled_at: actStatus === 'Cancelled' ? daysFromNow(-1) : null,
      cancelled_by: actStatus === 'Cancelled' ? profileId : null,
      organisation_id: orgId,
      created_by: profileId,
      opened_by: profileId,
      opened_at: daysFromNow(-30),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_changed_at: daysFromNow(-2),
      status_changed_by: profileId
    };

    actions.push(act);

    // Link some actions to requirements/assets
    if (i % 2 === 0) {
      const targetReq = getRandomElement(requirements);
      actionObjectLinks.push({
        id: `act-link-gen-${i}`,
        organisation_id: orgId,
        action_id: act.id,
        object_type: 'Requirement',
        object_id: targetReq.id,
        linked_by: profileId,
        linked_at: new Date().toISOString()
      });
    }

    // Generate action updates
    if (i % 3 === 0) {
      actionUpdates.push({
        id: `act-up-gen-${i}`,
        organisation_id: orgId,
        action_id: act.id,
        update_type: 'Note',
        note: 'Stresstest update logged for this corrective task.',
        user_id: profileId,
        created_at: new Date().toISOString()
      });
    }
  }

  // 11. Audit Logs / Events (~100 logs)
  const auditLogs: AuditLog[] = [];
  const logActions = ['viewed_dashboard', 'requirement_created', 'evidence_uploaded', 'competency_updated', 'asset_modified'];

  for (let i = 1; i <= 100; i++) {
    const actName = getRandomElement(logActions);
    auditLogs.push({
      id: `log-gen-${i}`,
      organization_id: orgId,
      profile_id: profileId,
      action: actName,
      details: `Local stress test audit event registered: ${actName}.`,
      created_at: daysFromNow(-Math.floor(rand() * 30)) + 'T12:00:00.000Z'
    });
  }

  // Return the compiled dataset maps
  return {
    org: MOCK_ORG,
    profile: MOCK_PROFILE,
    requirements: [], // compliance_requirements (re-use frameworkRequirements instead)
    documents,
    archivedDocuments: [],
    frameworkRequirements: requirements,
    requirementEvidenceTypes: [],
    requirementDocuments,
    requirementEvidenceCriteria: [],
    requirementEvidenceCriterionMatches: [],
    reviews: [],
    actions,
    requirementActions: [],
    actionUpdates,
    actionDocuments: [],
    actionObjectLinks,
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    requirementCompetencyTypeTypes: [],
    requirementCategories: [],
    evidenceCategories: [],
    matrixCells,
    auditPacks: [],
    auditLogs,
    notifications: [],
    assets,
    assetCategories: parentCategories,
    assetCheckTypes,
    assetCheckAssignments: checkAssignments,
    assetCheckRecords: checkRecords,
    assetCheckEvidenceLinks,
    assetRequirementLinks,
    assetHistoryEvents: []
  };
}

// Utility wrapper helper to get storage items safely
function getStorageItem(key: string, defaultVal: any) {
  if (typeof window === 'undefined') return defaultVal;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultVal;
}

function nowIso() {
  return new Date().toISOString();
}
