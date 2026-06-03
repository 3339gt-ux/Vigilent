import type { CompetencyTemplatePack } from './types';

const competency = (title: string, description?: string) => ({
  title,
  description,
  validity_period_months: 36,
  refresher_period_months: 12,
  evidence_required: true,
  default_risk_level: 'Medium' as const
});

export const COMPETENCY_TEMPLATE_PACKS: CompetencyTemplatePack[] = [
  {
    id: 'safety',
    name: 'Safety Competencies',
    description: 'Generic safety competency starters for practical workplace readiness.',
    category: 'Safety',
    competencies: [
      competency('Manual Handling'),
      competency('First Aid'),
      competency('Fire Warden'),
      competency('Working at Height'),
      competency('Confined Space'),
      competency('Lockout Tagout (LOTO)'),
      competency('Risk Assessment'),
      competency('Incident Investigation'),
      competency('Emergency Response'),
      competency('PPE Awareness'),
      competency('Chemical Safety')
    ].map(item => ({ ...item, category: 'Safety' as const }))
  },
  {
    id: 'equipment-vehicle',
    name: 'Equipment & Vehicle Competencies',
    description: 'Equipment and vehicle operation competency starters.',
    category: 'Equipment & Vehicle',
    competencies: [
      competency('Forklift'),
      competency('Reach Truck'),
      competency('VNA'),
      competency('MEWP'),
      competency('Crane'),
      competency('Telehandler'),
      competency('Excavator'),
      competency('Loader'),
      competency('Vehicle Familiarisation'),
      competency('Tail Lift Operation')
    ].map(item => ({ ...item, category: 'Equipment & Vehicle' as const, default_risk_level: 'High' as const }))
  },
  {
    id: 'transport',
    name: 'Transport Competencies',
    description: 'Transport operation competency starters. These are configurable templates only.',
    category: 'Transport',
    competencies: [
      competency('Driver CPC'),
      competency('Tachograph Awareness'),
      competency('Drivers Hours Awareness'),
      competency('Walkaround Checks'),
      competency('Vehicle Defect Reporting'),
      competency('Load Security'),
      competency('Load Restraint'),
      competency('Safe Coupling & Uncoupling'),
      competency('ADR Awareness'),
      competency('Fleet Safety'),
      competency('Delivery Documentation'),
      competency('Route Risk Awareness'),
      competency('Fuel Card & Toll Card Control'),
      competency('Incident Reporting'),
      competency('Customer Site Rules'),
      competency('Temperature Controlled Transport Awareness'),
      competency('Pharma / GDP Transport Awareness'),
      competency('Transport Security Awareness'),
      competency('Yard Safety')
    ].map(item => ({ ...item, category: 'Transport' as const, default_risk_level: 'High' as const }))
  },
  {
    id: 'security',
    name: 'Security Competencies',
    description: 'Generic security and information handling competency starters.',
    category: 'Security',
    competencies: [
      competency('Security Awareness'),
      competency('Visitor Management'),
      competency('Access Control'),
      competency('Cyber Awareness'),
      competency('Information Security'),
      competency('Data Protection'),
      competency('GDPR Awareness'),
      competency('Insider Threat Awareness')
    ].map(item => ({ ...item, category: 'Security' as const }))
  },
  {
    id: 'quality-compliance',
    name: 'Quality & Compliance Competencies',
    description: 'Generic quality and compliance process competency starters.',
    category: 'Quality & Compliance',
    competencies: [
      competency('Internal Auditor'),
      competency('Document Control'),
      competency('CAPA Management'),
      competency('Change Control'),
      competency('Complaint Handling'),
      competency('GDP Awareness'),
      competency('Food Safety'),
      competency('HACCP Awareness'),
      competency('Good Documentation Practice')
    ].map(item => ({ ...item, category: 'Quality & Compliance' as const }))
  },
  {
    id: 'environmental',
    name: 'Environmental Competencies',
    description: 'Environmental management competency starters.',
    category: 'Environmental',
    competencies: [
      competency('Waste Management'),
      competency('Spill Response'),
      competency('Environmental Awareness'),
      competency('Chemical Handling'),
      competency('Pollution Prevention'),
      competency('Sustainability Awareness')
    ].map(item => ({ ...item, category: 'Environmental' as const }))
  },
  {
    id: 'operational',
    name: 'Operational Competencies',
    description: 'Operational task competency starters for site and workflow readiness.',
    category: 'Operational',
    competencies: [
      competency('Warehouse Operations'),
      competency('Loading Procedures'),
      competency('Goods In'),
      competency('Goods Out'),
      competency('Inventory Control'),
      competency('Picking & Packing'),
      competency('Stock Accuracy'),
      competency('Returns Processing')
    ].map(item => ({ ...item, category: 'Operational' as const }))
  },
  {
    id: 'professional',
    name: 'Professional Competencies',
    description: 'Professional and management competency starters.',
    category: 'Professional',
    competencies: [
      competency('Leadership'),
      competency('Supervisory Skills'),
      competency('HR Awareness'),
      competency('Finance Awareness'),
      competency('Project Management'),
      competency('Customer Service'),
      competency('Communication Skills')
    ].map(item => ({ ...item, category: 'Professional' as const, default_risk_level: 'Low' as const }))
  },
  {
    id: 'industry-certification',
    name: 'Industry Certification Competencies',
    description: 'Generic certification maintenance starters. No compliance claim is implied.',
    category: 'Industry Certification',
    competencies: [
      competency('Internal Auditor'),
      competency('NEBOSH'),
      competency('IOSH'),
      competency('CILT'),
      competency('Lean Six Sigma'),
      competency('Professional Membership Maintenance')
    ].map(item => ({ ...item, category: 'Industry Certification' as const, default_risk_level: 'High' as const }))
  }
];
