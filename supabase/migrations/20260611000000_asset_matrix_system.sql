-- Migration: Asset Matrix assurance and maintenance system tables.
-- This migration is idempotent and can be safely re-run in Supabase SQL Editor.
-- Target Tables: public.assets, public.asset_check_types, public.asset_check_assignments, public.asset_check_records, public.asset_check_evidence_links, public.asset_requirement_links

-- 1. Core company asset register
create table if not exists public.assets (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_number text,
    name text not null,
    asset_type text not null, -- e.g., 'Vehicle', 'Trailer', 'Equipment', 'Material', 'Object', 'Facility'
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

-- 2. Custom check / maintenance type definitions
create table if not exists public.asset_check_types (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    title text not null,
    category text, -- e.g. 'Safety', 'Inspection', 'Calibration', 'Tax', 'Insurance', 'Service'
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

-- 3. Assign check types to assets with asset-specific settings
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
    status text not null default 'Missing', -- 'valid', 'due_soon', 'overdue', 'expired', 'missing', 'not_required'
    notes text,
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(asset_id, asset_check_type_id)
);

-- 4. Completion / history / evidence records for assigned checks
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

-- 5. Links between Evidence Vault documents and asset check records or assignments
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

-- 6. Optional requirement link table
create table if not exists public.asset_requirement_links (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    asset_check_type_id uuid not null references public.asset_check_types(id) on delete cascade,
    requirement_id uuid not null references public.requirements(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.assets enable row level security;
alter table public.asset_check_types enable row level security;
alter table public.asset_check_assignments enable row level security;
alter table public.asset_check_records enable row level security;
alter table public.asset_check_evidence_links enable row level security;
alter table public.asset_requirement_links enable row level security;

-- Revoke all permissions from anonymous users
revoke all on table public.assets from anon;
revoke all on table public.asset_check_types from anon;
revoke all on table public.asset_check_assignments from anon;
revoke all on table public.asset_check_records from anon;
revoke all on table public.asset_check_evidence_links from anon;
revoke all on table public.asset_requirement_links from anon;

-- Grant select, insert, update, delete to authenticated users
grant select, insert, update, delete on table public.assets to authenticated;
grant select, insert, update, delete on table public.asset_check_types to authenticated;
grant select, insert, update, delete on table public.asset_check_assignments to authenticated;
grant select, insert, update, delete on table public.asset_check_records to authenticated;
grant select, insert, update, delete on table public.asset_check_evidence_links to authenticated;
grant select, insert, update, delete on table public.asset_requirement_links to authenticated;

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

-- RLS Policies: Assets
create policy "Users can read assets in own organisation" on public.assets
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write assets in own organisation" on public.assets
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

-- RLS Policies: Asset Check Types
create policy "Users can read asset check types in own organisation" on public.asset_check_types
    for select using (public.is_organization_member(organisation_id));
create policy "Members can write asset check types in own organisation" on public.asset_check_types
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

-- RLS Policies: Asset Check Assignments
create policy "Users can read assignments in own organisation" on public.asset_check_assignments
    for select using (
        public.is_organization_member(organisation_id)
        and exists (
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
create policy "Members can write assignments in own organisation" on public.asset_check_assignments
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
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
        public.can_write_organization(organisation_id)
        and exists (
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

-- RLS Policies: Asset Check Records
create policy "Users can read check records in own organisation" on public.asset_check_records
    for select using (
        public.is_organization_member(organisation_id)
        and exists (
            select 1 from public.assets
            where assets.id = asset_id
              and assets.organisation_id = asset_check_records.organisation_id
        )
        and exists (
            select 1 from public.asset_check_types
            where asset_check_types.id = asset_check_type_id
              and asset_check_types.organisation_id = asset_check_records.organisation_id
        )
    );
create policy "Members can write check records in own organisation" on public.asset_check_records
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
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
    )
    with check (
        public.can_write_organization(organisation_id)
        and exists (
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

-- RLS Policies: Asset Check Evidence Links
create policy "Users can read evidence links in own organisation" on public.asset_check_evidence_links
    for select using (
        public.is_organization_member(organisation_id)
        and exists (
            select 1 from public.assets
            where assets.id = asset_id
              and assets.organisation_id = asset_check_evidence_links.organisation_id
        )
        and exists (
            select 1 from public.evidence_documents
            where evidence_documents.id = document_id
              and evidence_documents.organization_id = asset_check_evidence_links.organisation_id
        )
    );
create policy "Members can write evidence links in own organisation" on public.asset_check_evidence_links
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
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
        public.can_write_organization(organisation_id)
        and exists (
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

-- RLS Policies: Asset Requirement Links
create policy "Users can read requirement links in own organisation" on public.asset_requirement_links
    for select using (
        public.is_organization_member(organisation_id)
        and exists (
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
create policy "Members can write requirement links in own organisation" on public.asset_requirement_links
    for all using (
        public.can_write_organization(organisation_id)
        and exists (
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
        public.can_write_organization(organisation_id)
        and exists (
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

-- Triggers for updated_at timestamps
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

-- Triggers
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

drop trigger if exists set_asset_check_records_updated_at on public.asset_check_records;
create trigger set_asset_check_records_updated_at
before update on public.asset_check_records
for each row execute function public.set_asset_updated_at();

-- Indexes for performance query optimization
create index if not exists assets_org_idx on public.assets (organisation_id, status);
create index if not exists asset_check_types_org_idx on public.asset_check_types (organisation_id, active);
create index if not exists asset_check_assignments_org_idx on public.asset_check_assignments (organisation_id, active);
create index if not exists asset_check_assignments_asset_idx on public.asset_check_assignments (asset_id, asset_check_type_id);
create index if not exists asset_check_records_org_idx on public.asset_check_records (organisation_id);
create index if not exists asset_check_records_assignment_idx on public.asset_check_records (asset_check_assignment_id);
create index if not exists asset_check_evidence_links_org_idx on public.asset_check_evidence_links (organisation_id);
create index if not exists asset_check_evidence_links_doc_idx on public.asset_check_evidence_links (document_id);
create index if not exists asset_requirement_links_org_idx on public.asset_requirement_links (organisation_id);
