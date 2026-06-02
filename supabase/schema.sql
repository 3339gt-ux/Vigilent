-- Vigilen Database Schema (PostgreSQL for Supabase)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    compliance_profile text not null default 'Standard', -- e.g., 'Transport Operator', 'Cold Storage Logistics', 'General Warehousing'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Profiles (Users)
create table if not exists public.profiles (
    id uuid primary key, -- References auth.users.id
    organization_id uuid references public.organizations(id) on delete set null,
    full_name text,
    role text not null default 'Viewer', -- 'Admin', 'Editor', 'Auditor', 'Viewer'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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
    status text not null default 'Draft', -- 'Draft', 'Active', 'Archived'
    share_token text unique,
    share_expires_at timestamp with time zone,
    pin_code text, -- Mock security PIN
    documents jsonb default '[]'::jsonb, -- Array of document IDs in the pack
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Audit Activity Logs
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete set null,
    action text not null, -- e.g., 'Upload Document', 'Create Audit Pack', 'Update Expiry'
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.evidence_documents enable row level security;
alter table public.matrix_cells enable row level security;
alter table public.audit_packs enable row level security;
alter table public.audit_logs enable row level security;

-- Row Level Security (RLS) Policies
-- auth.uid() links to profiles.id. The helper avoids recursive profile policy checks.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select organization_id from public.profiles where id = auth.uid()
$$;

drop policy if exists "Users can read own organization" on public.organizations;
drop policy if exists "Users can update own organization" on public.organizations;
drop policy if exists "Users can read/write profiles in own organization" on public.profiles;
drop policy if exists "Users can read/write requirements in own organization" on public.compliance_requirements;
drop policy if exists "Users can read/write documents in own organization" on public.evidence_documents;
drop policy if exists "Users can read/write matrix cells in own organization" on public.matrix_cells;
drop policy if exists "Users can read/write audit packs in own organization" on public.audit_packs;
drop policy if exists "Users can read logs in own organization" on public.audit_logs;
drop policy if exists "Users can insert logs in own organization" on public.audit_logs;

-- Organizations
create policy "Users can read own organization" on public.organizations
    for select using (
        id = public.current_organization_id()
    );

create policy "Users can update own organization" on public.organizations
    for update using (
        id = public.current_organization_id()
    ) with check (
        id = public.current_organization_id()
    );

-- Profiles
create policy "Users can read/write profiles in own organization" on public.profiles
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Compliance Requirements
create policy "Users can read/write requirements in own organization" on public.compliance_requirements
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Evidence Documents
create policy "Users can read/write documents in own organization" on public.evidence_documents
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Matrix Cells
create policy "Users can read/write matrix cells in own organization" on public.matrix_cells
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Audit Packs
create policy "Users can read/write audit packs in own organization" on public.audit_packs
    for all using (
        organization_id = public.current_organization_id()
    ) with check (
        organization_id = public.current_organization_id()
    );

-- Audit Logs
create policy "Users can read logs in own organization" on public.audit_logs
    for select using (
        organization_id = public.current_organization_id()
    );

create policy "Users can insert logs in own organization" on public.audit_logs
    for insert with check (
        organization_id = public.current_organization_id()
    );
