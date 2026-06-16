-- Migration draft: Bulk Import Centre staging model.
-- This migration is idempotent and can be safely re-run in Supabase SQL Editor.
-- Do not apply to hosted Supabase until the Bulk Import Centre has been reviewed.
-- Target tables: public.import_batches, public.import_rows, public.external_references

create table if not exists public.import_batches (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    import_type text not null check (
        import_type in (
            'requirements',
            'people',
            'assets',
            'competency_types',
            'person_competency_records',
            'asset_check_types',
            'asset_check_assignments',
            'evidence_metadata',
            'evidence_requirement_links',
            'evidence_person_links',
            'evidence_asset_links',
            'evidence_competency_links',
            'actions'
        )
    ),
    source_system text,
    uploaded_file_name text,
    uploaded_by uuid references public.profiles(id) on delete set null,
    committed_by uuid references public.profiles(id) on delete set null,
    reverted_by uuid references public.profiles(id) on delete set null,
    status text not null default 'draft' check (status in ('draft', 'validated', 'committed', 'reverted', 'failed')),
    total_rows integer not null default 0,
    create_count integer not null default 0,
    update_count integer not null default 0,
    skip_count integer not null default 0,
    error_count integer not null default 0,
    warning_count integer not null default 0,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    validated_at timestamp with time zone,
    committed_at timestamp with time zone,
    reverted_at timestamp with time zone
);

create table if not exists public.import_rows (
    id uuid primary key default uuid_generate_v4(),
    batch_id uuid not null references public.import_batches(id) on delete cascade,
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    row_number integer not null,
    external_id text,
    row_status text not null default 'pending' check (row_status in ('pending', 'valid', 'warning', 'error', 'committed', 'skipped', 'reverted')),
    proposed_action text not null default 'create' check (proposed_action in ('create', 'update', 'skip', 'error')),
    target_entity_type text,
    target_entity_id uuid,
    source_row jsonb not null default '{}'::jsonb,
    mapped_data jsonb not null default '{}'::jsonb,
    validation_errors jsonb not null default '[]'::jsonb,
    validation_warnings jsonb not null default '[]'::jsonb,
    before_snapshot jsonb,
    after_snapshot jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (batch_id, row_number)
);

create table if not exists public.external_references (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    source_system text not null,
    external_id text not null,
    entity_type text not null,
    entity_id uuid not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (organisation_id, source_system, external_id, entity_type)
);

create or replace function public.set_external_reference_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists set_external_references_updated_at on public.external_references;
create trigger set_external_references_updated_at
before update on public.external_references
for each row
execute function public.set_external_reference_updated_at();

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.external_references enable row level security;

revoke all on table public.import_batches from anon;
revoke all on table public.import_rows from anon;
revoke all on table public.external_references from anon;

grant select, insert, update, delete on table public.import_batches to authenticated;
grant select, insert, update, delete on table public.import_rows to authenticated;
grant select, insert, update, delete on table public.external_references to authenticated;

drop policy if exists "Users can read import batches in own organisation" on public.import_batches;
drop policy if exists "Writers can create import batches in own organisation" on public.import_batches;
drop policy if exists "Writers can update draft import batches in own organisation" on public.import_batches;
drop policy if exists "Admins can delete import batches in own organisation" on public.import_batches;
drop policy if exists "Users can read import rows in own organisation" on public.import_rows;
drop policy if exists "Writers can create import rows in own organisation" on public.import_rows;
drop policy if exists "Writers can update draft import rows in own organisation" on public.import_rows;
drop policy if exists "Admins can delete import rows in own organisation" on public.import_rows;
drop policy if exists "Users can read external refs in own organisation" on public.external_references;
drop policy if exists "Writers can manage external refs in own organisation" on public.external_references;

create policy "Users can read import batches in own organisation" on public.import_batches
    for select using (public.is_organization_member(organisation_id));

create policy "Writers can create import batches in own organisation" on public.import_batches
    for insert with check (
        public.can_write_organization(organisation_id)
        and uploaded_by = auth.uid()
    );

create policy "Writers can update draft import batches in own organisation" on public.import_batches
    for update using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
    );

create policy "Admins can delete import batches in own organisation" on public.import_batches
    for delete using (public.can_admin_organization(organisation_id));

create policy "Users can read import rows in own organisation" on public.import_rows
    for select using (
        public.is_organization_member(organisation_id)
        and exists (
            select 1 from public.import_batches
            where import_batches.id = batch_id
              and import_batches.organisation_id = import_rows.organisation_id
        )
    );

create policy "Writers can create import rows in own organisation" on public.import_rows
    for insert with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.import_batches
            where import_batches.id = batch_id
              and import_batches.organisation_id = import_rows.organisation_id
        )
    );

create policy "Writers can update draft import rows in own organisation" on public.import_rows
    for update using (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.import_batches
            where import_batches.id = batch_id
              and import_batches.organisation_id = import_rows.organisation_id
        )
    ) with check (
        public.can_write_organization(organisation_id)
        and exists (
            select 1 from public.import_batches
            where import_batches.id = batch_id
              and import_batches.organisation_id = import_rows.organisation_id
        )
    );

create policy "Admins can delete import rows in own organisation" on public.import_rows
    for delete using (public.can_admin_organization(organisation_id));

create policy "Users can read external refs in own organisation" on public.external_references
    for select using (public.is_organization_member(organisation_id));

create policy "Writers can manage external refs in own organisation" on public.external_references
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

create index if not exists import_batches_org_status_idx on public.import_batches (organisation_id, status, created_at desc);
create index if not exists import_batches_org_type_idx on public.import_batches (organisation_id, import_type, created_at desc);
create index if not exists import_rows_batch_status_idx on public.import_rows (batch_id, row_status, proposed_action);
create index if not exists import_rows_org_external_idx on public.import_rows (organisation_id, external_id);
create index if not exists external_references_lookup_idx on public.external_references (organisation_id, source_system, external_id, entity_type);
create index if not exists external_references_entity_idx on public.external_references (organisation_id, entity_type, entity_id);
