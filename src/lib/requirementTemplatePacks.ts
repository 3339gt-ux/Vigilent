import type { RequirementTemplatePack } from './types';

export const REQUIREMENT_TEMPLATE_PACKS: RequirementTemplatePack[] = [
  {
    id: 'transport-operations',
    name: 'Transport Operations Pack',
    description: 'Core operating requirements for transport planning, dispatch, driver records, and incident follow-up.',
    requirements: [
      {
        title: 'Transport Schedule Control',
        category: 'Transport Operations',
        suggested_owner: 'Transport Manager',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Dispatch plan', 'Route schedule', 'Exception log'],
        description: 'Transport schedules should be planned, monitored, and updated when exceptions occur.'
      },
      {
        title: 'Driver Availability Records',
        category: 'Transport Operations',
        suggested_owner: 'Operations Coordinator',
        review_frequency: 'Weekly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Driver roster', 'Availability record', 'Absence record'],
        description: 'Driver availability and assignment records should be maintained for operating visibility.'
      },
      {
        title: 'Delivery Exception Review',
        category: 'Transport Operations',
        suggested_owner: 'Transport Manager',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Exception report', 'Customer communication', 'Corrective action record']
      },
      {
        title: 'Incident Follow-Up',
        category: 'Transport Operations',
        suggested_owner: 'Operations Lead',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Incident report', 'Investigation note', 'Action closure record']
      }
    ]
  },
  {
    id: 'warehouse-operations',
    name: 'Warehouse Operations Pack',
    description: 'Starter requirements for warehouse checks, stock control, housekeeping, and equipment readiness.',
    requirements: [
      {
        title: 'Goods-In Check Records',
        category: 'Warehouse Operations',
        suggested_owner: 'Warehouse Lead',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Goods-in checklist', 'Inbound discrepancy log', 'Receiving record']
      },
      {
        title: 'Stock Accuracy Checks',
        category: 'Warehouse Operations',
        suggested_owner: 'Inventory Lead',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Cycle count report', 'Stock adjustment record', 'Variance review']
      },
      {
        title: 'Housekeeping Inspection',
        category: 'Warehouse Operations',
        suggested_owner: 'Warehouse Supervisor',
        review_frequency: 'Weekly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Inspection checklist', 'Photo record', 'Corrective action record']
      },
      {
        title: 'Material Handling Equipment Checks',
        category: 'Warehouse Operations',
        suggested_owner: 'Warehouse Supervisor',
        review_frequency: 'Weekly',
        risk_level: 'High',
        suggested_evidence_types: ['Pre-use checklist', 'Maintenance request', 'Defect closure record']
      }
    ]
  },
  {
    id: 'training-records',
    name: 'Training Records Pack',
    description: 'Requirements for induction, task training, refreshers, and competency tracking.',
    requirements: [
      {
        title: 'New Starter Induction',
        category: 'Training Records',
        suggested_owner: 'People Lead',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Induction checklist', 'Attendance record', 'Acknowledgement form']
      },
      {
        title: 'Role Training Matrix',
        category: 'Training Records',
        suggested_owner: 'Department Manager',
        review_frequency: 'Quarterly',
        risk_level: 'High',
        suggested_evidence_types: ['Training matrix', 'Gap report', 'Training plan']
      },
      {
        title: 'Refresher Training Review',
        category: 'Training Records',
        suggested_owner: 'Training Coordinator',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Refresher schedule', 'Completion record', 'Certificate']
      },
      {
        title: 'Competency Sign-Off',
        category: 'Training Records',
        suggested_owner: 'Line Manager',
        review_frequency: 'Quarterly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Competency checklist', 'Supervisor sign-off', 'Observation record']
      }
    ]
  },
  {
    id: 'document-control',
    name: 'Document Control Pack',
    description: 'Generic controls for procedures, approval, version review, and document access.',
    requirements: [
      {
        title: 'Procedure Approval',
        category: 'Document Control',
        suggested_owner: 'Process Owner',
        review_frequency: 'Annually',
        risk_level: 'Medium',
        suggested_evidence_types: ['Approved procedure', 'Approval record', 'Version history']
      },
      {
        title: 'Document Review Schedule',
        category: 'Document Control',
        suggested_owner: 'Document Controller',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Review schedule', 'Overdue review list', 'Document register']
      },
      {
        title: 'Obsolete Document Control',
        category: 'Document Control',
        suggested_owner: 'Document Controller',
        review_frequency: 'Quarterly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Archive register', 'Withdrawal record', 'Access review']
      },
      {
        title: 'Form Template Control',
        category: 'Document Control',
        suggested_owner: 'Quality Coordinator',
        review_frequency: 'Annually',
        risk_level: 'Low',
        suggested_evidence_types: ['Template register', 'Approved form', 'Change note']
      }
    ]
  },
  {
    id: 'security-records',
    name: 'Security Records Pack',
    description: 'Operational security requirements for access, visitors, checks, and incident records.',
    requirements: [
      {
        title: 'Access Permission Review',
        category: 'Security Records',
        suggested_owner: 'Site Manager',
        review_frequency: 'Quarterly',
        risk_level: 'High',
        suggested_evidence_types: ['Access list', 'Permission review', 'Removal record']
      },
      {
        title: 'Visitor Log Control',
        category: 'Security Records',
        suggested_owner: 'Reception Lead',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Visitor log', 'Badge issue record', 'Escort record']
      },
      {
        title: 'Security Incident Record',
        category: 'Security Records',
        suggested_owner: 'Security Lead',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Incident report', 'Investigation note', 'Action closure record']
      },
      {
        title: 'Key And Asset Register',
        category: 'Security Records',
        suggested_owner: 'Facilities Lead',
        review_frequency: 'Quarterly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Key register', 'Asset register', 'Return record']
      }
    ]
  },
  {
    id: 'fleet-records',
    name: 'Fleet Records Pack',
    description: 'Starter requirements for fleet documents, inspections, maintenance, and defects.',
    requirements: [
      {
        title: 'Vehicle Insurance',
        category: 'Fleet Records',
        suggested_owner: 'Fleet Manager',
        review_frequency: 'Annually',
        risk_level: 'Critical',
        suggested_evidence_types: ['Insurance policy', 'Renewal confirmation', 'Vehicle schedule']
      },
      {
        title: 'Vehicle Inspection Records',
        category: 'Fleet Records',
        suggested_owner: 'Fleet Supervisor',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Inspection sheet', 'Defect report', 'Repair record']
      },
      {
        title: 'Maintenance Planner',
        category: 'Fleet Records',
        suggested_owner: 'Fleet Manager',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Maintenance schedule', 'Service record', 'Overdue maintenance report']
      },
      {
        title: 'Driver Vehicle Handover',
        category: 'Fleet Records',
        suggested_owner: 'Transport Supervisor',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Handover form', 'Checklist', 'Issue log']
      }
    ]
  },
  {
    id: 'contractor-supplier',
    name: 'Contractor & Supplier Pack',
    description: 'Supplier and contractor onboarding, approval, review, and document maintenance requirements.',
    requirements: [
      {
        title: 'Supplier Approval Record',
        category: 'Contractor & Supplier',
        suggested_owner: 'Procurement Lead',
        review_frequency: 'Annually',
        risk_level: 'Medium',
        suggested_evidence_types: ['Supplier approval form', 'Supplier register', 'Review note']
      },
      {
        title: 'Contractor Induction',
        category: 'Contractor & Supplier',
        suggested_owner: 'Site Manager',
        review_frequency: 'Annually',
        risk_level: 'High',
        suggested_evidence_types: ['Induction record', 'Attendance record', 'Acknowledgement form']
      },
      {
        title: 'Supplier Performance Review',
        category: 'Contractor & Supplier',
        suggested_owner: 'Procurement Lead',
        review_frequency: 'Quarterly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Performance scorecard', 'Issue log', 'Review minutes']
      },
      {
        title: 'Contractor Document Register',
        category: 'Contractor & Supplier',
        suggested_owner: 'Site Coordinator',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Document register', 'Expiry report', 'Follow-up record']
      }
    ]
  },
  {
    id: 'audit-readiness',
    name: 'Audit Readiness Pack',
    description: 'Core operating requirements for audit preparation, findings, actions, and evidence completeness.',
    requirements: [
      {
        title: 'Audit Plan',
        category: 'Audit Readiness',
        suggested_owner: 'Assurance Lead',
        review_frequency: 'Quarterly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Audit plan', 'Scope note', 'Schedule']
      },
      {
        title: 'Finding Register',
        category: 'Audit Readiness',
        suggested_owner: 'Assurance Lead',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Finding register', 'Issue log', 'Closure evidence']
      },
      {
        title: 'Action Closure Review',
        category: 'Audit Readiness',
        suggested_owner: 'Action Owner',
        review_frequency: 'Monthly',
        risk_level: 'High',
        suggested_evidence_types: ['Action tracker', 'Closure record', 'Verification note']
      },
      {
        title: 'Evidence Completeness Check',
        category: 'Audit Readiness',
        suggested_owner: 'Evidence Owner',
        review_frequency: 'Monthly',
        risk_level: 'Medium',
        suggested_evidence_types: ['Evidence checklist', 'Missing record report', 'Review sign-off']
      }
    ]
  }
];
