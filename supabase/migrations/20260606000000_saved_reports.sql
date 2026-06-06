-- Migration: Add saved_reports table for personal and organisation-shared reports
-- Target Table: public.saved_reports

create table if not exists public.saved_reports (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    owner_user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    description text,
    report_type text not null, -- e.g., 'custom', 'pivot', 'prebuilt'
    data_source text not null, -- e.g., 'Requirements', 'Evidence', 'Competencies', etc.
    configuration jsonb not null,
    visibility text not null check (visibility in ('personal', 'organisation')),
    is_favourite boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.saved_reports enable row level security;

-- SELECT Policy: permitted organization members can read organization-shared reports, or their own personal reports
drop policy if exists "Members can read organization-shared or own reports" on public.saved_reports;
create policy "Members can read organization-shared or own reports" on public.saved_reports
    for select using (
        public.is_organization_member(organization_id)
        and (
            visibility = 'organisation'
            or owner_user_id = auth.uid()
        )
    );

-- INSERT Policy: permitted organization members can create own reports; only Owner/Admin can create organisation-shared reports
drop policy if exists "Members can create own reports; owners can create shared reports" on public.saved_reports;
create policy "Members can create own reports; owners can create shared reports" on public.saved_reports
    for insert with check (
        public.is_organization_member(organization_id)
        and owner_user_id = auth.uid()
        and (
            visibility = 'personal'
            or (visibility = 'organisation' and public.can_admin_organization(organization_id))
        )
    );

-- UPDATE Policy: report owner or Owner/Admin can update; non-admins cannot change a report to organisation visibility
drop policy if exists "Owners or admins can update reports" on public.saved_reports;
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

-- DELETE Policy: report owner or Owner/Admin can delete
drop policy if exists "Owners or admins can delete reports" on public.saved_reports;
create policy "Owners or admins can delete reports" on public.saved_reports
    for delete using (
        public.is_organization_member(organization_id)
        and (
            owner_user_id = auth.uid()
            or public.can_admin_organization(organization_id)
        )
    );

-- Indexes for performance query optimization
create index if not exists saved_reports_org_owner_idx 
    on public.saved_reports (organization_id, owner_user_id);

create index if not exists saved_reports_org_visibility_idx 
    on public.saved_reports (organization_id, visibility);
