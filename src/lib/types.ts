export type UserRole = 'Owner' | 'Admin' | 'Editor' | 'Auditor' | 'Viewer';

export interface Organization {
  id: string;
  name: string;
  compliance_profile: string;
  industry: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRequirement {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  category: 'Vehicle' | 'Driver' | 'Facility' | 'General';
  frequency_months?: number;
  is_mandatory: boolean;
  created_at: string;
}

export type DocumentStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Unclassified' | 'deleted' | 'Archived';

export interface EvidenceDocument {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  title: string;
  file_url: string | null;
  file_name: string;
  original_file_name?: string | null;
  safe_file_name?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  file_hash?: string | null;
  file_size_bytes: number;
  category: string;
  status: DocumentStatus;
  expiry_date: string | null;
  issue_date: string | null;
  review_date?: string | null;
  training_date?: string | null;
  calibration_date?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  permanently_deleted_at?: string | null;
  tags?: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EvidenceUploadInput {
  file: File;
  title: string;
  category: string;
  expiry_date: string | null;
  issue_date: string | null;
  review_date?: string | null;
  training_date?: string | null;
  calibration_date?: string | null;
  file_hash?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;
}

export type RequirementStatus = 'GREEN' | 'AMBER' | 'RED' | 'GREY';
export type RequirementLifecycleStatus = 'ACTIVE' | 'ARCHIVED' | 'DEACTIVATED' | 'DELETED';
export type RequirementRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReviewFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
export type ActionStatus = 'Open' | 'In Progress' | 'Complete' | 'Cancelled';
export type PersonType = 'Employee' | 'Contractor' | 'Agency' | 'Driver' | 'Visitor' | 'Consultant' | 'Other';
export type CompetencyCategory =
  | 'Safety'
  | 'Equipment & Vehicle'
  | 'Transport'
  | 'Security'
  | 'Quality & Compliance'
  | 'Environmental'
  | 'Operational'
  | 'Professional'
  | 'Industry Certification'
  | 'Other';
export type CompetencyStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Missing' | 'Not Required';
export type ActionUpdateType =
  | 'Note'
  | 'Progress Update'
  | 'Evidence Added'
  | 'Status Change'
  | 'Completion Note'
  | 'Cancellation Note'
  | 'Reopen Note';

export interface Requirement {
  id: string;
  title: string;
  description: string | null;
  owner: string | null;
  category: string;
  status: RequirementStatus;
  review_frequency: ReviewFrequency;
  review_date: string | null;
  next_due_date: string | null;
  risk_level: RequirementRiskLevel;
  lifecycle_status?: RequirementLifecycleStatus;
  archived_at?: string | null;
  archived_by?: string | null;
  deactivated_at?: string | null;
  deactivated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  notes?: string | null;
  organisation_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementEvidenceType {
  id: string;
  requirement_id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RequirementDocument {
  id: string;
  requirement_id: string;
  document_id: string;
  organisation_id: string;
  linked_by: string | null;
  created_at: string;
}

export type EvidenceCriterionFrequency = 'One-off' | 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
export type EvidenceCriterionMatchStatus = 'Matched' | 'Needs Review' | 'Rejected';
export type EvidenceCoverageStatus = 'Fully Covered' | 'Partially Covered' | 'Not Covered' | 'Not Assessed';

export interface RequirementEvidenceCriterion {
  id: string;
  organisation_id: string;
  requirement_id: string;
  title: string;
  description: string | null;
  evidence_type: string | null;
  is_required: boolean;
  weight: number;
  minimum_count: number;
  frequency: EvidenceCriterionFrequency | string | null;
  coverage_period: string | null;
  validity_required: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementEvidenceCriterionMatch {
  id: string;
  organisation_id: string;
  criterion_id: string;
  document_id: string | null;
  competency_record_id: string | null;
  action_id: string | null;
  match_status: EvidenceCriterionMatchStatus;
  matched_by: string | null;
  matched_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementEvidenceCoverage {
  requirement_id: string;
  status: EvidenceCoverageStatus;
  coveragePercent: number | null;
  coveredRequired: number;
  totalRequired: number;
  weightedCovered: number;
  weightedTotal: number;
  bestCoverageDate: string | null;
  summary: string;
  reasons: string[];
  criteria: Array<{
    criterion: RequirementEvidenceCriterion;
    status: EvidenceCoverageStatus;
    matchedDocuments: EvidenceDocument[];
    matchedCompetencyRecords: CompetencyRecord[];
    matchedActions: Action[];
    bestCoverageDate: string | null;
    reasons: string[];
  }>;
  legacyLinkedDocuments: EvidenceDocument[];
}

export interface Review {
  id: string;
  requirement_id: string;
  organisation_id: string;
  reviewed_by: string | null;
  review_date: string;
  next_due_date: string | null;
  status: RequirementStatus;
  notes: string | null;
  created_at: string;
}

export interface Action {
  id: string;
  organisation_id: string;
  title: string;
  description: string | null;
  owner: string | null;
  status: ActionStatus;
  due_date: string | null;
  target_due_date?: string | null;
  opened_at?: string | null;
  opened_by?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  status_changed_at?: string | null;
  status_changed_by?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_note?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_note?: string | null;
}

export interface RequirementAction {
  id: string;
  requirement_id: string;
  action_id: string;
  organisation_id: string;
  created_at: string;
}

export interface ActionUpdate {
  id: string;
  organisation_id: string;
  action_id: string;
  user_id: string | null;
  update_type: ActionUpdateType;
  note: string;
  created_at: string;
}

export interface ActionDocument {
  id: string;
  organisation_id: string;
  action_id: string;
  document_id: string;
  linked_by: string | null;
  linked_at: string;
}

export interface ActionObjectLink {
  id: string;
  organisation_id: string;
  action_id: string;
  object_type: string;
  object_id: string;
  linked_by: string | null;
  linked_at: string;
}

export interface RequirementTemplateItem {
  title: string;
  category: string;
  suggested_owner: string;
  review_frequency: ReviewFrequency;
  risk_level: RequirementRiskLevel;
  suggested_evidence_types: string[];
  suggested_criteria?: Array<{
    title: string;
    description?: string;
    evidence_type?: string;
    is_required?: boolean;
    weight?: number;
    minimum_count?: number;
    frequency?: EvidenceCriterionFrequency | string | null;
    validity_required?: boolean;
  }>;
  description?: string;
}

export interface RequirementTemplatePack {
  id: string;
  name: string;
  description: string;
  requirements: RequirementTemplateItem[];
}

export interface ManagedCategory {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  category_group: string | null;
  is_system: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  organisation_id: string;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string | null;
  department: string | null;
  role: string | null;
  person_type: PersonType;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetencyType {
  id: string;
  organisation_id: string;
  title: string;
  category: CompetencyCategory;
  description: string | null;
  validity_period_months: number | null;
  refresher_period_months: number | null;
  evidence_required: boolean;
  default_risk_level: RequirementRiskLevel;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetencyRecord {
  id: string;
  organisation_id: string;
  person_id: string;
  competency_type_id: string;
  completed_date: string | null;
  expiry_date: string | null;
  trainer: string | null;
  provider: string | null;
  certificate_number: string | null;
  status: CompetencyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetencyRecordDocument {
  id: string;
  organisation_id: string;
  competency_record_id: string;
  document_id: string;
  linked_by: string | null;
  linked_at: string;
}

export interface RequirementCompetencyType {
  id: string;
  organisation_id: string;
  requirement_id: string;
  competency_type_id: string;
  linked_by: string | null;
  linked_at: string;
}

export interface CompetencyTemplateItem {
  title: string;
  category: CompetencyCategory;
  description?: string;
  validity_period_months?: number | null;
  refresher_period_months?: number | null;
  evidence_required?: boolean;
  default_risk_level?: RequirementRiskLevel;
}

export interface CompetencyTemplatePack {
  id: string;
  name: string;
  description: string;
  category: CompetencyCategory;
  competencies: CompetencyTemplateItem[];
}

export type CellStatus = 'Compliant' | 'Expiring Soon' | 'Expired' | 'Missing' | 'N/A';

export interface MatrixCell {
  id: string;
  organization_id: string;
  requirement_id: string;
  target_name: string;
  target_type: 'Vehicle' | 'Facility' | 'Personnel';
  document_id: string | null;
  status: CellStatus;
  last_checked_at: string;
}

export interface AuditPack {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  status: 'Draft' | 'Ready' | 'Sent' | 'Archived' | 'Active';
  share_token: string | null;
  share_expires_at: string | null;
  pin_code: string | null;
  requirements: string[]; // Requirement IDs
  documents: string[]; // Document IDs
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  profile_id: string | null;
  action: string;
  details: string;
  created_at: string;
}
