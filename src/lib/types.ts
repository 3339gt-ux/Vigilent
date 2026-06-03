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

export type DocumentStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Unclassified' | 'deleted';

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
  file_size_bytes: number;
  category: string;
  status: DocumentStatus;
  expiry_date: string | null;
  issue_date: string | null;
  review_date?: string | null;
  training_date?: string | null;
  calibration_date?: string | null;
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
  tags?: string[];
  metadata?: Record<string, any>;
}

export type RequirementStatus = 'GREEN' | 'AMBER' | 'RED' | 'GREY';
export type RequirementRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReviewFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
export type ActionStatus = 'Open' | 'In Progress' | 'Complete' | 'Cancelled';

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

export interface RequirementTemplateItem {
  title: string;
  category: string;
  suggested_owner: string;
  review_frequency: ReviewFrequency;
  risk_level: RequirementRiskLevel;
  suggested_evidence_types: string[];
  description?: string;
}

export interface RequirementTemplatePack {
  id: string;
  name: string;
  description: string;
  requirements: RequirementTemplateItem[];
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
