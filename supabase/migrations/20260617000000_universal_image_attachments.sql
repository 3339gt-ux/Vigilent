-- Migration draft: Universal Image Attachments Foundation.
-- This migration is idempotent and can be safely run in the Supabase SQL Editor.
-- Target table: public.record_image_attachments

create table if not exists public.record_image_attachments (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organizations(id) on delete cascade,
    entity_type text not null check (
        entity_type in (
            'person',
            'asset',
            'requirement',
            'competency_record',
            'asset_check_record',
            'action',
            'review',
            'evidence_document'
        )
    ),
    entity_id uuid not null,
    document_id uuid references public.evidence_documents(id) on delete set null,
    storage_bucket text default 'evidence-documents',
    storage_path text,
    file_name text not null,
    mime_type text not null,
    file_size_bytes integer,
    width integer,
    height integer,
    image_role text not null default 'gallery' check (
        image_role in (
            'primary',
            'gallery',
            'before',
            'after',
            'supporting',
            'avatar'
        )
    ),
    caption text,
    alt_text text,
    crop_data jsonb default null,
    sort_order integer default 0 not null,
    is_primary boolean default false not null,
    uploaded_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    archived_at timestamp with time zone,
    archived_by uuid references public.profiles(id) on delete set null,
    
    -- Constraint: prevent cross-organisation linking
    constraint fk_record_image_attachments_organisation_check check (
        organisation_id is not null
    )
);

-- Indexing for fast query resolution
create index if not exists record_image_attachments_entity_idx on public.record_image_attachments (organisation_id, entity_type, entity_id);
create index if not exists record_image_attachments_document_idx on public.record_image_attachments (document_id);
create index if not exists record_image_attachments_archived_idx on public.record_image_attachments (organisation_id, archived_at);
create unique index if not exists record_image_attachments_one_primary_active_idx
    on public.record_image_attachments (organisation_id, entity_type, entity_id)
    where is_primary = true and archived_at is null;

-- Trigger to update updated_at timestamp
create or replace function public.set_record_image_attachments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists set_record_image_attachments_updated_at on public.record_image_attachments;
create trigger set_record_image_attachments_updated_at
before update on public.record_image_attachments
for each row
execute function public.set_record_image_attachments_updated_at();

-- Enable RLS
alter table public.record_image_attachments enable row level security;

-- Revoke public access
revoke all on public.record_image_attachments from anon;

-- Grant authenticated access
grant select, insert, update, delete on public.record_image_attachments to authenticated;

-- RLS Policies
drop policy if exists "Users can read image attachments in own organisation" on public.record_image_attachments;
drop policy if exists "Writers can create image attachments in own organisation" on public.record_image_attachments;
drop policy if exists "Writers can update image attachments in own organisation" on public.record_image_attachments;
drop policy if exists "Admins can delete image attachments in own organisation" on public.record_image_attachments;

create policy "Users can read image attachments in own organisation" on public.record_image_attachments
    for select using (
        public.is_organization_member(organisation_id)
        and archived_at is null
    );

create policy "Writers can create image attachments in own organisation" on public.record_image_attachments
    for insert with check (
        public.can_write_organization(organisation_id)
        and uploaded_by = auth.uid()
        -- Prevent linking to a document belonging to a different organisation
        and (
            document_id is null or exists (
                select 1 from public.evidence_documents
                where id = document_id
                  and organization_id = organisation_id
            )
        )
    );

create policy "Writers can update image attachments in own organisation" on public.record_image_attachments
    for update using (
        public.can_write_organization(organisation_id)
    ) with check (
        public.can_write_organization(organisation_id)
        -- Prevent linking to a document belonging to a different organisation
        and (
            document_id is null or exists (
                select 1 from public.evidence_documents
                where id = document_id
                  and organization_id = organisation_id
            )
        )
    );

create policy "Admins can delete image attachments in own organisation" on public.record_image_attachments
    for delete using (
        public.can_admin_organization(organisation_id)
    );
