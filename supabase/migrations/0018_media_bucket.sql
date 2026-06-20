-- Public Storage bucket for admin-uploaded media (hero images, post art).
-- Public read via the bucket's public URLs; uploads/deletes go through the
-- service-role client in server actions, so no extra storage.objects policy
-- is required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/png','image/jpeg','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
