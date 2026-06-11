-- Migration: Add asset categories and subcategories taxonomy tables
-- This migration is idempotent and can be safely re-run in Supabase SQL Editor.

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

-- Add category_id to public.assets table
alter table public.assets add column if not exists category_id uuid references public.asset_categories(id) on delete set null;

-- Enforce same-organisation parent and asset/category relationships at the database layer.
-- Invalid legacy references are detached without deleting either the asset or category row.
update public.asset_categories child
set parent_id = null
where parent_id is not null
  and not exists (
      select 1
      from public.asset_categories parent
      where parent.id = child.parent_id
        and parent.organisation_id = child.organisation_id
  );

update public.assets asset
set category_id = null
where category_id is not null
  and not exists (
      select 1
      from public.asset_categories category
      where category.id = asset.category_id
        and category.organisation_id = asset.organisation_id
  );

create unique index if not exists asset_categories_org_id_uidx
    on public.asset_categories (organisation_id, id);

alter table public.asset_categories
    drop constraint if exists asset_categories_parent_id_fkey;
alter table public.assets
    drop constraint if exists assets_category_id_fkey;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'asset_categories_parent_same_org_fk'
          and conrelid = 'public.asset_categories'::regclass
    ) then
        alter table public.asset_categories
            add constraint asset_categories_parent_same_org_fk
            foreign key (organisation_id, parent_id)
            references public.asset_categories (organisation_id, id)
            on delete restrict;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'assets_category_same_org_fk'
          and conrelid = 'public.assets'::regclass
    ) then
        alter table public.assets
            add constraint assets_category_same_org_fk
            foreign key (organisation_id, category_id)
            references public.asset_categories (organisation_id, id)
            on delete restrict;
    end if;
end
$$;

-- Enable Row Level Security (RLS)
alter table public.asset_categories enable row level security;

-- Revoke all permissions from anonymous users
revoke all on table public.asset_categories from anon;

-- Grant select, insert, update, delete to authenticated users
grant select, insert, update, delete on table public.asset_categories to authenticated;

-- RLS policies
drop policy if exists "Users can read asset categories in own organisation" on public.asset_categories;
create policy "Users can read asset categories in own organisation" on public.asset_categories
    for select using (public.is_organization_member(organisation_id));

drop policy if exists "Members can write asset categories in own organisation" on public.asset_categories;
create policy "Members can write asset categories in own organisation" on public.asset_categories
    for all using (public.can_write_organization(organisation_id))
    with check (public.can_write_organization(organisation_id));

-- Trigger for updated_at
drop trigger if exists set_asset_categories_updated_at on public.asset_categories;
create trigger set_asset_categories_updated_at
before update on public.asset_categories
for each row execute function public.set_asset_updated_at();

-- Indexes for performance query optimization
create index if not exists asset_categories_org_idx on public.asset_categories (organisation_id);
create index if not exists asset_categories_parent_idx on public.asset_categories (parent_id);
create index if not exists assets_category_idx on public.assets (category_id);
