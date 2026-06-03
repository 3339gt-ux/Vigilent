-- Vygilence private evidence storage setup for hosted Supabase projects.
-- Legacy Vigilen policy names are retained so existing Supabase projects do not need policy renames.
-- Run this after supabase/schema.sql.
-- This script is safe to re-run: it upserts the bucket and only creates
-- missing storage policies. It does not drop policies, recreate storage.objects,
-- or alter ownership-managed Supabase Storage tables.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'evidence-documents',
    'evidence-documents',
    false,
    10485760,
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg'
    ]
)
on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Vigilen evidence read by organization members'
    ) then
        execute $policy$
        create policy "Vigilen evidence read by organization members"
            on storage.objects
            for select
            to authenticated
            using (
                bucket_id = 'evidence-documents'
                and (storage.foldername(name))[1] = 'organisations'
                and public.is_organization_member(((storage.foldername(name))[2])::uuid)
            )
        $policy$;
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Vigilen evidence upload by organization editors'
    ) then
        execute $policy$
        create policy "Vigilen evidence upload by organization editors"
            on storage.objects
            for insert
            to authenticated
            with check (
                bucket_id = 'evidence-documents'
                and (storage.foldername(name))[1] = 'organisations'
                and (storage.foldername(name))[3] = 'documents'
                and public.can_write_organization(((storage.foldername(name))[2])::uuid)
            )
        $policy$;
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Vigilen evidence update by organization editors'
    ) then
        execute $policy$
        create policy "Vigilen evidence update by organization editors"
            on storage.objects
            for update
            to authenticated
            using (
                bucket_id = 'evidence-documents'
                and (storage.foldername(name))[1] = 'organisations'
                and public.can_write_organization(((storage.foldername(name))[2])::uuid)
            )
            with check (
                bucket_id = 'evidence-documents'
                and (storage.foldername(name))[1] = 'organisations'
                and (storage.foldername(name))[3] = 'documents'
                and public.can_write_organization(((storage.foldername(name))[2])::uuid)
            )
        $policy$;
    end if;
end $$;
