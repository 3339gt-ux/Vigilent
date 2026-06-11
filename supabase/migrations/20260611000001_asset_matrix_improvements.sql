-- Migration: Add asset history / repairs log tables
-- This migration is idempotent and can be safely re-run in Supabase SQL Editor.

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

-- Enable Row Level Security (RLS)
alter table public.asset_history_events enable row level security;

-- Revoke all permissions from anonymous users
revoke all on table public.asset_history_events from anon;

-- Grant select, insert, update, delete to authenticated users
grant select, insert, update, delete on table public.asset_history_events to authenticated;

-- RLS policies
drop policy if exists "Users can read asset history in own organisation" on public.asset_history_events;
create policy "Users can read asset history in own organisation" on public.asset_history_events
    for select using (public.is_organization_member(organisation_id));

drop policy if exists "Members can write asset history in own organisation" on public.asset_history_events;
create policy "Members can write asset history in own organisation" on public.asset_history_events
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

-- Trigger for updated_at
drop trigger if exists set_asset_history_events_updated_at on public.asset_history_events;
create trigger set_asset_history_events_updated_at
before update on public.asset_history_events
for each row execute function public.set_asset_updated_at();

-- Indexes for performance query optimization
create index if not exists asset_history_events_org_idx on public.asset_history_events (organisation_id);
create index if not exists asset_history_events_asset_idx on public.asset_history_events (asset_id);
create index if not exists asset_history_events_doc_idx on public.asset_history_events (evidence_document_id);
