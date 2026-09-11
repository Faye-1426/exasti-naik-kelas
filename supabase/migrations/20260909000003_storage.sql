-- Bucket jejak audit untuk jalur input berbasis gambar (aturan keras 6).
-- Berkas asli diunggah SEBELUM Gemini dipanggil, jadi berkasnya tetap ada
-- walau pembacaan AI gagal.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unggahan',
  'unggahan',
  false,                                   -- tidak pernah publik: ini catatan keuangan
  10485760,                                -- FR1.1: hingga 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- Nama objek berbentuk "<business_id>/<uuid>.<ext>". Folder pertama adalah
-- pemiliknya, jadi kepemilikan cukup satu lookup — sama seperti RLS tabel.
create policy unggahan_milik_usaha on storage.objects
  for all to authenticated
  using (
    bucket_id = 'unggahan'
    and (storage.foldername(name))[1] = public.usaha_saya()::text
  )
  with check (
    bucket_id = 'unggahan'
    and (storage.foldername(name))[1] = public.usaha_saya()::text
  );
