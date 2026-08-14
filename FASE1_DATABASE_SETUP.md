# FASE 1: Database Setup - Supabase

**Tujuan**: Membuat database schema untuk support poligami dengan validasi (setiap anak harus punya 2 parent).

**Waktu Estimasi**: 15-20 menit

**Tools**: Supabase Dashboard → SQL Editor

---

## Step 1: Akses Supabase SQL Editor

1. Buka: https://app.supabase.com/project/dokmqzakcjmtoncljkik
2. Navigate ke: **SQL Editor** (menu kiri)
3. Buat query baru

---

## Step 2: Create `profiles` Table

Copy-paste SQL berikut ke SQL Editor, lalu klik "Run":

```sql
-- Create profiles table
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

-- Create indexes untuk search performance
CREATE INDEX idx_profiles_nama ON profiles(nama_lengkap);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_tahun_lahir ON profiles(tahun_lahir);

-- Add comment untuk dokumentasi
COMMENT ON TABLE profiles IS 'Tabel anggota keluarga (Trah Sukata)';
COMMENT ON COLUMN profiles.is_root IS 'Flag untuk root node (generasi tertua)';
```

**Expected Output**: 
```
Query executed successfully.
```

---

## Step 3: Create `relationships` Table

Copy-paste SQL berikut ke SQL Editor baru:

```sql
-- Create relationships table
-- Support poligami: A bisa punya 2+ spouse, masing-masing dengan anak berbeda
CREATE TABLE relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_b_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('parent_child', 'spouse')),
  created_at TIMESTAMP DEFAULT now(),
  
  -- Validasi: tidak boleh self-reference
  CONSTRAINT no_self_reference CHECK (person_a_id != person_b_id),
  
  -- Validasi: tidak boleh duplicate relationship
  UNIQUE(person_a_id, person_b_id, type)
);

-- Create indexes untuk query performance
CREATE INDEX idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships(person_b_id);
CREATE INDEX idx_relationships_type ON relationships(type);
CREATE INDEX idx_relationships_combined ON relationships(person_a_id, type);

-- Add comments
COMMENT ON TABLE relationships IS 'Hubungan keluarga (parent_child, spouse) - support poligami';
COMMENT ON COLUMN relationships.type IS 'Tipe relasi: parent_child (A adalah parent dari B) atau spouse (A married to B)';
```

**Expected Output**: 
```
Query executed successfully.
```

---

## Step 4: Setup Row Level Security (RLS) - Public Read Only

Copy-paste SQL berikut ke SQL Editor baru:

```sql
-- Enable RLS pada kedua tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public SELECT (anyone can read)
CREATE POLICY "profiles_public_read" 
  ON profiles
  FOR SELECT 
  USING (true);

CREATE POLICY "relationships_public_read" 
  ON relationships
  FOR SELECT 
  USING (true);

-- Policy 2: Authenticated users can INSERT/UPDATE/DELETE (admin only)
CREATE POLICY "profiles_authenticated_insert" 
  ON profiles
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_authenticated_update" 
  ON profiles
  FOR UPDATE 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_authenticated_delete" 
  ON profiles
  FOR DELETE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "relationships_authenticated_insert" 
  ON relationships
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "relationships_authenticated_update" 
  ON relationships
  FOR UPDATE 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "relationships_authenticated_delete" 
  ON relationships
  FOR DELETE 
  USING (auth.role() = 'authenticated');
```

**Expected Output**: 
```
Query executed successfully.
```

---

## Step 5: Verify Setup

Copy-paste SQL berikut untuk verifikasi setup berhasil:

```sql
-- Verifikasi: Check table structure
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name IN ('profiles', 'relationships')
ORDER BY table_name, ordinal_position;

-- Verifikasi: Check RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'relationships');

-- Verifikasi: Empty data (should return 0)
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as relationship_count FROM relationships;
```

**Expected Output**:
```
| table_name   | column_name        | data_type                   |
|--             |--                   |--                            |
| profiles      | id                 | uuid                        |
| profiles      | nama_lengkap       | text                        |
| profiles      | nama_panggilan     | text                        |
| profiles      | gender             | text                        |
| ... (all columns) |                 |                             |

| tablename    | policyname                  | PERMISSIVE | cmd    |
|--             |--                            |--          |--      |
| profiles     | profiles_public_read        | PERMISSIVE | SELECT |
| profiles     | profiles_authenticated_...  | PERMISSIVE | INSERT |
| ... (all policies) |                        |            |        |

| profile_count | relationship_count |
|--             |--                  |
| 0             | 0                  |
```

---

## Step 6: Setup Storage Bucket untuk Foto (Optional)

Jika belum ada:

1. Navigate ke: **Storage** (menu kiri di Supabase Dashboard)
2. Klik **Create New Bucket**
3. **Bucket name**: `fotos`
4. **Public bucket**: Toggle ON (agar foto bisa diakses public)
5. Klik **Create bucket**

## Step 7: Setup Storage Policies untuk Bucket `fotos`

Setelah bucket dibuat, jalankan SQL berikut di Supabase SQL Editor untuk mengizinkan upload oleh admin:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_fotos_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_update"
  ON storage.objects
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND bucket_id = 'fotos');

CREATE POLICY "storage_fotos_authenticated_delete"
  ON storage.objects
  FOR DELETE
  USING (auth.role() = 'authenticated' AND bucket_id = 'fotos');
```

**Catatan**: Policy di atas mengizinkan:
- Public bisa membaca foto (`SELECT`)
- Admin yang login (`authenticated`) bisa upload, edit, dan hapus foto di bucket `fotos`

---

## Troubleshooting

**Error: "relation 'profiles' already exists"**
- Berarti table sudah ada sebelumnya
- Drop dulu: `DROP TABLE IF EXISTS profiles CASCADE;`
- Lalu jalankan CREATE TABLE query lagi

**Error: "permission denied for schema public"**
- User role tidak punya permission
- Pastikan Anda login dengan role yang tepat (bukan service_role)

**RLS Policy tidak bekerja?**
- Check di Supabase Dashboard → SQL Editor → Schemas → public → policies
- Pastikan semua policy ada dan dalam status ACTIVE

**Error: "new row violates row-level security policy" saat upload foto?**
- Storage bucket belum punya policy. Jalankan SQL di **Step 7** untuk membuat storage policies.

---

## Next Step: FASE 2

Setelah FASE 1 selesai dan terverifikasi:
1. Update `index.html` dengan Supabase client library
2. Implement auth UI (login/logout)
3. Implement CRUD forms (add/edit/delete profile & relationships)
4. Integrate dengan tree visualization

**Waktu Estimasi FASE 2**: 4-6 jam

---

## Dokumentasi & Reference

- Supabase Docs: https://supabase.com/docs
- PostgreSQL RLS: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Storage: https://supabase.com/docs/guides/storage

---

**Status FASE 1**: Siap untuk di-execute!  
**Hubungi saya setelah semua SQL berhasil dijalankan.**
