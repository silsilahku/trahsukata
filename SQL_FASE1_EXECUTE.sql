-- ============================================
-- FASE 1: Database Setup - Trah Sukata Supabase
-- ============================================
-- Copy-paste setiap SQL block ke Supabase SQL Editor
-- Jalankan satu per satu dengan click "Run"
-- ============================================

-- ============================================
-- QUERY 1: Create profiles table
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lengkap TEXT NOT NULL,
  nama_panggilan TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  tahun_lahir INTEGER,
  tahun_wafat INTEGER,
  domisili_terakhir TEXT,
  bio TEXT,
  foto_path TEXT,
  foto_url TEXT,
  is_root BOOLEAN DEFAULT false,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_profiles_nama ON profiles(nama_lengkap);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_tahun_lahir ON profiles(tahun_lahir);

COMMENT ON TABLE profiles IS 'Tabel anggota keluarga (Trah Sukata)';
COMMENT ON COLUMN profiles.is_root IS 'Flag untuk root node (generasi tertua)';

-- ============================================
-- QUERY 2: Create relationships table
-- ============================================
CREATE TABLE relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_b_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('parent_child', 'spouse')),
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (person_a_id != person_b_id),
  UNIQUE(person_a_id, person_b_id, type)
);

CREATE INDEX idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships(person_b_id);
CREATE INDEX idx_relationships_type ON relationships(type);
CREATE INDEX idx_relationships_combined ON relationships(person_a_id, type);

COMMENT ON TABLE relationships IS 'Hubungan keluarga (parent_child, spouse) - support poligami';
COMMENT ON COLUMN relationships.type IS 'Tipe relasi: parent_child atau spouse';

-- ============================================
-- QUERY 3: Enable RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- QUERY 4: Create RLS Policies - profiles
-- ============================================
CREATE POLICY "profiles_public_read" 
  ON profiles
  FOR SELECT 
  USING (true);

CREATE POLICY "profiles_authenticated_insert" 
  ON profiles
  FOR INSERT 
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com');

CREATE POLICY "profiles_authenticated_update" 
  ON profiles
  FOR UPDATE 
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com') 
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com');

CREATE POLICY "profiles_authenticated_delete" 
  ON profiles
  FOR DELETE 
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com');

-- ============================================
-- QUERY 5: Create RLS Policies - relationships
-- ============================================
CREATE POLICY "relationships_public_read" 
  ON relationships
  FOR SELECT 
  USING (true);

CREATE POLICY "relationships_authenticated_insert" 
  ON relationships
  FOR INSERT 
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com');

CREATE POLICY "relationships_authenticated_update" 
  ON relationships
  FOR UPDATE 
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com') 
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com');

CREATE POLICY "relationships_authenticated_delete" 
  ON relationships
  FOR DELETE 
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com');

-- ============================================
-- QUERY 6: Setup Storage Policies untuk bucket fotos
-- ============================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_fotos_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_update"
  ON storage.objects
  FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_delete"
  ON storage.objects
  FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'trah@sukata.com' AND bucket_id = 'fotos');

-- ============================================
-- QUERY 7: Verify Setup
-- ============================================
-- Run this query to verify all tables and policies are created correctly
SELECT 
  'profiles' as table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'profiles'
UNION ALL
SELECT 
  'relationships' as table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'relationships';

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'relationships')
ORDER BY tablename, policyname;

-- Check row counts (should be 0 initially)
SELECT 
  'profiles' as table_name, 
  COUNT(*) as row_count 
FROM profiles
UNION ALL
SELECT 
  'relationships' as table_name, 
  COUNT(*) as row_count 
FROM relationships;
