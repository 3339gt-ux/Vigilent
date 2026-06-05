-- Migration: Add audit_trail_events table for rich audit logs and undo recovery
-- Target Table: public.audit_trail_events

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

-- Enable Row Level Security (RLS)
alter table public.audit_trail_events enable row level security;

-- SELECT: Only accessible by Owner/Admin roles of the same organization
drop policy if exists "Owners/Admins can read organization audit trail" on public.audit_trail_events;
create policy "Owners/Admins can read organization audit trail" on public.audit_trail_events
    for select using (
        public.can_admin_organization(organization_id)
    );

-- INSERT: Allowed for any authenticated member of the organization (since user actions trigger logs)
drop policy if exists "Members can insert organization audit trail" on public.audit_trail_events;
create policy "Members can insert organization audit trail" on public.audit_trail_events
    for insert with check (
        public.is_organization_member(organization_id)
    );

-- UPDATE: Only Owner/Admin can update log markers (undone_at, undone_by, undo_available)
drop policy if exists "Owners/Admins can update undo fields in audit trail" on public.audit_trail_events;
create policy "Owners/Admins can update undo fields in audit trail" on public.audit_trail_events
    for update using (
        public.can_admin_organization(organization_id)
    ) with check (
        public.can_admin_organization(organization_id)
    );

-- DELETE: Prohibited (no policy created)

-- Indexes for performance
create index if not exists audit_trail_events_org_created_idx 
    on public.audit_trail_events (organization_id, created_at desc);

create index if not exists audit_trail_events_org_category_idx 
    on public.audit_trail_events (organization_id, action_category);

create index if not exists audit_trail_events_org_entity_idx 
    on public.audit_trail_events (organization_id, entity_type);

create index if not exists audit_trail_events_org_actor_idx 
    on public.audit_trail_events (organization_id, actor_user_id);

create index if not exists audit_trail_events_org_action_idx 
    on public.audit_trail_events (organization_id, action_type);

create index if not exists audit_trail_events_undo_idx 
    on public.audit_trail_events (undo_available) 
    where undo_available = true;

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
