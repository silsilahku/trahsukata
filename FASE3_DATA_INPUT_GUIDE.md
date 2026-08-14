# FASE 3: Manual Data Input - Testing Guide

**Objective**: Test Supabase integration by manually inputting data via Supabase SQL

**Timeline**: 30 minutes to 2 hours (depending on data volume)

---

## Step 1: Quick Verification (5 minutes)

### 1.1 Open the Webapp
- Open `index.html` in your browser
- Expected: Page loads, shows "Menyiapkan data" in header
- Check browser console (F12 → Console) for errors
- Expected: No errors, only info/warning messages

### 1.2 Test Connection
- Header should show "Login" button
- Admin panel should NOT be visible (only shows when logged in)
- Tree area should show loading state

### 1.3 Test Login Flow
1. Click "Login" button
2. Modal dialog appears with email/password form
3. Enter any text (test doesn't connect yet)
4. Click "Login" → should show error or attempt connection
5. Click "X" or outside dialog → should close

**Expected**: Login flow works without crashes

---

## Step 2: Input Test Data Directly to Supabase (Alternative Quick Method)

If you want to test quickly without building admin forms, you can input data directly via Supabase SQL:

### 2.1 Open Supabase SQL Editor
- https://app.supabase.com/project/dokmqzakcjmtoncljkik/sql
- Create new query

### 2.2 Insert Test Profile #1 (Bapak/Father)
```sql
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir, is_root)
VALUES ('Ahmad Sukata', 'Ahmad', 'Laki-laki', 1945, 'Jakarta', true)
RETURNING id;
```
**Copy the returned `id`** (will be something like `a1b2c3d4-...`)

### 2.3 Insert Test Profile #2 (Ibu 1/Mother 1)
```sql
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir)
VALUES ('Siti Nurhaliza', 'Siti', 'Perempuan', 1950, 'Bandung')
RETURNING id;
```
**Copy the returned `id`**

### 2.4 Insert Test Profile #3 (Ibu 2/Mother 2) - For Poligami Test
```sql
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir)
VALUES ('Putri Indah', 'Putri', 'Perempuan', 1955, 'Surabaya')
RETURNING id;
```
**Copy the returned `id`**

### 2.5 Insert Test Profile #4 (Anak dari Ahmad + Siti)
```sql
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir)
VALUES ('Bambang Sukata', 'Bambang', 'Laki-laki', 1970, 'Jakarta')
RETURNING id;
```
**Copy the returned `id`**

### 2.6 Insert Test Profile #5 (Anak dari Ahmad + Putri)
```sql
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir)
VALUES ('Dewi Sukata', 'Dewi', 'Perempuan', 1975, 'Yogyakarta')
RETURNING id;
```
**Copy the returned `id`**

### 2.7 Add Spouse Relationships (Poligami) - Ahmad + Siti
```sql
INSERT INTO relationships (person_a_id, person_b_id, type)
VALUES 
  -- Ahmad married to Siti (bidirectional)
  ('<AHMAD_ID>', '<SITI_ID>', 'spouse'),
  ('<SITI_ID>', '<AHMAD_ID>', 'spouse');
```

### 2.8 Add Spouse Relationships - Ahmad + Putri
```sql
INSERT INTO relationships (person_a_id, person_b_id, type)
VALUES 
  -- Ahmad married to Putri (bidirectional)
  ('<AHMAD_ID>', '<PUTRI_ID>', 'spouse'),
  ('<PUTRI_ID>', '<AHMAD_ID>', 'spouse');
```

### 2.9 Add Parent-Child Relationships - Bambang (Ahmad + Siti)
```sql
INSERT INTO relationships (person_a_id, person_b_id, type)
VALUES 
  -- Ahmad is parent of Bambang
  ('<AHMAD_ID>', '<BAMBANG_ID>', 'parent_child'),
  -- Siti is parent of Bambang
  ('<SITI_ID>', '<BAMBANG_ID>', 'parent_child');
```

### 2.10 Add Parent-Child Relationships - Dewi (Ahmad + Putri)
```sql
INSERT INTO relationships (person_a_id, person_b_id, type)
VALUES 
  -- Ahmad is parent of Dewi
  ('<AHMAD_ID>', '<DEWI_ID>', 'parent_child'),
  -- Putri is parent of Dewi
  ('<PUTRI_ID>', '<DEWI_ID>', 'parent_child');
```

---

## Step 3: Refresh Webapp and Verify

### 3.1 Refresh Browser
- F5 or Ctrl+Shift+R (hard refresh)
- Wait for tree to load

### 3.2 Expected Results

**Public View (Without Login)**:
- ✅ Tree should show 5 anggota
- ✅ Ahmad in center (root)
- ✅ Siti and Putri as spouses
- ✅ Bambang and Dewi as children
- ✅ Gender colors applied (green for male, pink for female)
- ✅ Search should find all members

**After Login**:
- ✅ Admin panel appears
- ✅ Same tree visible
- ✅ "Tambah Anggota" and "Kelola Relasi" buttons available

---

## Step 4: Test Cases to Verify

### 4.1 Poligami Rendering
- [ ] Ahmad (bapak) displays correctly
- [ ] Both Siti dan Putri show as spouses
- [ ] Bambang shows as child of Ahmad + Siti
- [ ] Dewi shows as child of Ahmad + Putri
- [ ] Tree structure is logical (not tangled)

### 4.2 Search Functionality
- [ ] Search "Ahmad" → finds Ahmad, Bambang, Dewi
- [ ] Search "Jakarta" → finds Ahmad, Bambang
- [ ] Search "1970" → finds Bambang
- [ ] Search results displayed correctly

### 4.3 Member Details
- [ ] Click Bambang card → shows detail modal
- [ ] Detail shows: name, gender, birth year, domicile
- [ ] Shows relationships (parents: Ahmad, Siti)
- [ ] Close modal with X button

### 4.4 Tree Controls
- [ ] Zoom in button → tree gets bigger
- [ ] Zoom out button → tree gets smaller
- [ ] Center button → tree centers on Ahmad
- [ ] Pan/drag tree → works smoothly

### 4.5 Auth Flow
- [ ] Logout button visible (after login)
- [ ] Click logout → admin panel disappears
- [ ] Login button reappears
- [ ] Click login again → can re-login

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank tree | No data in DB | Insert test profiles using SQL |
| Tree shows error | Supabase query failed | Check browser console for error message |
| Login always fails | Auth not configured | Admin email/password needs to be added to Supabase Auth |
| Admin panel hidden | Not logged in | Click Login button and authenticate |
| Poligami not rendering correctly | Relationships not bidirectional | Verify both directions exist in DB |

---

## Example SQL - Full Insert (Replace IDs with actual UUIDs)

```sql
-- Insert 5 test profiles
INSERT INTO profiles (nama_lengkap, nama_panggilan, gender, tahun_lahir, domisili_terakhir, is_root) VALUES
('Ahmad Sukata', 'Ahmad', 'Laki-laki', 1945, 'Jakarta', true),
('Siti Nurhaliza', 'Siti', 'Perempuan', 1950, 'Bandung', false),
('Putri Indah', 'Putri', 'Perempuan', 1955, 'Surabaya', false),
('Bambang Sukata', 'Bambang', 'Laki-laki', 1970, 'Jakarta', false),
('Dewi Sukata', 'Dewi', 'Perempuan', 1975, 'Yogyakarta', false);

-- Then add relationships (use actual UUIDs from returned ids)
-- Run separately after getting the IDs from the profiles insert
```

---

## Success Criteria

✅ **FASE 3 is complete when**:
1. Test data inserted successfully into Supabase
2. Webapp loads and displays tree without errors
3. Poligami case (1 bapak + 2 ibu, different children) renders correctly
4. Search functionality works
5. Login/logout toggles admin panel
6. All tree controls (zoom, pan, center) work
7. Member detail cards show correctly

---

## Next Steps After FASE 3

- **If Successful**: Move to FASE 4 (Validasi & Testing) with more data
- **If Issues**: Debug and fix before proceeding
- **Add More Data**: Input real family data to test larger trees
- **Test Performance**: Monitor load times with 100+ members

---

**Estimate**: 30 min - 2 hours depending on testing depth
