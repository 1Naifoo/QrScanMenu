-- Storage bucket for dish and logo photos.
--
-- Public read: every client's static site hotlinks these photo URLs
-- directly (see apps/customer/scripts/generate-static.js) — there is no
-- server in front of the customer-facing site to proxy image requests
-- through, so the bucket itself must serve images publicly.
--
-- Write access is still locked down: only an authenticated admin of the
-- matching restaurant can upload/replace/delete files, and files are
-- organized in per-restaurant-slug folders (see editItem.js, which
-- uploads to `${restaurant.slug}/...`) so one client's admin can't write
-- into another client's folder.

insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

create policy "public can view dish photos"
  on storage.objects for select
  using (bucket_id = 'dish-photos');

create policy "admins can upload to their restaurant's folder"
  on storage.objects for insert
  with check (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from restaurant_admins ra
      join restaurants r on r.id = ra.restaurant_id
      where ra.user_id = auth.uid()
        and r.slug = (storage.foldername(objects.name))[1]
    )
  );

create policy "admins can replace files in their restaurant's folder"
  on storage.objects for update
  using (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from restaurant_admins ra
      join restaurants r on r.id = ra.restaurant_id
      where ra.user_id = auth.uid()
        and r.slug = (storage.foldername(objects.name))[1]
    )
  );

create policy "admins can delete files in their restaurant's folder"
  on storage.objects for delete
  using (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from restaurant_admins ra
      join restaurants r on r.id = ra.restaurant_id
      where ra.user_id = auth.uid()
        and r.slug = (storage.foldername(objects.name))[1]
    )
  );
