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
  status: 'Draft' | 'Active' | 'Archived';
  share_token: string | null;
  share_expires_at: string | null;
  pin_code: string | null;
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
