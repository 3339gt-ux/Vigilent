-- Draft migration for competency personas / templates foundation.
-- Do not apply remotely until hosted Supabase staging verification, RLS review,
-- and product sign-off are complete.

create table if not exists public.competency_personas (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    description text null,
    category_tags text[] not null default '{}',
    role_tags text[] not null default '{}',
    status text not null default 'active' check (status in ('active', 'archived')),
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz null
);

create table if not exists public.competency_persona_items (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    persona_id uuid not null references public.competency_personas(id) on delete cascade,
    competency_type_id uuid not null references public.competency_types(id) on delete cascade,
    requirement_level text not null check (requirement_level in ('required', 'optional', 'conditional')),
    validity_period_months_override integer null,
    warning_days_override integer null,
    notes text null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.person_competency_personas (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    person_id uuid not null references public.people(id) on delete cascade,
    persona_id uuid not null references public.competency_personas(id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'removed')),
    notes text null,
    assigned_at timestamptz not null default now(),
    assigned_by uuid null references public.profiles(id) on delete set null,
    removed_at timestamptz null,
    removed_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.person_competency_overrides (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    person_id uuid not null references public.people(id) on delete cascade,
    persona_id uuid null references public.competency_personas(id) on delete set null,
    competency_type_id uuid not null references public.competency_types(id) on delete cascade,
    override_type text not null check (override_type in ('suppressed', 'not_applicable')),
    reason text null,
    active boolean not null default true,
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists competency_personas_org_name_idx
    on public.competency_personas (organisation_id, lower(name));

create unique index if not exists competency_persona_items_unique_idx
    on public.competency_persona_items (organisation_id, persona_id, competency_type_id);

create unique index if not exists person_competency_personas_unique_idx
    on public.person_competency_personas (organisation_id, person_id, persona_id);

create unique index if not exists person_competency_overrides_unique_idx
    on public.person_competency_overrides (
        organisation_id,
        person_id,
        competency_type_id,
        override_type,
        coalesce(persona_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

alter table public.competency_personas enable row level security;
alter table public.competency_persona_items enable row level security;
alter table public.person_competency_personas enable row level security;
alter table public.person_competency_overrides enable row level security;

drop policy if exists "Users can read competency personas in own organisation" on public.competency_personas;
create policy "Users can read competency personas in own organisation" on public.competency_personas
    for select using (public.can_read_organization(organisation_id));

drop policy if exists "Members can write competency personas in own organisation" on public.competency_personas;
create policy "Members can write competency personas in own organisation" on public.competency_personas
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

drop policy if exists "Users can read competency persona items in own organisation" on public.competency_persona_items;
create policy "Users can read competency persona items in own organisation" on public.competency_persona_items
    for select using (public.can_read_organization(organisation_id));

drop policy if exists "Members can write competency persona items in own organisation" on public.competency_persona_items;
create policy "Members can write competency persona items in own organisation" on public.competency_persona_items
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

drop policy if exists "Users can read person competency personas in own organisation" on public.person_competency_personas;
create policy "Users can read person competency personas in own organisation" on public.person_competency_personas
    for select using (public.can_read_organization(organisation_id));

drop policy if exists "Members can write person competency personas in own organisation" on public.person_competency_personas;
create policy "Members can write person competency personas in own organisation" on public.person_competency_personas
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

drop policy if exists "Users can read person competency overrides in own organisation" on public.person_competency_overrides;
create policy "Users can read person competency overrides in own organisation" on public.person_competency_overrides
    for select using (public.can_read_organization(organisation_id));

drop policy if exists "Members can write person competency overrides in own organisation" on public.person_competency_overrides;
create policy "Members can write person competency overrides in own organisation" on public.person_competency_overrides
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

-- Relationship guards keep persona records within one organisation.
drop policy if exists "Competency persona item relationships stay in one organisation" on public.competency_persona_items;
create policy "Competency persona item relationships stay in one organisation" on public.competency_persona_items
    for all
    using (
        organisation_id = (
            select cp.organisation_id
            from public.competency_personas cp
            where cp.id = persona_id
        )
        and organisation_id = (
            select ct.organisation_id
            from public.competency_types ct
            where ct.id = competency_type_id
        )
    )
    with check (
        organisation_id = (
            select cp.organisation_id
            from public.competency_personas cp
            where cp.id = persona_id
        )
        and organisation_id = (
            select ct.organisation_id
            from public.competency_types ct
            where ct.id = competency_type_id
        )
    );

drop policy if exists "Person competency persona relationships stay in one organisation" on public.person_competency_personas;
create policy "Person competency persona relationships stay in one organisation" on public.person_competency_personas
    for all
    using (
        organisation_id = (
            select p.organisation_id
            from public.people p
            where p.id = person_id
        )
        and organisation_id = (
            select cp.organisation_id
            from public.competency_personas cp
            where cp.id = persona_id
        )
    )
    with check (
        organisation_id = (
            select p.organisation_id
            from public.people p
            where p.id = person_id
        )
        and organisation_id = (
            select cp.organisation_id
            from public.competency_personas cp
            where cp.id = persona_id
        )
    );

drop policy if exists "Person competency override relationships stay in one organisation" on public.person_competency_overrides;
create policy "Person competency override relationships stay in one organisation" on public.person_competency_overrides
    for all
    using (
        organisation_id = (
            select p.organisation_id
            from public.people p
            where p.id = person_id
        )
        and organisation_id = (
            select ct.organisation_id
            from public.competency_types ct
            where ct.id = competency_type_id
        )
        and (
            persona_id is null
            or organisation_id = (
                select cp.organisation_id
                from public.competency_personas cp
                where cp.id = persona_id
            )
        )
    )
    with check (
        organisation_id = (
            select p.organisation_id
            from public.people p
            where p.id = person_id
        )
        and organisation_id = (
            select ct.organisation_id
            from public.competency_types ct
            where ct.id = competency_type_id
        )
        and (
            persona_id is null
            or organisation_id = (
                select cp.organisation_id
                from public.competency_personas cp
                where cp.id = persona_id
            )
        )
    );
