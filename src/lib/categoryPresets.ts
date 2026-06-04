export const REQUIREMENT_CATEGORY_GROUPS = [
  {
    group: 'General Business',
    categories: [
      'Governance',
      'Document Control',
      'Training',
      'Operations',
      'Risk Management',
      'Audit Readiness',
      'Corrective Actions',
      'Supplier Management',
      'Customer Requirements'
    ]
  },
  {
    group: 'Transport & Logistics',
    categories: [
      'Fleet',
      'Driver Management',
      'Vehicle Compliance',
      'Load Security',
      'Transport Operations',
      'Yard Safety',
      'Temperature Controlled Transport',
      'Delivery Documentation'
    ]
  },
  {
    group: 'Warehouse',
    categories: [
      'Goods In',
      'Goods Out',
      'Storage',
      'Picking & Packing',
      'Equipment Checks',
      'Housekeeping',
      'Pest Control',
      'Stock Accuracy'
    ]
  },
  {
    group: 'Quality & Compliance',
    categories: [
      'Internal Audits',
      'Management Review',
      'Change Control',
      'CAPA',
      'Complaints',
      'Calibration',
      'Traceability',
      'Records Management'
    ]
  },
  {
    group: 'Health & Safety',
    categories: [
      'Risk Assessments',
      'Training',
      'Emergency Preparedness',
      'Incident Reporting',
      'PPE',
      'Contractor Safety',
      'Workplace Inspections'
    ]
  },
  {
    group: 'Security',
    categories: [
      'Access Control',
      'Visitor Management',
      'CCTV / Monitoring',
      'Incident Response',
      'Information Security',
      'Transport Security'
    ]
  },
  {
    group: 'Environmental',
    categories: [
      'Waste Management',
      'Spill Response',
      'Energy Use',
      'Emissions',
      'Chemical Control',
      'Environmental Awareness'
    ]
  }
] as const;

export const EVIDENCE_CATEGORY_GROUPS = [
  {
    group: 'Evidence Vault',
    categories: [
      'General',
      'Policies',
      'Procedures',
      'Work Instructions',
      'Forms',
      'Certificates',
      'Training & Competency',
      'Actions',
      'Audit Evidence',
      'Calibration',
      'Maintenance',
      'Fleet',
      'Insurance',
      'Security',
      'Pest Control',
      'Cleaning / Hygiene',
      'Supplier Records',
      'Customer Records',
      'HR Records',
      'Environmental',
      'Health & Safety',
      'Transport',
      'Warehouse',
      'Photos / Images',
      'Other'
    ]
  }
] as const;

export const flattenCategoryGroups = (groups: ReadonlyArray<{ group: string; categories: readonly string[] }>) =>
  groups.flatMap(group => group.categories);
