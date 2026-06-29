-- Baristachaw manual payment proof storage.
-- Run in Supabase SQL editor for every environment that receives manual payments.
-- The bucket stays private; backend service-role endpoints issue short-lived signed URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'payment-proofs';
