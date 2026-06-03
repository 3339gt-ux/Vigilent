-- Vigilen Database Schema (PostgreSQL for Supabase)
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
alter table public.evidence_documents add column if not exists tags text[] not null default '{}'::text[];
alter table public.evidence_documents add column if not exists review_date date;
alter table public.evidence_documents add column if not exists training_date date;
alter table public.evidence_documents add column if not exists calibration_date date;

create unique index if not exists evidence_documents_storage_path_idx
    on public.evidence_documents (storage_path)
    where storage_path is not null;

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
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.requirement_actions (
    id uuid primary key default uuid_generate_v4(),
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    action_id uuid not null references public.actions(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (requirement_id, action_id)
);

create index if not exists requirements_organisation_status_idx on public.requirements (organisation_id, status);
create index if not exists requirement_documents_organisation_idx on public.requirement_documents (organisation_id, requirement_id, document_id);
create index if not exists reviews_organisation_requirement_idx on public.reviews (organisation_id, requirement_id, review_date desc);
create index if not exists actions_organisation_status_idx on public.actions (organisation_id, status, due_date);

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

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.evidence_documents enable row level security;
alter table public.matrix_cells enable row level security;
alter table public.audit_packs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_evidence_types enable row level security;
alter table public.requirement_documents enable row level security;
alter table public.reviews enable row level security;
alter table public.actions enable row level security;
alter table public.requirement_actions enable row level security;

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
drop policy if exists "Users can read requirement evidence types in own organisation" on public.requirement_evidence_types;
drop policy if exists "Members can write requirement evidence types in own organisation" on public.requirement_evidence_types;
drop policy if exists "Users can read requirement document links in own organisation" on public.requirement_documents;
drop policy if exists "Members can write requirement document links in own organisation" on public.requirement_documents;
drop policy if exists "Users can read reviews in own organisation" on public.reviews;
drop policy if exists "Members can write reviews in own organisation" on public.reviews;
drop policy if exists "Users can read actions in own organisation" on public.actions;
drop policy if exists "Members can write actions in own organisation" on public.actions;
drop policy if exists "Users can read requirement actions in own organisation" on public.requirement_actions;
drop policy if exists "Members can write requirement actions in own organisation" on public.requirement_actions;

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
