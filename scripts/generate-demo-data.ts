import * as fs from 'fs';
import * as path from 'path';

// Constants for departments, roles and templates
const DEPARTMENTS = [
  {
    name: 'Warehouse',
    roles: ['Warehouse Operative', 'FLT Driver', 'Warehouse Supervisor', 'Yard Operative']
  },
  {
    name: 'Transport',
    roles: ['Driver', 'Transport Planner', 'Yard Operative']
  },
  {
    name: 'Fleet',
    roles: ['Fleet Maintenance Technician', 'Driver']
  },
  {
    name: 'Compliance',
    roles: ['Compliance Coordinator']
  },
  {
    name: 'Security',
    roles: ['Security Officer']
  },
  {
    name: 'Maintenance',
    roles: ['Fleet Maintenance Technician', 'Yard Operative']
  },
  {
    name: 'Admin',
    roles: ['Admin Support']
  }
];

const COMPETENCY_TYPES = [
  { title: 'Forklift Training', category: 'Equipment & Vehicle', validity: 36 },
  { title: 'Manual Handling', category: 'Safety', validity: 24 },
  { title: 'Fire Safety', category: 'Safety', validity: 12 },
  { title: 'GDP Awareness', category: 'Quality & Compliance', validity: 12 },
  { title: 'Food Safety Awareness', category: 'Quality & Compliance', validity: 24 },
  { title: 'Security Awareness', category: 'Security', validity: 12 },
  { title: 'Driver CPC', category: 'Transport', validity: 60 },
  { title: 'Tail Lift Training', category: 'Equipment & Vehicle', validity: 36 },
  { title: 'Temperature-Controlled Goods Handling', category: 'Operational', validity: 12 },
  { title: 'Spill Response', category: 'Safety', validity: 12 },
  { title: 'First Aid', category: 'Safety', validity: 36 },
  { title: 'Yard Safety', category: 'Safety', validity: 24 },
  { title: 'Load Security', category: 'Transport', validity: 12 },
  { title: 'Vehicle Defect Reporting', category: 'Transport', validity: 12 },
  { title: 'Tachograph Awareness', category: 'Transport', validity: 24 },
  { title: 'Warehouse Hygiene', category: 'Operational', validity: 12 },
  { title: 'Pest Control Awareness', category: 'Environmental', validity: 12 },
  { title: 'Contractor Induction', category: 'Quality & Compliance', validity: 12 },
  { title: 'Incident Reporting', category: 'Safety', validity: 12 },
  { title: 'Safe Systems of Work', category: 'Safety', validity: 12 },
  { title: 'COSHH Assessment Awareness', category: 'Safety', validity: 12 },
  { title: 'Pallet Truck Operation', category: 'Equipment & Vehicle', validity: 24 },
  { title: 'Work at Height Safety', category: 'Safety', validity: 12 },
  { title: 'Lockout Tagout (LOTO)', category: 'Safety', validity: 12 },
  { title: 'Dangerous Goods Safety Advisor (DGSA)', category: 'Industry Certification', validity: 60 },
  { title: 'ADR Driver Training', category: 'Industry Certification', validity: 60 },
  { title: 'Aviation Security Cargo', category: 'Security', validity: 24 },
  { title: 'Cyber Security Awareness', category: 'Security', validity: 12 },
  { title: 'Office DSE Self-Assessment', category: 'Professional', validity: 24 },
  { title: 'GDPR Compliance Training', category: 'Quality & Compliance', validity: 12 },
  { title: 'Risk Assessment Workshop', category: 'Professional', validity: 24 },
  { title: 'ISO 9001 Lead Auditor', category: 'Industry Certification', validity: null },
  { title: 'TAPA FSR Facility Security', category: 'Industry Certification', validity: 36 },
  { title: 'BRCGS Global Standard Logistics', category: 'Industry Certification', validity: 12 },
  { title: 'Environmental Waste Management', category: 'Environmental', validity: 24 }
];

const REQUIREMENT_TEMPLATES = [
  { title: 'Warehouse Emergency Evacuation Drills', category: 'Warehouse Operations', risk: 'High', freq: 'Quarterly' },
  { title: 'Forklift Pre-use Inspection Logs', category: 'Warehouse Operations', risk: 'High', freq: 'Weekly' },
  { title: 'Warehouse Racking Safety Inspections', category: 'Warehouse Operations', risk: 'High', freq: 'Annually' },
  { title: 'Warehouse Cleaning & Hygiene Records', category: 'Warehouse Operations', risk: 'Medium', freq: 'Monthly' },
  { title: 'Driver Daily Defect Sheets Collection', category: 'Transport Operations', risk: 'High', freq: 'Weekly' },
  { title: 'Driver Licences HGV Verification Checks', category: 'Transport Operations', risk: 'Critical', freq: 'Monthly' },
  { title: 'Dangerous Goods Transport Documentation (ADR)', category: 'Transport Operations', risk: 'High', freq: 'Weekly' },
  { title: 'Tachograph Data Download & Infringement Auditing', category: 'Transport Operations', risk: 'High', freq: 'Monthly' },
  { title: 'Vehicle O-Licence Regulatory Audits', category: 'Fleet Compliance', risk: 'Critical', freq: 'Annually' },
  { title: 'HGV PMI Preventive Maintenance Inspection Reports', category: 'Fleet Compliance', risk: 'Critical', freq: 'Monthly' },
  { title: 'Trailer MOT & Brake Test Certificates', category: 'Fleet Compliance', risk: 'High', freq: 'Annually' },
  { title: 'Vehicle Tachograph Calibration Verification', category: 'Fleet Compliance', risk: 'High', freq: 'Annually' },
  { title: 'Security CCTV Coverage Check', category: 'Security', risk: 'Medium', freq: 'Monthly' },
  { title: 'Visitor & Contractor Access Control Logs', category: 'Security', risk: 'Medium', freq: 'Weekly' },
  { title: 'Warehouse Perimeter Security Checks', category: 'Security', risk: 'High', freq: 'Weekly' },
  { title: 'TAPA Security Protocol Verification', category: 'Security', risk: 'High', freq: 'Quarterly' },
  { title: 'Driver CPC Hours Compliance Audits', category: 'Training & Competency', risk: 'High', freq: 'Monthly' },
  { title: 'First Aider Presence Checklist', category: 'Training & Competency', risk: 'Medium', freq: 'Monthly' },
  { title: 'Warehouse Operator Safety Certifications', category: 'Training & Competency', risk: 'High', freq: 'Monthly' },
  { title: 'Fire Warden Training Records', category: 'Training & Competency', risk: 'High', freq: 'Annually' },
  { title: 'SOP Document Control Version Review', category: 'Document Control', risk: 'Medium', freq: 'Annually' },
  { title: 'Compliance Standards Access Rights Log', category: 'Document Control', risk: 'Low', freq: 'Annually' },
  { title: 'Customer Compliance Agreement Signature Collection', category: 'Document Control', risk: 'Medium', freq: 'Annually' },
  { title: 'Subcontractor Insurances Verification Checks', category: 'Supplier / Contractor Control', risk: 'High', freq: 'Annually' },
  { title: 'Cleaning Agency Staff Competency Checks', category: 'Supplier / Contractor Control', risk: 'Medium', freq: 'Quarterly' },
  { title: 'Pest Control Contractor Assessment', category: 'Supplier / Contractor Control', risk: 'Medium', freq: 'Annually' },
  { title: 'ISO 9001 Internal Quality Auditing', category: 'Audit Readiness', risk: 'High', freq: 'Annually' },
  { title: 'GDP Guidelines Alignment Self-Inspection', category: 'Audit Readiness', risk: 'High', freq: 'Annually' },
  { title: 'BRCGS Audit Evidence Assembly Pack', category: 'Audit Readiness', risk: 'High', freq: 'Annually' },
  { title: 'Temperature Sensor Calibration Log', category: 'Temperature Control', risk: 'Critical', freq: 'Annually' },
  { title: 'Chilled Storage Bay Temperature Logs Review', category: 'Temperature Control', risk: 'Critical', freq: 'Weekly' },
  { title: 'Cold Chain Alarm System Test Reports', category: 'Temperature Control', risk: 'High', freq: 'Monthly' },
  { title: 'Corrective Action Plan Progress Review', category: 'Corrective Actions', risk: 'High', freq: 'Monthly' },
  { title: 'Non-conformance Log Trend Analysis', category: 'Corrective Actions', risk: 'Medium', freq: 'Quarterly' },
  { title: 'Warehouse Emergency Generator Load Tests', category: 'Maintenance', risk: 'High', freq: 'Monthly' },
  { title: 'Dock Leveler Preventive Maintenance Logs', category: 'Maintenance', risk: 'Medium', freq: 'Annually' },
  { title: 'Fire Extinguisher Physical Location Checks', category: 'Maintenance', risk: 'High', freq: 'Monthly' }
];

const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Thomas', 'Daniel', 'Jessica', 'Robert', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Joseph', 'Elizabeth', 'Charles', 'Linda', 'Matthew', 'Barbara', 'Christopher', 'Susan', 'Paul', 'Margaret', 'Mark', 'Dorothy', 'Donald', 'Lisa', 'George', 'Nancy', 'Kenneth', 'Karen', 'Steven', 'Betty', 'Edward', 'Helen', 'Brian', 'Sandra', 'Ronald', 'Donna', 'Anthony', 'Carol', 'Kevin', 'Ruth', 'Albert', 'Sharon', 'Gary', 'Michelle', 'Timothy', 'Laura', 'Stephen', 'Sarah', 'Andrew', 'Kimberly', 'Raymond', 'Deborah', 'Gregory', 'Jessica'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Flores', 'Morris', 'Nguyen', 'Murphy', 'Rivera', 'Cook'];

// Seedable deterministic pseudo-random generator
let seed = 12345;
function random() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function generateDemoData() {
  seed = 12345; // Reset seed for determinism

  // 1. Org and Profile
  const org = {
    id: '00000000-0000-0000-0000-d3e0d3e0d3e0',
    name: 'Overview360 Demo Logistics Ltd',
    compliance_profile: 'Transport & Warehouse Logistics',
    industry: 'Logistics & Supply Chain',
    country: 'Ireland',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z'
  };

  const profile = {
    id: '00000000-0000-0000-0000-a001a001a001',
    organization_id: org.id,
    full_name: 'Demo Administrator',
    role: 'Owner' as const,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z'
  };

  // 2. People (around 120)
  const people: any[] = [];
  for (let i = 0; i < 120; i++) {
    // Choose department based on weighted probabilities
    const rand = random();
    let dept = DEPARTMENTS[0]; // Warehouse by default
    if (rand < 0.4) {
      dept = DEPARTMENTS[0]; // Warehouse
    } else if (rand < 0.7) {
      dept = DEPARTMENTS[1]; // Transport
    } else if (rand < 0.8) {
      dept = DEPARTMENTS[2]; // Fleet
    } else if (rand < 0.85) {
      dept = DEPARTMENTS[3]; // Compliance
    } else if (rand < 0.9) {
      dept = DEPARTMENTS[4]; // Security
    } else if (rand < 0.95) {
      dept = DEPARTMENTS[5]; // Maintenance
    } else {
      dept = DEPARTMENTS[6]; // Admin
    }

    const role = randomElement(dept.roles);
    const first = randomElement(firstNames);
    const last = randomElement(lastNames);
    const empId = `00000000-0000-0000-0001-${i.toString().padStart(8, '0')}`;

    people.push({
      id: empId,
      organisation_id: org.id,
      employee_number: `DEMO-EMP-${1000 + i}`,
      first_name: first,
      last_name: `${last} [DEMO]`,
      display_name: `${first} ${last} [DEMO]`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@demologistics.example.com`,
      department: dept.name,
      role: role,
      person_type: random() > 0.85 ? 'Contractor' as const : 'Employee' as const,
      start_date: new Date(Date.now() - randomRange(100, 1000) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: null,
      active: random() > 0.1, // 90% active
      notes: `Seeded demo record for ${role} in ${dept.name} department.`,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z'
    });
  }

  // 3. Competency Types (around 35)
  const competencyTypes = COMPETENCY_TYPES.map((ct, idx) => ({
    id: `00000000-0000-0000-0002-${idx.toString().padStart(8, '0')}`,
    organisation_id: org.id,
    title: `[DEMO] ${ct.title}`,
    category: ct.category as any,
    description: `Standard operating certification requirements for ${ct.title}.`,
    validity_period_months: ct.validity,
    refresher_period_months: ct.validity ? Math.max(1, ct.validity - 2) : null,
    evidence_required: true,
    default_risk_level: randomElement(['Low', 'Medium', 'High', 'Critical'] as const),
    active: true,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z'
  }));

  // 4. Evidence Documents (around 300)
  const documentTypes = ['Certificate', 'SOP', 'Inspection Record', 'Log Sheet', 'Report', 'Verification Check', 'Policy Document'];
  const fileExtensions = ['pdf', 'xlsx', 'docx', 'jpg'];
  const docCategories = ['Evidence', 'Requirements', 'Actions', 'Competency', 'General'];
  
  const evidenceDocuments: any[] = [];
  for (let i = 0; i < 350; i++) {
    const docType = randomElement(documentTypes);
    const ext = randomElement(fileExtensions);
    const title = `[DEMO] Doc-${i + 1} ${docType}`;
    const filename = `[DEMO]_doc_${i + 1}_${docType.toLowerCase().replace(/ /g, '_')}.${ext}`;
    const docId = `00000000-0000-0000-0005-${i.toString().padStart(8, '0')}`;

    const randStatus = random();
    let status: 'Active' | 'Expiring Soon' | 'Expired' | 'Archived' = 'Active';
    let expiryDate = null;
    const issueDate = new Date(Date.now() - randomRange(10, 300) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (randStatus < 0.6) {
      status = 'Active';
      expiryDate = new Date(Date.now() + randomRange(45, 400) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (randStatus < 0.75) {
      status = 'Expiring Soon';
      expiryDate = new Date(Date.now() + randomRange(5, 29) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (randStatus < 0.9) {
      status = 'Expired';
      expiryDate = new Date(Date.now() - randomRange(5, 100) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      status = 'Archived';
      expiryDate = new Date(Date.now() - randomRange(10, 100) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    evidenceDocuments.push({
      id: docId,
      organization_id: org.id,
      uploaded_by: profile.id,
      title: title,
      file_url: null,
      file_name: filename,
      original_file_name: filename,
      safe_file_name: filename,
      storage_path: `seeded_demo/${filename}`,
      mime_type: ext === 'pdf' ? 'application/pdf' : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream',
      file_size_bytes: randomRange(50000, 4500000),
      category: randomElement(docCategories),
      status: status,
      expiry_date: expiryDate,
      issue_date: issueDate,
      review_date: new Date(Date.now() + randomRange(30, 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      archived_at: status === 'Archived' ? new Date().toISOString() : null,
      archived_by: status === 'Archived' ? profile.id : null,
      tags: [randomElement(['compliance', 'safety', 'audit', 'licence', 'training']), 'seeded_demo'],
      metadata: {
        seeded_demo: true,
        seed_batch_id: 'batch-demo-logistic-seeding',
        demo_organisation: 'Overview360 Demo Logistics Ltd'
      },
      created_at: new Date(Date.now() - randomRange(10, 150) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 5. Competency Records (around 1,000)
  const competencyRecords: any[] = [];
  const recordKeys = new Set<string>();
  let recordIndex = 0;
  while (competencyRecords.length < 1000 && recordIndex < 5000) {
    const person = randomElement(people);
    const type = randomElement(competencyTypes);
    const key = `${person.id}-${type.id}`;
    recordIndex++;

    if (recordKeys.has(key)) continue;
    recordKeys.add(key);

    const recordId = `00000000-0000-0000-0003-${competencyRecords.length.toString().padStart(8, '0')}`;
    const randStatus = random();
    let status: 'Valid' | 'Expiring Soon' | 'Expired' | 'Missing' = 'Valid';
    let completedDate = null;
    let expiryDate = null;

    if (randStatus < 0.6) {
      status = 'Valid';
      completedDate = new Date(Date.now() - randomRange(30, 200) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (type.validity_period_months) {
        expiryDate = new Date(new Date(completedDate).getTime() + type.validity_period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    } else if (randStatus < 0.75) {
      status = 'Expiring Soon';
      completedDate = new Date(Date.now() - randomRange(300, 340) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (type.validity_period_months) {
        expiryDate = new Date(new Date(completedDate).getTime() + type.validity_period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    } else if (randStatus < 0.9) {
      status = 'Expired';
      completedDate = new Date(Date.now() - randomRange(400, 600) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (type.validity_period_months) {
        expiryDate = new Date(new Date(completedDate).getTime() + type.validity_period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    } else {
      status = 'Missing';
    }

    competencyRecords.push({
      id: recordId,
      organisation_id: org.id,
      person_id: person.id,
      competency_type_id: type.id,
      completed_date: completedDate,
      expiry_date: expiryDate,
      trainer: `[DEMO] Trainer ${randomRange(1, 10)}`,
      provider: `[DEMO] Compliance Training Provider`,
      certificate_number: status !== 'Missing' ? `[DEMO] CERT-${10000 + competencyRecords.length}` : null,
      status: status,
      notes: `Training record for ${person.display_name} in competency ${type.title}.`,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z'
    });
  }

  // Competency Record Document links
  const competencyRecordDocuments: any[] = [];
  let recordDocCount = 0;
  competencyRecords.forEach(rec => {
    if (rec.status !== 'Missing' && random() > 0.3) {
      const doc = randomElement(evidenceDocuments);
      competencyRecordDocuments.push({
        id: `00000000-0000-0000-0007-${recordDocCount.toString().padStart(8, '0')}`,
        organisation_id: org.id,
        competency_record_id: rec.id,
        document_id: doc.id,
        linked_by: profile.id,
        linked_at: new Date().toISOString()
      });
      recordDocCount++;
    }
  });

  // 6. Requirements (around 120)
  const requirements: any[] = [];
  const reqUnits = ['Unit 1', 'Unit 2', 'Fleet A', 'Fleet B', 'Dublin Depot', 'Cork Warehouse', 'Main Facility'];
  for (let i = 0; i < 120; i++) {
    const template = REQUIREMENT_TEMPLATES[i % REQUIREMENT_TEMPLATES.length];
    const unit = reqUnits[Math.floor(i / REQUIREMENT_TEMPLATES.length) % reqUnits.length];
    const title = `[DEMO] ${unit} - ${template.title}`;

    const randStatus = random();
    let status: 'GREEN' | 'AMBER' | 'RED' | 'GREY' = 'GREY';
    if (randStatus < 0.45) status = 'GREEN';
    else if (randStatus < 0.7) status = 'AMBER';
    else if (randStatus < 0.9) status = 'RED';

    const lifecycle = random() > 0.95 ? (random() > 0.5 ? 'ARCHIVED' as const : 'DEACTIVATED' as const) : 'ACTIVE' as const;

    requirements.push({
      id: `00000000-0000-0000-0004-${i.toString().padStart(8, '0')}`,
      title: title,
      description: `Regulatory compliance checks for ${template.title} at ${unit}.`,
      owner: randomElement(['John Smith', 'Sarah Connor', 'Demo Administrator', 'Compliance Lead']),
      category: template.category,
      status: status,
      review_frequency: template.freq as any,
      review_date: new Date(Date.now() - randomRange(10, 100) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      next_due_date: new Date(Date.now() + randomRange(10, 300) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      risk_level: template.risk as any,
      lifecycle_status: lifecycle,
      notes: `Demo setup for tracking ${template.title}.`,
      organisation_id: org.id,
      created_by: profile.id,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z'
    });
  }

  // Requirement Document links
  const requirementDocuments: any[] = [];
  let reqDocCount = 0;
  requirements.forEach(req => {
    if (req.lifecycle_status === 'ACTIVE' && req.status !== 'RED' && random() > 0.2) {
      const numDocs = random() > 0.7 ? 2 : 1;
      for (let d = 0; d < numDocs; d++) {
        const doc = randomElement(evidenceDocuments);
        requirementDocuments.push({
          id: `00000000-0000-0000-0006-${reqDocCount.toString().padStart(8, '0')}`,
          requirement_id: req.id,
          document_id: doc.id,
          organisation_id: org.id,
          linked_by: profile.id,
          created_at: new Date().toISOString()
        });
        reqDocCount++;
      }
    }
  });

  // Requirement Evidence Criteria
  const requirementEvidenceCriteria: any[] = [];
  let criterionCount = 0;
  requirements.forEach(req => {
    const numCriteria = randomRange(1, 2);
    for (let c = 0; c < numCriteria; c++) {
      const critId = `00000000-0000-0000-000e-${criterionCount.toString().padStart(8, '0')}`;
      requirementEvidenceCriteria.push({
        id: critId,
        organisation_id: org.id,
        requirement_id: req.id,
        title: `[DEMO] Criterion ${c + 1} for ${req.title.substring(7)}`,
        description: `Please upload the verification document supporting this criterion.`,
        evidence_type: randomElement(['Certificate', 'SOP', 'Inspection Record', 'Log Sheet', 'Report']),
        is_required: c === 0,
        weight: c === 0 ? 1.0 : 0.5,
        minimum_count: 1,
        frequency: req.review_frequency,
        coverage_period: '12 months',
        validity_required: true,
        created_by: profile.id,
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z'
      });
      criterionCount++;
    }
  });

  // Criteria Matches
  const requirementEvidenceCriterionMatches: any[] = [];
  let matchCount = 0;
  requirementDocuments.forEach(rd => {
    const criteria = requirementEvidenceCriteria.filter(c => c.requirement_id === rd.requirement_id);
    criteria.forEach(crit => {
      if (random() > 0.4) {
        requirementEvidenceCriterionMatches.push({
          id: `00000000-0000-0000-000f-${matchCount.toString().padStart(8, '0')}`,
          organisation_id: org.id,
          criterion_id: crit.id,
          document_id: rd.document_id,
          competency_record_id: null,
          action_id: null,
          match_status: 'Matched' as const,
          matched_by: profile.id,
          matched_at: new Date().toISOString(),
          notes: 'Matched during demo seeding.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        matchCount++;
      }
    });
  });

  // 7. Actions (around 180)
  const actionTitles = [
    'Renew forklift certification for selected operators',
    'Upload missing fire drill record',
    'Review pest control contractor approval',
    'Close corrective action from internal audit',
    'Update vehicle maintenance evidence',
    'Verify temperature probe calibration records',
    'Complete supplier review for packaging provider',
    'Upload missing driver CPC evidence',
    'Review warehouse cleaning verification sheet',
    'Investigate overdue security walkaround check'
  ];

  const actions: any[] = [];
  for (let i = 0; i < 200; i++) {
    const templateTitle = actionTitles[i % actionTitles.length];
    const unit = reqUnits[Math.floor(i / actionTitles.length) % reqUnits.length];
    const title = `[DEMO] ${unit} - ${templateTitle}`;

    const randStatus = random();
    let status: 'Open' | 'Complete' | 'In Progress' | 'Cancelled' = 'Open';
    if (randStatus < 0.4) status = 'Complete';
    else if (randStatus < 0.7) status = 'In Progress';
    else if (randStatus < 0.9) status = 'Open';
    else status = 'Cancelled';

    const dueDate = new Date(Date.now() + randomRange(-30, 150) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    actions.push({
      id: `00000000-0000-0000-000b-${i.toString().padStart(8, '0')}`,
      organisation_id: org.id,
      title: title,
      description: `Corrective action task to resolve compliance items regarding ${templateTitle}.`,
      owner: randomElement(['John Smith', 'Sarah Connor', 'Demo Administrator', 'Compliance Lead']),
      status: status,
      due_date: dueDate,
      target_due_date: dueDate,
      opened_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      opened_by: profile.id,
      closed_at: status === 'Complete' || status === 'Cancelled' ? new Date().toISOString() : null,
      closed_by: status === 'Complete' || status === 'Cancelled' ? profile.id : null,
      created_by: profile.id,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Requirement Action links
  const requirementActions: any[] = [];
  let reqActionCount = 0;
  actions.forEach(action => {
    if (random() > 0.4) {
      const req = randomElement(requirements);
      requirementActions.push({
        id: `00000000-0000-0000-0009-${reqActionCount.toString().padStart(8, '0')}`,
        requirement_id: req.id,
        action_id: action.id,
        organisation_id: org.id,
        created_at: new Date().toISOString()
      });
      reqActionCount++;
    }
  });

  // Action Document links
  const actionDocuments: any[] = [];
  let actDocCount = 0;
  actions.forEach(action => {
    if (action.status === 'Complete' && random() > 0.3) {
      const doc = randomElement(evidenceDocuments);
      actionDocuments.push({
        id: `00000000-0000-0000-0008-${actDocCount.toString().padStart(8, '0')}`,
        organisation_id: org.id,
        action_id: action.id,
        document_id: doc.id,
        linked_by: profile.id,
        linked_at: new Date().toISOString()
      });
      actDocCount++;
    }
  });

  // Action updates (notes)
  const actionUpdates: any[] = [];
  let actUpdateCount = 0;
  actions.forEach(action => {
    if (action.status !== 'Open' && random() > 0.5) {
      actionUpdates.push({
        id: `00000000-0000-0000-0010-${actUpdateCount.toString().padStart(8, '0')}`,
        organisation_id: org.id,
        action_id: action.id,
        user_id: profile.id,
        update_type: 'Note' as const,
        note: `Demo progress log comment. Checked logs, working on resolving this target.`,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      });
      actUpdateCount++;
    }
  });

  // 8. Audit Packs (around 20)
  const auditPackNames = [
    'Warehouse Compliance Review',
    'Fleet Compliance Review',
    'Training Evidence Pack',
    'Security Audit Pack',
    'Customer Audit Pack',
    'Internal Audit Pack',
    'Temperature Control Evidence Pack',
    'Supplier Approval Evidence Pack'
  ];

  const auditPacks: any[] = [];
  for (let i = 0; i < 30; i++) {
    const name = `[DEMO] ${auditPackNames[i % auditPackNames.length]} - Batch ${Math.floor(i / auditPackNames.length) + 1}`;
    const randStatus = random();
    let status: 'Draft' | 'Ready' | 'Sent' | 'Archived' = 'Draft';
    if (randStatus < 0.4) status = 'Draft';
    else if (randStatus < 0.7) status = 'Ready';
    else if (randStatus < 0.9) status = 'Sent';
    else status = 'Archived';

    const packRequirements = Array.from({ length: randomRange(2, 6) }, () => randomElement(requirements).id);
    const packDocuments = Array.from({ length: randomRange(3, 8) }, () => randomElement(evidenceDocuments).id);

    auditPacks.push({
      id: `00000000-0000-0000-000c-${i.toString().padStart(8, '0')}`,
      organization_id: org.id,
      created_by: profile.id,
      name: name,
      description: `Seeded audit pack containing compliance evidence for ${name}.`,
      status: status,
      share_token: status === 'Sent' ? `demo-token-${i}-${randomRange(1000, 9999)}` : null,
      share_expires_at: status === 'Sent' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null,
      pin_code: status === 'Sent' ? `${randomRange(1000, 9999)}` : null,
      requirements: packRequirements,
      documents: packDocuments,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 9. Audit Trail Events (around 500)
  const auditTrailEvents: any[] = [];
  const eventActions = [
    { type: 'evidence_uploaded', category: 'Evidence', entity: 'evidence_document' },
    { type: 'evidence_metadata_updated', category: 'Evidence', entity: 'evidence_document' },
    { type: 'evidence_linked', category: 'Evidence', entity: 'evidence_document' },
    { type: 'evidence_archived', category: 'Evidence', entity: 'evidence_document' },
    { type: 'requirement_created', category: 'Requirements', entity: 'requirement' },
    { type: 'requirement_edited', category: 'Requirements', entity: 'requirement' },
    { type: 'action_completed', category: 'Actions', entity: 'action' },
    { type: 'action_cancelled', category: 'Actions', entity: 'action' },
    { type: 'competency_record_updated', category: 'Competency', entity: 'competency_record' },
    { type: 'audit_pack_exported', category: 'Audit Packs', entity: 'audit_pack' }
  ];

  for (let i = 0; i < 750; i++) {
    const evAction = eventActions[i % eventActions.length];
    const eventId = `00000000-0000-0000-000d-${i.toString().padStart(8, '0')}`;
    const timeOffset = (90 - (i * 90 / 750)) * 24 * 60 * 60 * 1000;
    const createdAt = new Date(Date.now() - timeOffset).toISOString();

    let entityLabel = `[DEMO] Event Entity ${i}`;
    let entityId = null;

    if (evAction.entity === 'evidence_document') {
      const doc = randomElement(evidenceDocuments);
      entityLabel = doc.title;
      entityId = doc.id;
    } else if (evAction.entity === 'requirement') {
      const req = randomElement(requirements);
      entityLabel = req.title;
      entityId = req.id;
    } else if (evAction.entity === 'action') {
      const act = randomElement(actions);
      entityLabel = act.title;
      entityId = act.id;
    } else if (evAction.entity === 'competency_record') {
      const rec = randomElement(competencyRecords);
      const person = people.find(p => p.id === rec.person_id);
      const compType = competencyTypes.find(t => t.id === rec.competency_type_id);
      entityLabel = `${person?.display_name || 'Staff'} - ${compType?.title || 'Training'}`;
      entityId = rec.id;
    } else if (evAction.entity === 'audit_pack') {
      const pack = randomElement(auditPacks);
      entityLabel = pack.name;
      entityId = pack.id;
    }

    auditTrailEvents.push({
      id: eventId,
      organization_id: org.id,
      actor_user_id: profile.id,
      actor_name: profile.full_name,
      actor_email: 'demo.administrator@demologistics.example.com',
      actor_role: profile.role,
      action_type: evAction.type,
      action_category: evAction.category,
      entity_type: evAction.entity,
      entity_id: entityId,
      entity_label: entityLabel,
      description: `Seeded demo event for action ${evAction.type.replace(/_/g, ' ')} on ${entityLabel}`,
      before_snapshot: null,
      after_snapshot: null,
      changed_fields: null,
      metadata: {
        seeded_demo: true,
        seed_batch_id: 'batch-demo-logistic-seeding',
        demo_organisation: 'Overview360 Demo Logistics Ltd'
      },
      undo_available: evAction.type === 'evidence_archived' || evAction.type === 'evidence_linked',
      undo_action_type: evAction.type === 'evidence_archived' ? 'restore_evidence' : null,
      undo_expires_at: new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      undone_at: null,
      undone_by: null,
      created_at: createdAt,
      severity: random() > 0.9 ? 'warning' : 'info',
      source: 'app'
    });
  }

  // 10. Matrix cells (used to verify readiness engine status)
  const matrixCells: any[] = [];
  const cellTargets = [
    { name: 'Unit 1 Warehouse', type: 'Facility' as const },
    { name: 'Dublin Main Facility', type: 'Facility' as const },
    { name: 'HGV Tractor FLT-012', type: 'Vehicle' as const },
    { name: 'Trailer TR-404', type: 'Vehicle' as const }
  ];

  requirements.slice(0, 20).forEach((req, rIdx) => {
    cellTargets.forEach((target, tIdx) => {
      matrixCells.push({
        id: `00000000-0000-0000-0011-${(rIdx * 10 + tIdx).toString().padStart(8, '0')}`,
        organization_id: org.id,
        requirement_id: req.id,
        target_name: target.name,
        target_type: target.type,
        document_id: random() > 0.4 ? randomElement(evidenceDocuments).id : null,
        status: randomElement(['Compliant', 'Expiring Soon', 'Expired', 'Missing'] as const),
        last_checked_at: new Date().toISOString()
      });
    });
  });

  return {
    org,
    profile,
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    evidenceDocuments,
    requirements,
    requirementDocuments,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    actions,
    requirementActions,
    actionDocuments,
    actionUpdates,
    auditPacks,
    auditTrailEvents,
    matrixCells
  };
}

// Running script directly via tsx
if (require.main === module) {
  console.log('Generating high-volume Overview360 demo compliance data...');
  const data = generateDemoData();
  
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'seeded-demo-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`Successfully generated demo data. Written to: ${outputPath}`);
  console.log('Summary of generated records:');
  console.log(`- Organizations: 1 (${data.org.name})`);
  console.log(`- Profiles: 1 (${data.profile.full_name})`);
  console.log(`- People: ${data.people.length}`);
  console.log(`- Competency Types: ${data.competencyTypes.length}`);
  console.log(`- Competency Records: ${data.competencyRecords.length}`);
  console.log(`- Evidence Documents: ${data.evidenceDocuments.length}`);
  console.log(`- Requirements: ${data.requirements.length}`);
  console.log(`- Criteria: ${data.requirementEvidenceCriteria.length}`);
  console.log(`- Criteria Matches: ${data.requirementEvidenceCriterionMatches.length}`);
  console.log(`- Actions: ${data.actions.length}`);
  console.log(`- Audit Packs: ${data.auditPacks.length}`);
  console.log(`- Audit Trail Events: ${data.auditTrailEvents.length}`);
}
