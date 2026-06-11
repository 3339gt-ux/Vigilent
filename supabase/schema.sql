-- Vygilence Database Schema (PostgreSQL for Supabase)
-- Some legacy Vigilen object names may remain where renaming would affect existing deployments.
-- This script is idempotent and safe to re-run in Supabase SQL Editor.
-- It uses create-if-not-exists, alter-add-if-not-exists, create-or-replace functions,
-- repeatable grants, and drop-policy-if-exists before every create-policy statement.
-- It does not drop tables or destroy user data.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    compliance_profile text not null default 'Standard', -- e.g., 'Transport Operator', 'Cold Storage Logistics', 'General Warehousing'
    industry text,
    country text not null default 'Ireland',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.organizations add column if not exists industry text;
alter table public.organizations add column if not exists country text not null default 'Ireland';

-- 2. Profiles (Users)
create table if not exists public.profiles (
    id uuid primary key, -- References auth.users.id
    organization_id uuid references public.organizations(id) on delete set null,
    full_name text,
    role text not null default 'Viewer', -- 'Admin', 'Editor', 'Auditor', 'Viewer'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Organization Members
create table if not exists public.organization_members (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'Viewer', -- 'Owner', 'Admin', 'Editor', 'Auditor', 'Viewer'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organization_id, user_id)
);

-- 3. Compliance Requirements
create table if not exists public.compliance_requirements (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    title text not null,
    description text,
    category text not null, -- e.g., 'Vehicle', 'Driver', 'Facility', 'General'
    frequency_months integer, -- e.g., 12 for annual
    is_mandatory boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Evidence Documents (Vault)
create table if not exists public.evidence_documents (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    uploaded_by uuid references public.profiles(id) on delete set null,
    title text not null,
    file_url text, -- Null if offline mock
    file_name text not null,
    file_size_bytes integer,
    category text not null,
    status text not null default 'Active', -- 'Active', 'Expiring Soon', 'Expired', 'Unclassified'
    expiry_date date,
    issue_date date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.evidence_documents add column if not exists original_file_name text;
alter table public.evidence_documents add column if not exists safe_file_name text;
alter table public.evidence_documents add column if not exists storage_path text;
alter table public.evidence_documents add column if not exists mime_type text;
alter table public.evidence_documents add column if not exists file_hash text;
alter table public.evidence_documents add column if not exists tags text[] not null default '{}'::text[];
alter table public.evidence_documents add column if not exists review_date date;
alter table public.evidence_documents add column if not exists training_date date;
alter table public.evidence_documents add column if not exists calibration_date date;
alter table public.evidence_documents add column if not exists archived_at timestamp with time zone;
alter table public.evidence_documents add column if not exists archived_by uuid references public.profiles(id) on delete set null;
alter table public.evidence_documents add column if not exists deleted_at timestamp with time zone;
alter table public.evidence_documents add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
alter table public.evidence_documents add column if not exists permanently_deleted_at timestamp with time zone;

create unique index if not exists evidence_documents_storage_path_idx
    on public.evidence_documents (storage_path)
    where storage_path is not null;

create index if not exists evidence_documents_duplicate_lookup_idx
    on public.evidence_documents (organization_id, original_file_name, file_size_bytes, mime_type);

create index if not exists evidence_documents_hash_lookup_idx
    on public.evidence_documents (organization_id, file_hash)
    where file_hash is not null;

-- 4b. Standards-agnostic Requirements Framework
create table if not exists public.requirements (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    owner text,
    category text not null default 'General',
    status text not null default 'GREY',
    review_frequency text not null default 'Annually',
    review_date date,
    next_due_date date,
    risk_level text not null default 'Medium',
    notes text,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.requirements add column if not exists notes text;
alter table public.requirements add column if not exists lifecycle_status text not null default 'ACTIVE';
alter table public.requirements add column if not exists archived_at timestamp with time zone;
alter table public.requirements add column if not exists archived_by uuid references public.profiles(id) on delete set null;
alter table public.requirements add column if not exists deactivated_at timestamp with time zone;
alter table public.requirements add column if not exists deactivated_by uuid references public.profiles(id) on delete set null;
alter table public.requirements add column if not exists deleted_at timestamp with time zone;
alter table public.requirements add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create table if not exists public.requirement_categories (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    category_group text,
    is_system boolean not null default false,
    active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, name)
);

create table if not exists public.evidence_categories (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    category_group text,
    is_system boolean not null default false,
    active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, name)
);

create table if not exists public.requirement_evidence_types (
    id uuid primary key default uuid_generate_v4(),
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.requirement_documents (
    id uuid primary key default uuid_generate_v4(),
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    document_id uuid not null references public.evidence_documents(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    linked_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (requirement_id, document_id)
);

create table if not exists public.requirement_evidence_criteria (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    title text not null,
    description text,
    evidence_type text,
    is_required boolean not null default true,
    weight numeric not null default 1,
    minimum_count integer not null default 1,
    frequency text,
    coverage_period text,
    validity_required boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.reviews (
    id uuid primary key default uuid_generate_v4(),
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    reviewed_by uuid references public.profiles(id) on delete set null,
    review_date date not null,
    next_due_date date,
    status text not null default 'GREY',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.actions (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    title text not null,
    description text,
    owner text,
    status text not null default 'Open',
    due_date date,
    target_due_date date,
    opened_at timestamp with time zone default timezone('utc'::text, now()),
    opened_by uuid references public.profiles(id) on delete set null,
    closed_at timestamp with time zone,
    closed_by uuid references public.profiles(id) on delete set null,
    status_changed_at timestamp with time zone default timezone('utc'::text, now()),
    status_changed_by uuid references public.profiles(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    completed_at timestamp with time zone,
    completed_by uuid references public.profiles(id) on delete set null,
    completion_note text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid references public.profiles(id) on delete set null,
    cancellation_note text
);

-- Existing projects may already have public.actions. CREATE TABLE IF NOT EXISTS
-- does not add newly introduced columns, so keep this migration block before
-- any indexes, policies, or data backfills reference action record columns.
alter table public.actions add column if not exists opened_at timestamp with time zone;
alter table public.actions add column if not exists opened_by uuid references public.profiles(id) on delete set null;
alter table public.actions add column if not exists target_due_date date;
alter table public.actions add column if not exists closed_at timestamp with time zone;
alter table public.actions add column if not exists closed_by uuid references public.profiles(id) on delete set null;
alter table public.actions add column if not exists status_changed_at timestamp with time zone;
alter table public.actions add column if not exists status_changed_by uuid references public.profiles(id) on delete set null;
alter table public.actions add column if not exists completed_at timestamp with time zone;
alter table public.actions add column if not exists completed_by uuid references public.profiles(id) on delete set null;
alter table public.actions add column if not exists completion_note text;
alter table public.actions add column if not exists cancelled_at timestamp with time zone;
alter table public.actions add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;
alter table public.actions add column if not exists cancellation_note text;

create table if not exists public.requirement_actions (
    id uuid primary key default uuid_generate_v4(),
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    action_id uuid not null references public.actions(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (requirement_id, action_id)
);

create table if not exists public.action_updates (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    action_id uuid not null references public.actions(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    update_type text not null default 'Note',
    note text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.action_documents (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    action_id uuid not null references public.actions(id) on delete cascade,
    document_id uuid not null references public.evidence_documents(id) on delete cascade,
    linked_by uuid references public.profiles(id) on delete set null,
    linked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (action_id, document_id)
);

create table if not exists public.action_object_links (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    action_id uuid not null references public.actions(id) on delete cascade,
    object_type text not null,
    object_id uuid not null,
    linked_by uuid references public.profiles(id) on delete set null,
    linked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, action_id, object_type, object_id)
);

-- 4c. Generic Competency & Training Management
create table if not exists public.people (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    employee_number text,
    first_name text not null,
    last_name text not null,
    display_name text not null,
    email text,
    department text,
    role text,
    person_type text not null default 'Employee',
    start_date date,
    end_date date,
    active boolean not null default true,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.competency_types (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    title text not null,
    category text not null default 'Other',
    description text,
    validity_period_months integer,
    refresher_period_months integer,
    evidence_required boolean not null default true,
    default_risk_level text not null default 'Medium',
    active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, title, category)
);

create table if not exists public.competency_records (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    person_id uuid not null references public.people(id) on delete cascade,
    competency_type_id uuid not null references public.competency_types(id) on delete cascade,
    completed_date date,
    expiry_date date,
    trainer text,
    provider text,
    certificate_number text,
    status text not null default 'Missing',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, person_id, competency_type_id)
);

alter table public.competency_records alter column id set default uuid_generate_v4();

create table if not exists public.competency_record_documents (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    competency_record_id uuid not null references public.competency_records(id) on delete cascade,
    document_id uuid not null references public.evidence_documents(id) on delete cascade,
    linked_by uuid references public.profiles(id) on delete set null,
    linked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (competency_record_id, document_id)
);

create table if not exists public.requirement_competency_types (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    competency_type_id uuid not null references public.competency_types(id) on delete cascade,
    linked_by uuid references public.profiles(id) on delete set null,
    linked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (requirement_id, competency_type_id)
);

create table if not exists public.requirement_evidence_criterion_matches (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    criterion_id uuid not null references public.requirement_evidence_criteria(id) on delete cascade,
    document_id uuid references public.evidence_documents(id) on delete cascade,
    competency_record_id uuid references public.competency_records(id) on delete cascade,
    action_id uuid references public.actions(id) on delete cascade,
    match_status text not null default 'Matched',
    matched_by uuid references public.profiles(id) on delete set null,
    matched_at timestamp with time zone default timezone('utc'::text, now()) not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint criterion_match_has_source check (
        document_id is not null or competency_record_id is not null or action_id is not null
    ),
    unique (criterion_id, document_id),
    unique (criterion_id, competency_record_id),
    unique (criterion_id, action_id)
);

create index if not exists requirements_organisation_status_idx on public.requirements (organisation_id, status);
create index if not exists requirements_organisation_lifecycle_idx on public.requirements (organisation_id, lifecycle_status);
create index if not exists requirement_categories_organisation_active_idx on public.requirement_categories (organisation_id, active, category_group, name);
create index if not exists evidence_categories_organisation_active_idx on public.evidence_categories (organisation_id, active, category_group, name);
create index if not exists requirement_documents_organisation_idx on public.requirement_documents (organisation_id, requirement_id, document_id);
create index if not exists requirement_evidence_criteria_organisation_idx on public.requirement_evidence_criteria (organisation_id, requirement_id, is_required);
create index if not exists requirement_evidence_criterion_matches_organisation_idx on public.requirement_evidence_criterion_matches (organisation_id, criterion_id, match_status);
create index if not exists reviews_organisation_requirement_idx on public.reviews (organisation_id, requirement_id, review_date desc);
create index if not exists actions_organisation_status_idx on public.actions (organisation_id, status, due_date);
create index if not exists actions_organisation_target_due_idx on public.actions (organisation_id, status, target_due_date);
create index if not exists action_updates_organisation_action_idx on public.action_updates (organisation_id, action_id, created_at desc);
create index if not exists action_documents_organisation_action_idx on public.action_documents (organisation_id, action_id, document_id);
create index if not exists action_object_links_organisation_action_idx on public.action_object_links (organisation_id, action_id, object_type, object_id);
create index if not exists people_organisation_active_idx on public.people (organisation_id, active, department, person_type);
create index if not exists competency_types_organisation_active_idx on public.competency_types (organisation_id, active, category);
create index if not exists competency_records_organisation_status_idx on public.competency_records (organisation_id, status, expiry_date);
create index if not exists competency_record_documents_organisation_idx on public.competency_record_documents (organisation_id, competency_record_id, document_id);
create index if not exists requirement_competency_types_organisation_idx on public.requirement_competency_types (organisation_id, requirement_id, competency_type_id);

-- Storage bucket and storage.objects policies are managed separately in
-- supabase/storage_setup.sql because hosted Supabase projects may reject
-- repeated storage.objects policy drops from the core schema runner.

-- 5. Evidence Matrix Cells
-- Maps compliance requirements to specific targets (e.g. HGV-101, Facility-B, Driver-Jane)
create table if not exists public.matrix_cells (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    requirement_id uuid references public.compliance_requirements(id) on delete cascade,
    target_name text not null, -- e.g., 'HGV Truck #01', 'Warehouse Coldroom', 'Driver John Doe'
    target_type text not null, -- e.g., 'Vehicle', 'Facility', 'Personnel'
    document_id uuid references public.evidence_documents(id) on delete set null,
    status text not null default 'Missing', -- 'Compliant', 'Expiring Soon', 'Expired', 'Missing', 'N/A'
    last_checked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Audit Packs
create table if not exists public.audit_packs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    name text not null,
    description text,
    status text not null default 'Draft', -- 'Draft', 'Ready', 'Sent', 'Archived'
    share_token text unique,
    share_expires_at timestamp with time zone,
    pin_code text, -- Legacy demo-only PIN field; production packs do not use public links.
    requirements jsonb default '[]'::jsonb, -- Array of requirement IDs in the pack
    documents jsonb default '[]'::jsonb, -- Array of document IDs in the pack
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_packs
    add column if not exists requirements jsonb default '[]'::jsonb;

-- 7. Audit Activity Logs
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete set null,
    action text not null, -- e.g., 'Upload Document', 'Create Audit Pack', 'Update Expiry'
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7b. Rich Audit Trail Events
create table if not exists public.audit_trail_events (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    actor_user_id uuid references public.profiles(id) on delete set null,
    actor_name text,
    actor_email text,
    actor_role text,
    action_type text not null,
    action_category text not null,
    entity_type text not null,
    entity_id uuid,
    entity_label text,
    description text not null,
    before_snapshot jsonb,
    after_snapshot jsonb,
    changed_fields jsonb,
    metadata jsonb default '{}'::jsonb not null,
    undo_available boolean default false not null,
    undo_action_type text,
    undo_expires_at timestamp with time zone,
    undone_at timestamp with time zone,
    undone_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    severity text default 'info' not null,
    source text default 'app' not null
);

-- Audit Trail Events Indexes
create index if not exists audit_trail_events_org_created_idx on public.audit_trail_events (organization_id, created_at desc);

create index if not exists audit_trail_events_org_category_idx on public.audit_trail_events (organization_id, action_category);

create index if not exists audit_trail_events_org_entity_idx on public.audit_trail_events (organization_id, entity_type);

create index if not exists audit_trail_events_org_actor_idx on public.audit_trail_events (organization_id, actor_user_id);

create index if not exists audit_trail_events_org_action_idx on public.audit_trail_events (organization_id, action_type);

create index if not exists audit_trail_events_undo_idx on public.audit_trail_events (undo_available) where undo_available = true;

-- 7c. In-app Workspace Notifications
create table if not exists public.workspace_notifications (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    recipient_user_id uuid references public.profiles(id) on delete cascade,
    recipient_role text,
    actor_user_id uuid references public.profiles(id) on delete set null,
    title text not null,
    body text,
    type text not null,
    severity text default 'info' not null,
    entity_type text,
    entity_id uuid,
    entity_label text,
    action_url text,
    metadata jsonb default '{}'::jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7d. Saved Reports Configuration
create table if not exists public.saved_reports (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    owner_user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    description text,
    report_type text not null,
    data_source text not null,
    configuration jsonb not null,
    visibility text not null check (visibility in ('personal', 'organisation')),
    is_favourite boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists saved_reports_org_owner_idx
    on public.saved_reports (organization_id, owner_user_id);

create index if not exists saved_reports_org_visibility_idx
    on public.saved_reports (organization_id, visibility);

create or replace function public.set_saved_report_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists set_saved_reports_updated_at on public.saved_reports;
create trigger set_saved_reports_updated_at
before update on public.saved_reports
for each row
execute function public.set_saved_report_updated_at();

create index if not exists workspace_notifications_org_created_idx on public.workspace_notifications (organisation_id, created_at desc);
create index if not exists workspace_notifications_recipient_created_idx on public.workspace_notifications (recipient_user_id, created_at desc);
create index if not exists workspace_notifications_role_created_idx on public.workspace_notifications (organisation_id, recipient_role, created_at desc);
create index if not exists workspace_notifications_unread_idx on public.workspace_notifications (organisation_id, read_at) where read_at is null;

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.evidence_documents enable row level security;
alter table public.matrix_cells enable row level security;
alter table public.audit_packs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_trail_events enable row level security;
alter table public.workspace_notifications enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_categories enable row level security;
alter table public.evidence_categories enable row level security;
alter table public.requirement_evidence_types enable row level security;
alter table public.requirement_documents enable row level security;
alter table public.requirement_evidence_criteria enable row level security;
alter table public.requirement_evidence_criterion_matches enable row level security;
alter table public.reviews enable row level security;
alter table public.actions enable row level security;
alter table public.requirement_actions enable row level security;
alter table public.action_updates enable row level security;
alter table public.action_documents enable row level security;
alter table public.action_object_links enable row level security;
alter table public.people enable row level security;
alter table public.competency_types enable row level security;
alter table public.competency_records enable row level security;
alter table public.competency_record_documents enable row level security;
alter table public.requirement_competency_types enable row level security;
alter table public.saved_reports enable row level security;

revoke all on table public.saved_reports from anon;
grant select, insert, update, delete on table public.saved_reports to authenticated;

-- Row Level Security (RLS) Policies
-- auth.uid() links to profiles.id. The helper avoids recursive profile policy checks.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
    order by created_at asc
    limit 1
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members
        where user_id = auth.uid()
          and organization_id = target_organization_id
    )
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members
        where user_id = auth.uid()
          and organization_id = target_organization_id
          and role in ('Owner', 'Admin')
    )
$$;

create or replace function public.has_organization_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members
        where user_id = auth.uid()
          and organization_id = target_organization_id
          and role = any(allowed_roles)
    )
$$;

create or replace function public.can_write_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.has_organization_role(target_organization_id, array['Owner', 'Admin', 'Editor'])
$$;

create or replace function public.can_admin_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.has_organization_role(target_organization_id, array['Owner', 'Admin'])
$$;

create or replace function public.create_organization_for_current_user(
    org_name text,
    org_industry text default null,
    org_country text default 'Ireland',
    profile_full_name text default null
)
returns table (
    organization_id uuid,
    member_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
    new_org_id uuid;
    new_member_id uuid;
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'Authentication is required to create an organization.';
    end if;

    if nullif(trim(org_name), '') is null then
        raise exception 'Organization name is required.';
    end if;

    if exists (select 1 from public.organization_members where user_id = current_user_id) then
        raise exception 'User already belongs to an organization.';
    end if;

    insert into public.organizations (name, compliance_profile, industry, country)
    values (
        trim(org_name),
        coalesce(nullif(trim(org_industry), ''), 'Standard'),
        nullif(trim(org_industry), ''),
        coalesce(nullif(trim(org_country), ''), 'Ireland')
    )
    returning id into new_org_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (new_org_id, current_user_id, 'Owner')
    returning id into new_member_id;

    insert into public.profiles (id, organization_id, full_name, role)
    values (
        current_user_id,
        new_org_id,
        nullif(trim(profile_full_name), ''),
        'Owner'
    )
    on conflict (id) do update set
        organization_id = excluded.organization_id,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = 'Owner',
        updated_at = timezone('utc'::text, now());

    return query select new_org_id, new_member_id;
end;
$$;

grant execute on function public.create_organization_for_current_user(text, text, text, text) to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_owner(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, text[]) to authenticated;
grant execute on function public.can_write_organization(uuid) to authenticated;
grant execute on function public.can_admin_organization(uuid) to authenticated;

drop policy if exists "Users can read own organization" on public.organizations;
drop policy if exists "Users can update own organization" on public.organizations;
drop policy if exists "Users can read/write profiles in own organization" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read members in own organization" on public.organization_members;
drop policy if exists "Owners can manage members in own organization" on public.organization_members;
drop policy if exists "Users can read/write requirements in own organization" on public.compliance_requirements;
drop policy if exists "Users can read/write documents in own organization" on public.evidence_documents;
drop policy if exists "Users can read documents in own organization" on public.evidence_documents;
drop policy if exists "Members can upload documents in own organization" on public.evidence_documents;
drop policy if exists "Members can update active documents in own organization" on public.evidence_documents;
drop policy if exists "Owners can soft delete documents in own organization" on public.evidence_documents;
drop policy if exists "Users can read/write matrix cells in own organization" on public.matrix_cells;
drop policy if exists "Users can read/write audit packs in own organization" on public.audit_packs;
drop policy if exists "Users can read logs in own organization" on public.audit_logs;
drop policy if exists "Users can insert logs in own organization" on public.audit_logs;
drop policy if exists "Users can read requirements framework in own organisation" on public.requirements;
drop policy if exists "Members can write requirements framework in own organisation" on public.requirements;
drop policy if exists "Users can read requirement categories in own organisation" on public.requirement_categories;
drop policy if exists "Members can write requirement categories in own organisation" on public.requirement_categories;
drop policy if exists "Users can read evidence categories in own organisation" on public.evidence_categories;
drop policy if exists "Members can write evidence categories in own organisation" on public.evidence_categories;
drop policy if exists "Users can read requirement evidence types in own organisation" on public.requirement_evidence_types;
drop policy if exists "Members can write requirement evidence types in own organisation" on public.requirement_evidence_types;
drop policy if exists "Users can read requirement document links in own organisation" on public.requirement_documents;
drop policy if exists "Members can write requirement document links in own organisation" on public.requirement_documents;
drop policy if exists "Users can read evidence criteria in own organisation" on public.requirement_evidence_criteria;
drop policy if exists "Members can write evidence criteria in own organisation" on public.requirement_evidence_criteria;
drop policy if exists "Users can read criterion matches in own organisation" on public.requirement_evidence_criterion_matches;
drop policy if exists "Members can write criterion matches in own organisation" on public.requirement_evidence_criterion_matches;
drop policy if exists "Users can read reviews in own organisation" on public.reviews;
drop policy if exists "Members can write reviews in own organisation" on public.reviews;
drop policy if exists "Users can read actions in own organisation" on public.actions;
drop policy if exists "Members can write actions in own organisation" on public.actions;
drop policy if exists "Users can read requirement actions in own organisation" on public.requirement_actions;
drop policy if exists "Members can write requirement actions in own organisation" on public.requirement_actions;
drop policy if exists "Users can read people in own organisation" on public.people;
drop policy if exists "Members can write people in own organisation" on public.people;
drop policy if exists "Users can read competency types in own organisation" on public.competency_types;
drop policy if exists "Members can write competency types in own organisation" on public.competency_types;
drop policy if exists "Users can read competency records in own organisation" on public.competency_records;
drop policy if exists "Members can write competency records in own organisation" on public.competency_records;
drop policy if exists "Users can read competency record documents in own organisation" on public.competency_record_documents;
drop policy if exists "Members can write competency record documents in own organisation" on public.competency_record_documents;
drop policy if exists "Users can read requirement competency types in own organisation" on public.requirement_competency_types;
drop policy if exists "Members can write requirement competency types in own organisation" on public.requirement_competency_types;

-- Saved Reports
drop policy if exists "Members can read organization-shared or own reports" on public.saved_reports;
drop policy if exists "Members can create own reports; owners can create shared reports" on public.saved_reports;
drop policy if exists "Owners or admins can update reports" on public.saved_reports;
drop policy if exists "Owners or admins can delete reports" on public.saved_reports;

-- Organizations
drop policy if exists "Users can read own organization" on public.organizations;
create policy "Users can read own organization" on public.organizations
    for select using (
        public.is_organization_member(id)
    );

drop policy if exists "Users can update own organization" on public.organizations;
create policy "Users can update own organization" on public.organizations
    for update using (
        public.is_organization_owner(id)
    ) with check (
        public.is_organization_owner(id)
    );

-- Profiles
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
    for select using (
        id = auth.uid()
        or public.is_organization_member(organization_id)
    );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
    for update using (
        id = auth.uid()
    ) with check (
        id = auth.uid()
        and (
            organization_id is null
            or public.is_organization_member(organization_id)
        )
    );

-- Organization Members
drop policy if exists "Users can read members in own organization" on public.organization_members;
create policy "Users can read members in own organization" on public.organization_members
    for select using (
        public.is_organization_member(organization_id)
    );

drop policy if exists "Owners can manage members in own organization" on public.organization_members;
create policy "Owners can manage members in own organization" on public.organization_members
    for all using (
        public.is_organization_owner(organization_id)
    ) with check (
        public.is_organization_owner(organization_id)
    );

-- Compliance Requirements
drop policy if exists "Users can read/write requirements in own organization" on public.compliance_requirements;
create policy "Users can read/write requirements in own organization" on public.compliance_requirements
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Evidence Documents
drop policy if exists "Users can read/write documents in own organization" on public.evidence_documents;
drop policy if exists "Users can read documents in own organization" on public.evidence_documents;
create policy "Users can read documents in own organization" on public.evidence_documents
    for select using (
        public.is_organization_member(organization_id)
    );

drop policy if exists "Members can upload documents in own organization" on public.evidence_documents;
create policy "Members can upload documents in own organization" on public.evidence_documents
    for insert with check (
        public.can_write_organization(organization_id)
    );

drop policy if exists "Members can update active documents in own organization" on public.evidence_documents;
create policy "Members can update active documents in own organization" on public.evidence_documents
    for update using (
        public.can_write_organization(organization_id)
        and status <> 'deleted'
    ) with check (
        public.can_write_organization(organization_id)
        and status <> 'deleted'
    );

drop policy if exists "Owners can soft delete documents in own organization" on public.evidence_documents;
create policy "Owners can soft delete documents in own organization" on public.evidence_documents
    for update using (
        public.can_admin_organization(organization_id)
    ) with check (
        public.can_admin_organization(organization_id)
    );

-- Matrix Cells
drop policy if exists "Users can read/write matrix cells in own organization" on public.matrix_cells;
create policy "Users can read/write matrix cells in own organization" on public.matrix_cells
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Audit Packs
drop policy if exists "Users can read/write audit packs in own organization" on public.audit_packs;
create policy "Users can read/write audit packs in own organization" on public.audit_packs
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Audit Logs
drop policy if exists "Users can read logs in own organization" on public.audit_logs;
create policy "Users can read logs in own organization" on public.audit_logs
    for select using (
        organization_id = public.current_organization_id()
    );

drop policy if exists "Users can insert logs in own organization" on public.audit_logs;
create policy "Users can insert logs in own organization" on public.audit_logs
    for insert with check (
        organization_id = public.current_organization_id()
    );

-- Audit Trail Events
drop policy if exists "Owners/Admins can read organization audit trail" on public.audit_trail_events;
create policy "Owners/Admins can read organization audit trail" on public.audit_trail_events
    for select using (
        public.can_admin_organization(organization_id)
    );

drop policy if exists "Members can insert organization audit trail" on public.audit_trail_events;
create policy "Members can insert organization audit trail" on public.audit_trail_events
    for insert with check (
        public.is_organization_member(organization_id)
    );

drop policy if exists "Owners/Admins can update undo fields in audit trail" on public.audit_trail_events;
create policy "Owners/Admins can update undo fields in audit trail" on public.audit_trail_events
    for update using (
        public.can_admin_organization(organization_id)
    ) with check (
        public.can_admin_organization(organization_id)
    );

-- Workspace Notifications
drop policy if exists "Users can read own workspace notifications" on public.workspace_notifications;
create policy "Users can read own workspace notifications" on public.workspace_notifications
    for select using (
        public.is_organization_member(organisation_id)
        and (
            recipient_user_id = auth.uid()
            or recipient_role is null
            or public.has_organization_role(organisation_id, array[recipient_role])
            or public.can_admin_organization(organisation_id)
        )
    );

drop policy if exists "Members can insert workspace notifications" on public.workspace_notifications;
create policy "Members can insert workspace notifications" on public.workspace_notifications
    for insert with check (
        public.is_organization_member(organisation_id)
        and actor_user_id = auth.uid()
    );

drop policy if exists "Users can update own notification read state" on public.workspace_notifications;
create policy "Users can update own notification read state" on public.workspace_notifications
    for update using (
        public.is_organization_member(organisation_id)
        and (
            recipient_user_id = auth.uid()
            or recipient_role is null
            or public.has_organization_role(organisation_id, array[recipient_role])
            or public.can_admin_organization(organisation_id)
        )
    ) with check (
        public.is_organization_member(organisation_id)
        and (
            recipient_user_id = auth.uid()
            or recipient_role is null
            or public.has_organization_role(organisation_id, array[recipient_role])
            or public.can_admin_organization(organisation_id)
        )
    );

-- Requirements Framework
drop policy if exists "Users can read requirements framework in own organisation" on public.requirements;
create policy "Users can read requirements framework in own organisation" on public.requirements
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirements framework in own organisation" on public.requirements;
create policy "Members can write requirements framework in own organisation" on public.requirements
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

-- Managed Categories
drop policy if exists "Users can read requirement categories in own organisation" on public.requirement_categories;
create policy "Users can read requirement categories in own organisation" on public.requirement_categories
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirement categories in own organisation" on public.requirement_categories;
create policy "Members can write requirement categories in own organisation" on public.requirement_categories
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read evidence categories in own organisation" on public.evidence_categories;
create policy "Users can read evidence categories in own organisation" on public.evidence_categories
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write evidence categories in own organisation" on public.evidence_categories;
create policy "Members can write evidence categories in own organisation" on public.evidence_categories
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read requirement evidence types in own organisation" on public.requirement_evidence_types;
create policy "Users can read requirement evidence types in own organisation" on public.requirement_evidence_types
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirement evidence types in own organisation" on public.requirement_evidence_types;
create policy "Members can write requirement evidence types in own organisation" on public.requirement_evidence_types
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read requirement document links in own organisation" on public.requirement_documents;
create policy "Users can read requirement document links in own organisation" on public.requirement_documents
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirement document links in own organisation" on public.requirement_documents;
create policy "Members can write requirement document links in own organisation" on public.requirement_documents
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read evidence criteria in own organisation" on public.requirement_evidence_criteria;
create policy "Users can read evidence criteria in own organisation" on public.requirement_evidence_criteria
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write evidence criteria in own organisation" on public.requirement_evidence_criteria;
create policy "Members can write evidence criteria in own organisation" on public.requirement_evidence_criteria
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirements
            where requirements.id = requirement_evidence_criteria.requirement_id
              and requirements.organisation_id = requirement_evidence_criteria.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirements
            where requirements.id = requirement_evidence_criteria.requirement_id
              and requirements.organisation_id = requirement_evidence_criteria.organisation_id
        )
    );

drop policy if exists "Users can read criterion matches in own organisation" on public.requirement_evidence_criterion_matches;
create policy "Users can read criterion matches in own organisation" on public.requirement_evidence_criterion_matches
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write criterion matches in own organisation" on public.requirement_evidence_criterion_matches;
create policy "Members can write criterion matches in own organisation" on public.requirement_evidence_criterion_matches
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirement_evidence_criteria
            where requirement_evidence_criteria.id = requirement_evidence_criterion_matches.criterion_id
              and requirement_evidence_criteria.organisation_id = requirement_evidence_criterion_matches.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirement_evidence_criteria
            where requirement_evidence_criteria.id = requirement_evidence_criterion_matches.criterion_id
              and requirement_evidence_criteria.organisation_id = requirement_evidence_criterion_matches.organisation_id
        )
        and (document_id is null or exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = requirement_evidence_criterion_matches.document_id
              and evidence_documents.organization_id = requirement_evidence_criterion_matches.organisation_id
        ))
        and (competency_record_id is null or exists (
            select 1 from public.competency_records
            where competency_records.id = requirement_evidence_criterion_matches.competency_record_id
              and competency_records.organisation_id = requirement_evidence_criterion_matches.organisation_id
        ))
        and (action_id is null or exists (
            select 1 from public.actions
            where actions.id = requirement_evidence_criterion_matches.action_id
              and actions.organisation_id = requirement_evidence_criterion_matches.organisation_id
        ))
    );

drop policy if exists "Users can read reviews in own organisation" on public.reviews;
create policy "Users can read reviews in own organisation" on public.reviews
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write reviews in own organisation" on public.reviews;
create policy "Members can write reviews in own organisation" on public.reviews
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read actions in own organisation" on public.actions;
create policy "Users can read actions in own organisation" on public.actions
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write actions in own organisation" on public.actions;
create policy "Members can write actions in own organisation" on public.actions
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read requirement actions in own organisation" on public.requirement_actions;
create policy "Users can read requirement actions in own organisation" on public.requirement_actions
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirement actions in own organisation" on public.requirement_actions;
create policy "Members can write requirement actions in own organisation" on public.requirement_actions
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read action updates in own organisation" on public.action_updates;
create policy "Users can read action updates in own organisation" on public.action_updates
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write action updates in own organisation" on public.action_updates;
create policy "Members can write action updates in own organisation" on public.action_updates
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_updates.action_id
              and actions.organisation_id = action_updates.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_updates.action_id
              and actions.organisation_id = action_updates.organisation_id
        )
    );

drop policy if exists "Users can read action documents in own organisation" on public.action_documents;
create policy "Users can read action documents in own organisation" on public.action_documents
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write action documents in own organisation" on public.action_documents;
create policy "Members can write action documents in own organisation" on public.action_documents
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_documents.action_id
              and actions.organisation_id = action_documents.organisation_id
        )
        and exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = action_documents.document_id
              and evidence_documents.organization_id = action_documents.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_documents.action_id
              and actions.organisation_id = action_documents.organisation_id
        )
        and exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = action_documents.document_id
              and evidence_documents.organization_id = action_documents.organisation_id
        )
    );

drop policy if exists "Users can read action object links in own organisation" on public.action_object_links;
create policy "Users can read action object links in own organisation" on public.action_object_links
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write action object links in own organisation" on public.action_object_links;
create policy "Members can write action object links in own organisation" on public.action_object_links
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_object_links.action_id
              and actions.organisation_id = action_object_links.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.actions
            where actions.id = action_object_links.action_id
              and actions.organisation_id = action_object_links.organisation_id
        )
);

drop policy if exists "Users can read people in own organisation" on public.people;
create policy "Users can read people in own organisation" on public.people
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write people in own organisation" on public.people;
create policy "Members can write people in own organisation" on public.people
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read competency types in own organisation" on public.competency_types;
create policy "Users can read competency types in own organisation" on public.competency_types
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write competency types in own organisation" on public.competency_types;
create policy "Members can write competency types in own organisation" on public.competency_types
    for all using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

drop policy if exists "Users can read competency records in own organisation" on public.competency_records;
create policy "Users can read competency records in own organisation" on public.competency_records
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write competency records in own organisation" on public.competency_records;
create policy "Members can write competency records in own organisation" on public.competency_records
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.people
            where people.id = competency_records.person_id
              and people.organisation_id = competency_records.organisation_id
        )
        and exists (
            select 1 from public.competency_types
            where competency_types.id = competency_records.competency_type_id
              and competency_types.organisation_id = competency_records.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.people
            where people.id = competency_records.person_id
              and people.organisation_id = competency_records.organisation_id
        )
        and exists (
            select 1 from public.competency_types
            where competency_types.id = competency_records.competency_type_id
              and competency_types.organisation_id = competency_records.organisation_id
        )
    );

drop policy if exists "Users can read competency record documents in own organisation" on public.competency_record_documents;
create policy "Users can read competency record documents in own organisation" on public.competency_record_documents
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write competency record documents in own organisation" on public.competency_record_documents;
create policy "Members can write competency record documents in own organisation" on public.competency_record_documents
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.competency_records
            where competency_records.id = competency_record_documents.competency_record_id
              and competency_records.organisation_id = competency_record_documents.organisation_id
        )
        and exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = competency_record_documents.document_id
              and evidence_documents.organization_id = competency_record_documents.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.competency_records
            where competency_records.id = competency_record_documents.competency_record_id
              and competency_records.organisation_id = competency_record_documents.organisation_id
        )
        and exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = competency_record_documents.document_id
              and evidence_documents.organization_id = competency_record_documents.organisation_id
        )
    );

drop policy if exists "Users can read requirement competency types in own organisation" on public.requirement_competency_types;
create policy "Users can read requirement competency types in own organisation" on public.requirement_competency_types
    for select using (
        public.is_organization_member(organisation_id)
    );

drop policy if exists "Members can write requirement competency types in own organisation" on public.requirement_competency_types;
create policy "Members can write requirement competency types in own organisation" on public.requirement_competency_types
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirements
            where requirements.id = requirement_competency_types.requirement_id
              and requirements.organisation_id = requirement_competency_types.organisation_id
        )
        and exists (
            select 1 from public.competency_types
            where competency_types.id = requirement_competency_types.competency_type_id
              and competency_types.organisation_id = requirement_competency_types.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.requirements
            where requirements.id = requirement_competency_types.requirement_id
              and requirements.organisation_id = requirement_competency_types.organisation_id
        )
        and exists (
            select 1 from public.competency_types
            where competency_types.id = requirement_competency_types.competency_type_id
              and competency_types.organisation_id = requirement_competency_types.organisation_id
        )
    );

-- Backfill action record fields for existing rows after all RLS policies are in place.

update public.actions
set opened_at = coalesce(opened_at, created_at),
    opened_by = coalesce(opened_by, created_by),
    status_changed_at = coalesce(status_changed_at, updated_at, created_at),
    status_changed_by = coalesce(status_changed_by, created_by),
    target_due_date = coalesce(target_due_date, due_date)
where opened_at is null
   or opened_by is null
   or status_changed_at is null
   or status_changed_by is null
   or (target_due_date is null and due_date is not null);

update public.actions
set closed_at = coalesce(closed_at, completed_at),
    closed_by = coalesce(closed_by, completed_by)
where status = 'Complete'
  and (closed_at is null or closed_by is null);

update public.actions
set closed_at = coalesce(closed_at, cancelled_at),
    closed_by = coalesce(closed_by, cancelled_by)
where status = 'Cancelled'
  and (closed_at is null or closed_by is null);

-- Enforce immutability of audit log columns (except undo markers) via a trigger
create or replace function public.check_audit_trail_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (OLD.id <> NEW.id) or
       (OLD.organization_id <> NEW.organization_id) or
       (OLD.actor_user_id is distinct from NEW.actor_user_id) or
       (OLD.actor_name is distinct from NEW.actor_name) or
       (OLD.actor_email is distinct from NEW.actor_email) or
       (OLD.actor_role is distinct from NEW.actor_role) or
       (OLD.action_type <> NEW.action_type) or
       (OLD.action_category <> NEW.action_category) or
       (OLD.entity_type <> NEW.entity_type) or
       (OLD.entity_id is distinct from NEW.entity_id) or
       (OLD.entity_label is distinct from NEW.entity_label) or
       (OLD.description <> NEW.description) or
       (OLD.before_snapshot is distinct from NEW.before_snapshot) or
       (OLD.after_snapshot is distinct from NEW.after_snapshot) or
       (OLD.changed_fields is distinct from NEW.changed_fields) or
       (OLD.metadata is distinct from NEW.metadata) or
       (OLD.undo_action_type is distinct from NEW.undo_action_type) or
       (OLD.undo_expires_at is distinct from NEW.undo_expires_at) or
       (OLD.created_at <> NEW.created_at) or
       (OLD.severity <> NEW.severity) or
       (OLD.source <> NEW.source) then
        raise exception 'Immutable columns in audit trail events cannot be modified.';
    end if;
    return NEW;
end;
$$;

drop trigger if exists enforce_audit_trail_immutability on public.audit_trail_events;
create trigger enforce_audit_trail_immutability
before update on public.audit_trail_events
for each row
execute function public.check_audit_trail_update();

-- Saved Reports Policies
create policy "Members can read organization-shared or own reports" on public.saved_reports
    for select using (
        public.is_organization_member(organization_id)
        and (
            visibility = 'organisation'
            or owner_user_id = auth.uid()
        )
    );

create policy "Members can create own reports; owners can create shared reports" on public.saved_reports
    for insert with check (
        public.is_organization_member(organization_id)
        and owner_user_id = auth.uid()
        and (
            visibility = 'personal'
            or (visibility = 'organisation' and public.can_admin_organization(organization_id))
        )
    );

create policy "Owners or admins can update reports" on public.saved_reports
    for update using (
        public.is_organization_member(organization_id)
        and (
            owner_user_id = auth.uid()
            or public.can_admin_organization(organization_id)
        )
    ) with check (
        public.is_organization_member(organization_id)
        and (
            owner_user_id = auth.uid()
            or public.can_admin_organization(organization_id)
        )
        and (
            visibility = 'personal'
            or public.can_admin_organization(organization_id)
        )
    );

create policy "Owners or admins can delete reports" on public.saved_reports
    for delete using (
        public.is_organization_member(organization_id)
        and (
            owner_user_id = auth.uid()
            or public.can_admin_organization(organization_id)
        )
    );

-- 7. Asset Matrix assurance and maintenance system tables
create table if not exists public.asset_categories (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    parent_id uuid references public.asset_categories(id) on delete cascade,
    name text not null,
    description text,
    sort_order integer default 0 not null,
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    archived_at timestamp with time zone
);

create table if not exists public.assets (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    category_id uuid references public.asset_categories(id) on delete set null,
    asset_number text,
    name text not null,
    asset_type text not null,
    category text,
    registration_number text,
    serial_number text,
    make text,
    model text,
    location text,
    department text,
    owner text,
    status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    archived_at timestamp with time zone
);

create table if not exists public.asset_check_types (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    title text not null,
    category text,
    description text,
    default_frequency_value integer,
    default_frequency_unit text check (default_frequency_unit in ('days', 'weeks', 'months', 'years')),
    default_warning_days integer,
    evidence_required boolean default true not null,
    risk_level text check (risk_level in ('Low', 'Medium', 'High', 'Critical')),
    default_status text not null default 'Missing',
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.asset_check_assignments (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    asset_check_type_id uuid not null references public.asset_check_types(id) on delete cascade,
    required boolean default true not null,
    frequency_value integer,
    frequency_unit text check (frequency_unit in ('days', 'weeks', 'months', 'years')),
    warning_days integer,
    first_due_date date,
    next_due_date date,
    last_completed_date date,
    last_expiry_date date,
    status text not null default 'Missing',
    notes text,
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(asset_id, asset_check_type_id)
);

create table if not exists public.asset_check_records (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    asset_check_assignment_id uuid references public.asset_check_assignments(id) on delete set null,
    asset_check_type_id uuid not null references public.asset_check_types(id) on delete cascade,
    completed_at date not null,
    valid_from date,
    valid_until date,
    result_status text,
    performed_by text,
    reference text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.asset_check_evidence_links (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    asset_check_assignment_id uuid references public.asset_check_assignments(id) on delete cascade,
    asset_check_record_id uuid references public.asset_check_records(id) on delete cascade,
    document_id uuid not null references public.evidence_documents(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.asset_requirement_links (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_check_type_id uuid not null references public.asset_check_types(id) on delete cascade,
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.asset_categories enable row level security;
alter table public.assets enable row level security;
alter table public.asset_check_types enable row level security;
alter table public.asset_check_assignments enable row level security;
alter table public.asset_check_records enable row level security;
alter table public.asset_check_evidence_links enable row level security;
alter table public.asset_requirement_links enable row level security;

revoke all on table public.asset_categories from anon;
revoke all on table public.assets from anon;
revoke all on table public.asset_check_types from anon;
revoke all on table public.asset_check_assignments from anon;
revoke all on table public.asset_check_records from anon;
revoke all on table public.asset_check_evidence_links from anon;
revoke all on table public.asset_requirement_links from anon;

grant select, insert, update, delete on table public.asset_categories to authenticated;
grant select, insert, update, delete on table public.assets to authenticated;
grant select, insert, update, delete on table public.asset_check_types to authenticated;
grant select, insert, update, delete on table public.asset_check_assignments to authenticated;
grant select, insert, update, delete on table public.asset_check_records to authenticated;
grant select, insert, update, delete on table public.asset_check_evidence_links to authenticated;
grant select, insert, update, delete on table public.asset_requirement_links to authenticated;

drop policy if exists "Users can read asset categories in own organisation" on public.asset_categories;
drop policy if exists "Members can write asset categories in own organisation" on public.asset_categories;
drop policy if exists "Users can read assets in own organisation" on public.assets;
drop policy if exists "Members can write assets in own organisation" on public.assets;
drop policy if exists "Users can read asset check types in own organisation" on public.asset_check_types;
drop policy if exists "Members can write asset check types in own organisation" on public.asset_check_types;
drop policy if exists "Users can read assignments in own organisation" on public.asset_check_assignments;
drop policy if exists "Members can write assignments in own organisation" on public.asset_check_assignments;
drop policy if exists "Users can read check records in own organisation" on public.asset_check_records;
drop policy if exists "Members can write check records in own organisation" on public.asset_check_records;
drop policy if exists "Users can read evidence links in own organisation" on public.asset_check_evidence_links;
drop policy if exists "Members can write evidence links in own organisation" on public.asset_check_evidence_links;
drop policy if exists "Users can read requirement links in own organisation" on public.asset_requirement_links;
drop policy if exists "Members can write requirement links in own organisation" on public.asset_requirement_links;
drop policy if exists "Asset assignment relationships stay in one organisation" on public.asset_check_assignments;
drop policy if exists "Asset record relationships stay in one organisation" on public.asset_check_records;
drop policy if exists "Asset evidence relationships stay in one organisation" on public.asset_check_evidence_links;
drop policy if exists "Asset requirement relationships stay in one organisation" on public.asset_requirement_links;

create policy "Users can read asset categories in own organisation" on public.asset_categories
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write asset categories in own organisation" on public.asset_categories
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read assets in own organisation" on public.assets
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write assets in own organisation" on public.assets
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read asset check types in own organisation" on public.asset_check_types
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write asset check types in own organisation" on public.asset_check_types
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read assignments in own organisation" on public.asset_check_assignments
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write assignments in own organisation" on public.asset_check_assignments
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read check records in own organisation" on public.asset_check_records
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write check records in own organisation" on public.asset_check_records
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read evidence links in own organisation" on public.asset_check_evidence_links
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write evidence links in own organisation" on public.asset_check_evidence_links
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Users can read requirement links in own organisation" on public.asset_requirement_links
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write requirement links in own organisation" on public.asset_requirement_links
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create policy "Asset assignment relationships stay in one organisation"
on public.asset_check_assignments
as restrictive
for all
using (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_assignments.organisation_id
    )
    and exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_check_assignments.organisation_id
    )
)
with check (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_assignments.organisation_id
    )
    and exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_check_assignments.organisation_id
    )
);

create policy "Asset record relationships stay in one organisation"
on public.asset_check_records
as restrictive
for all
using (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_records.organisation_id
    )
    and exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_check_records.organisation_id
    )
)
with check (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_records.organisation_id
    )
    and exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_check_records.organisation_id
    )
    and (
        asset_check_assignment_id is null
        or exists (
            select 1 from public.asset_check_assignments
            where asset_check_assignments.id = asset_check_assignment_id
              and asset_check_assignments.organisation_id = asset_check_records.organisation_id
        )
    )
);

create policy "Asset evidence relationships stay in one organisation"
on public.asset_check_evidence_links
as restrictive
for all
using (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_evidence_links.organisation_id
    )
    and exists (
        select 1 from public.evidence_documents
        where evidence_documents.id = document_id
          and evidence_documents.organization_id = asset_check_evidence_links.organisation_id
    )
)
with check (
    exists (
        select 1 from public.assets
        where assets.id = asset_id
          and assets.organisation_id = asset_check_evidence_links.organisation_id
    )
    and exists (
        select 1 from public.evidence_documents
        where evidence_documents.id = document_id
          and evidence_documents.organization_id = asset_check_evidence_links.organisation_id
    )
    and (
        asset_check_assignment_id is null
        or exists (
            select 1 from public.asset_check_assignments
            where asset_check_assignments.id = asset_check_assignment_id
              and asset_check_assignments.organisation_id = asset_check_evidence_links.organisation_id
        )
    )
    and (
        asset_check_record_id is null
        or exists (
            select 1 from public.asset_check_records
            where asset_check_records.id = asset_check_record_id
              and asset_check_records.organisation_id = asset_check_evidence_links.organisation_id
        )
    )
);

create policy "Asset requirement relationships stay in one organisation"
on public.asset_requirement_links
as restrictive
for all
using (
    exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_requirement_links.organisation_id
    )
    and exists (
        select 1 from public.requirements
        where requirements.id = requirement_id
          and requirements.organisation_id = asset_requirement_links.organisation_id
    )
)
with check (
    exists (
        select 1 from public.asset_check_types
        where asset_check_types.id = asset_check_type_id
          and asset_check_types.organisation_id = asset_requirement_links.organisation_id
    )
    and exists (
        select 1 from public.requirements
        where requirements.id = requirement_id
          and requirements.organisation_id = asset_requirement_links.organisation_id
    )
);

create or replace function public.set_asset_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists set_assets_updated_at on public.assets;
create trigger set_assets_updated_at
before update on public.assets
for each row execute function public.set_asset_updated_at();

drop trigger if exists set_asset_check_types_updated_at on public.asset_check_types;
create trigger set_asset_check_types_updated_at
before update on public.asset_check_types
for each row execute function public.set_asset_updated_at();

drop trigger if exists set_asset_check_assignments_updated_at on public.asset_check_assignments;
create trigger set_asset_check_assignments_updated_at
before update on public.asset_check_assignments
for each row execute function public.set_asset_updated_at();

drop trigger if exists set_asset_categories_updated_at on public.asset_categories;
create trigger set_asset_categories_updated_at
before update on public.asset_categories
for each row execute function public.set_asset_updated_at();

drop trigger if exists set_asset_check_records_updated_at on public.asset_check_records;
create trigger set_asset_check_records_updated_at
before update on public.asset_check_records
for each row execute function public.set_asset_updated_at();

create index if not exists assets_org_idx on public.assets (organisation_id, status);
before update on public.asset_check_records
for each row execute function public.set_asset_updated_at();

create index if not exists assets_org_idx on public.assets (organisation_id, status);
create index if not exists asset_check_types_org_idx on public.asset_check_types (organisation_id, active);
create index if not exists asset_check_assignments_org_idx on public.asset_check_assignments (organisation_id, active);
create index if not exists asset_check_assignments_asset_idx on public.asset_check_assignments (asset_id, asset_check_type_id);
create index if not exists asset_check_records_org_idx on public.asset_check_records (organisation_id);
create index if not exists asset_check_records_assignment_idx on public.asset_check_records (asset_check_assignment_id);
create index if not exists asset_check_evidence_links_org_idx on public.asset_check_evidence_links (organisation_id);
create index if not exists asset_check_evidence_links_doc_idx on public.asset_check_evidence_links (document_id);
create index if not exists asset_requirement_links_org_idx on public.asset_requirement_links (organisation_id);
create index if not exists asset_categories_org_idx on public.asset_categories (organisation_id);
create index if not exists asset_categories_parent_idx on public.asset_categories (parent_id);
create index if not exists assets_category_idx on public.assets (category_id);

-- 8. Asset Matrix history and repairs log tables
create table if not exists public.asset_history_events (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    asset_check_assignment_id uuid references public.asset_check_assignments(id) on delete cascade,
    asset_check_record_id uuid references public.asset_check_records(id) on delete cascade,
    event_type text not null check (event_type in ('service', 'repair', 'defect', 'inspection', 'calibration', 'part_replacement', 'incident', 'maintenance', 'document_added', 'check_completed', 'general')),
    event_date date not null,
    title text not null,
    description text,
    status text not null default 'Completed',
    cost numeric(10,2) default 0.00,
    performed_by text,
    supplier text,
    odometer_or_hours integer,
    evidence_document_id uuid references public.evidence_documents(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    archived_at timestamp with time zone
);

alter table public.asset_history_events enable row level security;

revoke all on table public.asset_history_events from anon;

grant select, insert, update, delete on table public.asset_history_events to authenticated;

drop policy if exists "Users can read asset history in own organisation" on public.asset_history_events;
create policy "Users can read asset history in own organisation" on public.asset_history_events
    for select using (public.is_organization_member(organisation_id));

drop policy if exists "Members can write asset history in own organisation" on public.asset_history_events;
create policy "Members can write asset history in own organisation" on public.asset_history_events
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

drop trigger if exists set_asset_history_events_updated_at on public.asset_history_events;
create trigger set_asset_history_events_updated_at
before update on public.asset_history_events
for each row execute function public.set_asset_updated_at();

create index if not exists asset_history_events_org_idx on public.asset_history_events (organisation_id);
create index if not exists asset_history_events_asset_idx on public.asset_history_events (asset_id);
create index if not exists asset_history_events_doc_idx on public.asset_history_events (evidence_document_id);
