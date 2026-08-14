-- ============================================
-- Storage Policies (already included in SQL_FASE1_EXECUTE.sql)
-- ============================================
-- Storage policies untuk bucket fotos.
-- POLICY ini sudah termasuk (terintegrasi) dalam SQL_FASE1_EXECUTE.sql
-- QUERY 6, jadi file ini hanya sebagai dokumentasi / referensi.
-- Jika Anda menjalankan SQL_FASE1_EXECUTE.sql dari awal, tidak perlu
-- menjalankan file ini lagi.
-- ============================================

-- Enable RLS on storage.objects (jika belum dijalankan oleh FASE1)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read photos from the "fotos" bucket
CREATE POLICY "storage_fotos_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fotos');

-- Policy: Admin (trah@sukata.com) can upload to the "fotos" bucket
CREATE POLICY "storage_fotos_authenticated_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');

-- Policy: Admin can update photos in the "fotos" bucket
CREATE POLICY "storage_fotos_authenticated_update"
  ON storage.objects
  FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');

-- Policy: Admin can delete photos from the "fotos" bucket
CREATE POLICY "storage_fotos_authenticated_delete"
  ON storage.objects
  FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');
