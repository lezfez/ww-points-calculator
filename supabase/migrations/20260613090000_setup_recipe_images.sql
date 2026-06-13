-- Recipe image metadata and public storage setup.
-- Source: sql/setup-recipe-images.sql

alter table public.recipes
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists image_prompt text,
  add column if not exists image_status text not null default 'pending'
    check (image_status in ('pending', 'generating', 'ready', 'failed')),
  add column if not exists image_generated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  8388608,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read recipe images" on storage.objects;

create policy "Public read recipe images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'recipe-images');
