-- OnionSetu fix-forward migration: run in Supabase SQL Editor if supabase_schema.sql was already applied.
-- 1) Allow 10-15 batch views (was 0-2). 2) Make buckets public so report images load via public URL.

alter table public.assessment_images drop constraint if exists assessment_images_view_index_check;
alter table public.assessment_images add constraint assessment_images_view_index_check check (view_index between 0 and 14);

update storage.buckets set public = true where id in ('assessment-images','reports');

drop policy if exists "assessment-images update" on storage.objects;
create policy "assessment-images update" on storage.objects for update to authenticated using (bucket_id='assessment-images') with check (bucket_id='assessment-images');
drop policy if exists "assessment-images public read" on storage.objects;
create policy "assessment-images public read" on storage.objects for select to anon using (bucket_id='assessment-images');
drop policy if exists "reports public read" on storage.objects;
create policy "reports public read" on storage.objects for select to anon using (bucket_id='reports');
