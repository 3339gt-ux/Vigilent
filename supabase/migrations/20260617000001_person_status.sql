-- Optional draft migration for richer person operational statuses.
-- Safe to run after review; do not apply remotely without hosted Supabase/RLS verification.

alter table public.people
    add column if not exists person_status text not null default 'Active';

update public.people
set person_status = case
    when active = false and (person_status is null or person_status = 'Active') then 'Inactive'
    when active = true and (person_status is null or person_status = 'Inactive') then 'Active'
    else person_status
end;

alter table public.people
    drop constraint if exists people_person_status_check;

alter table public.people
    add constraint people_person_status_check
    check (person_status in ('Active', 'On Leave', 'Temporarily Inactive', 'Suspended', 'Inactive', 'Archived / Left Business'));

create index if not exists people_organisation_person_status_idx
    on public.people (organisation_id, person_status);
