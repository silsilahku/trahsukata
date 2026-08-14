-- ============================================
-- FASE 3: Test Data Input - Ready to Execute
-- ============================================
-- This SQL script inserts test data for the poligami family structure
-- Copy-paste ALL of this into Supabase SQL Editor and click "Run"
-- ============================================

-- ============================================
-- TEST SCENARIO: Poligami Family Structure
-- ============================================
-- Ahmad (Bapak) married to:
--   1. Siti (Ibu 1) → have child Bambang
--   2. Putri (Ibu 2) → have child Dewi
--
-- This tests:
-- ✓ Poligami (1 bapak + 2 ibu)
-- ✓ Different children per spouse
-- ✓ Each child has exactly 2 parents (1 bapak + 1 ibu)
-- ============================================

-- ============================================
-- STEP 1: Insert Profiles
-- ============================================

INSERT INTO profiles (
  nama_lengkap, 
  nama_panggilan, 
  gender, 
  tahun_lahir, 
  domisili_terakhir, 
  bio,
  is_root, 
  urutan
) VALUES
-- Bapak (Father)
(
  'Ahmad Sukata', 
  'Ahmad', 
  'Laki-laki', 
  1945, 
  'Jakarta',
  'Pendiri keluarga Trah Sukata, dikenal dengan kebijaksanaannya.',
  true, 
  1
),
-- Ibu 1 (Mother 1)
(
  'Siti Nurhaliza', 
  'Siti', 
  'Perempuan', 
  1950, 
  'Bandung',
  'Istri pertama Ahmad, pengurus rumah tangga yang baik.',
  false, 
  2
),
-- Ibu 2 (Mother 2) - untuk test poligami
(
  'Putri Indah', 
  'Putri', 
  'Perempuan', 
  1955, 
  'Surabaya',
  'Istri kedua Ahmad, wanita mandiri dan berbisnis.',
  false, 
  3
),
-- Anak 1 (Child 1) - dari Ahmad + Siti
(
  'Bambang Sukata', 
  'Bambang', 
  'Laki-laki', 
  1970, 
  'Jakarta',
  'Anak tertua dari Ahmad dan Siti, melanjutkan bisnis keluarga.',
  false, 
  4
),
-- Anak 2 (Child 2) - dari Ahmad + Putri
(
  'Dewi Sukata', 
  'Dewi', 
  'Perempuan', 
  1975, 
  'Yogyakarta',
  'Anak dari Ahmad dan Putri, pendidik profesional.',
  false, 
  5
);

-- ============================================
-- STEP 2: Get Profile IDs (for verification)
-- ============================================
-- The IDs are auto-generated, we'll reference them by name in relationships
-- Note: In a real scenario, you'd copy the returned IDs and use them below
-- For this test, we'll use a subquery approach

-- ============================================
-- STEP 3: Insert Spouse Relationships (Bidirectional)
-- ============================================

-- Ahmad married to Siti (bidirectional: A→B and B→A)
INSERT INTO relationships (person_a_id, person_b_id, type)
SELECT 
  a.id as person_a_id,
  b.id as person_b_id,
  'spouse' as type
FROM profiles a, profiles b
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND b.nama_lengkap = 'Siti Nurhaliza'
UNION ALL
SELECT 
  b.id as person_a_id,
  a.id as person_b_id,
  'spouse' as type
FROM profiles a, profiles b
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND b.nama_lengkap = 'Siti Nurhaliza';

-- Ahmad married to Putri (bidirectional: A→B and B→A)
INSERT INTO relationships (person_a_id, person_b_id, type)
SELECT 
  a.id as person_a_id,
  c.id as person_b_id,
  'spouse' as type
FROM profiles a, profiles c
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND c.nama_lengkap = 'Putri Indah'
UNION ALL
SELECT 
  c.id as person_a_id,
  a.id as person_b_id,
  'spouse' as type
FROM profiles a, profiles c
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND c.nama_lengkap = 'Putri Indah';

-- ============================================
-- STEP 4: Insert Parent-Child Relationships
-- ============================================

-- Bambang's parents: Ahmad (father) + Siti (mother)
INSERT INTO relationships (person_a_id, person_b_id, type)
SELECT 
  a.id as person_a_id,
  child.id as person_b_id,
  'parent_child' as type
FROM profiles a, profiles child
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND child.nama_lengkap = 'Bambang Sukata'
UNION ALL
SELECT 
  b.id as person_a_id,
  child.id as person_b_id,
  'parent_child' as type
FROM profiles b, profiles child
WHERE b.nama_lengkap = 'Siti Nurhaliza' 
  AND child.nama_lengkap = 'Bambang Sukata';

-- Dewi's parents: Ahmad (father) + Putri (mother)
INSERT INTO relationships (person_a_id, person_b_id, type)
SELECT 
  a.id as person_a_id,
  child.id as person_b_id,
  'parent_child' as type
FROM profiles a, profiles child
WHERE a.nama_lengkap = 'Ahmad Sukata' 
  AND child.nama_lengkap = 'Dewi Sukata'
UNION ALL
SELECT 
  c.id as person_a_id,
  child.id as person_b_id,
  'parent_child' as type
FROM profiles c, profiles child
WHERE c.nama_lengkap = 'Putri Indah' 
  AND child.nama_lengkap = 'Dewi Sukata';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after all INSERT queries to verify data

-- Query 1: Check all profiles inserted
SELECT 
  id, 
  nama_lengkap, 
  nama_panggilan, 
  gender, 
  tahun_lahir, 
  domisili_terakhir,
  is_root
FROM profiles
ORDER BY urutan;

-- Query 2: Check all relationships
SELECT 
  r.id,
  p_a.nama_lengkap as person_a,
  p_b.nama_lengkap as person_b,
  r.type,
  r.created_at
FROM relationships r
JOIN profiles p_a ON r.person_a_id = p_a.id
JOIN profiles p_b ON r.person_b_id = p_b.id
ORDER BY r.type, p_a.nama_lengkap;

-- Query 3: Verify spouse relationships (should be 4 total: 2 pairs bidirectional)
SELECT 
  p_a.nama_lengkap as spouse_1,
  p_b.nama_lengkap as spouse_2,
  COUNT(*) as relationship_count
FROM relationships r
JOIN profiles p_a ON r.person_a_id = p_a.id
JOIN profiles p_b ON r.person_b_id = p_b.id
WHERE r.type = 'spouse'
GROUP BY p_a.nama_lengkap, p_b.nama_lengkap;

-- Query 4: Verify parent-child relationships (should be 4 total)
SELECT 
  p_parent.nama_lengkap as parent,
  p_parent.gender as parent_gender,
  p_child.nama_lengkap as child,
  COUNT(*) as child_count
FROM relationships r
JOIN profiles p_parent ON r.person_a_id = p_parent.id
JOIN profiles p_child ON r.person_b_id = p_child.id
WHERE r.type = 'parent_child'
GROUP BY p_parent.nama_lengkap, p_parent.gender, p_child.nama_lengkap
ORDER BY p_child.nama_lengkap;

-- Query 5: Verify each child has exactly 2 parents
SELECT 
  p_child.nama_lengkap as child,
  COUNT(DISTINCT r.person_a_id) as parent_count,
  STRING_AGG(p_parent.nama_lengkap || ' (' || p_parent.gender || ')', ', ') as parents
FROM relationships r
JOIN profiles p_child ON r.person_b_id = p_child.id
JOIN profiles p_parent ON r.person_a_id = p_parent.id
WHERE r.type = 'parent_child'
GROUP BY p_child.nama_lengkap
ORDER BY p_child.nama_lengkap;

-- Query 6: Count totals
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM relationships WHERE type = 'spouse') as spouse_relationships,
  (SELECT COUNT(*) FROM relationships WHERE type = 'parent_child') as parent_child_relationships,
  (SELECT COUNT(*) FROM relationships) as total_relationships;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Total Profiles: 5 (Ahmad, Siti, Putri, Bambang, Dewi)
-- Spouse Relationships: 4 (Ahmad↔Siti, Siti↔Ahmad, Ahmad↔Putri, Putri↔Ahmad)
-- Parent-Child Relationships: 4 (Ahmad→Bambang, Siti→Bambang, Ahmad→Dewi, Putri→Dewi)
-- Total Relationships: 8
--
-- Spouse Pairs: 2 (Ahmad-Siti, Ahmad-Putri)
-- Children with 2 parents each:
--   - Bambang: Ahmad (Laki-laki), Siti (Perempuan)
--   - Dewi: Ahmad (Laki-laki), Putri (Perempuan)
-- ============================================

-- ============================================
-- SUCCESS INDICATORS
-- ============================================
-- ✅ All INSERT queries execute without error
-- ✅ Query 1: 5 profiles returned
-- ✅ Query 2: 8 relationships returned
-- ✅ Query 3: 2 spouse pairs (bidirectional)
-- ✅ Query 4: 4 parent-child relationships
-- ✅ Query 5: Each child has exactly 2 parents
-- ✅ Query 6: Totals match expected counts
-- ============================================
