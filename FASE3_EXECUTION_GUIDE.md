# FASE 3: Eksekusi Data Input - Panduan Langkah Demi Langkah

**Status**: FASE 3 IN PROGRESS  
**Waktu**: ~30 minutes - 1 hour  
**Tujuan**: Insert test data dan verifikasi tree rendering  

---

## ⚡ Quick Start (3 Langkah)

### Langkah 1: Buka Supabase SQL Editor
1. Buka browser: https://app.supabase.com/project/dokmqzakcjmtoncljkik/sql
2. Klik **"New Query"** (atau gunakan query editor yang ada)
3. Pastikan sudah login dengan akun Supabase Anda

### Langkah 2: Copy-Paste Test Data SQL
1. Buka file: [FASE3_TEST_DATA.sql](FASE3_TEST_DATA.sql)
2. Copy SEMUA isi file
3. Paste ke Supabase SQL Editor
4. Klik tombol **"Run"** (hijau, di kanan atas)

### Langkah 3: Verifikasi di Webapp
1. Refresh browser di halaman `index.html`
2. Tunggu tree load (lihat Menyiapkan data di header)
3. Lihat apakah 5 anggota keluarga muncul

---

## 📋 Detailed Execution Guide

### STEP 1: Buka Supabase SQL Editor (2 min)

**Instruksi**:
```
1. Buka URL: https://app.supabase.com/project/dokmqzakcjmtoncljkik/sql
2. Jika belum login, masukkan email + password Supabase Anda
3. Tunggu dashboard load
4. Di sidebar kiri, klik "SQL Editor"
5. Klik "+ New" atau "New Query"
```

**Expected**: Halaman SQL Editor blank siap untuk input query

**Screenshot Area**: Top-right area of Supabase dashboard

---

### STEP 2: Copy Test Data File (1 min)

**Instruksi**:
```
1. Buka file: FASE3_TEST_DATA.sql (di workspace)
2. Select All (Ctrl+A)
3. Copy (Ctrl+C)
```

**File Path**: `d:\Sukata\FASE3_TEST_DATA.sql`

**Note**: File sudah terstruktur dengan:
- INSERT statements untuk 5 profiles
- INSERT statements untuk 8 relationships (spouse + parent-child)
- 6 verification queries di akhir

---

### STEP 3: Paste ke Supabase (1 min)

**Instruksi**:
```
1. Di Supabase SQL Editor, click di text area (kosong)
2. Paste (Ctrl+V)
3. Akan muncul seluruh SQL script
```

**Expected**: 
- Kira-kira 200+ baris SQL
- Berwarna (syntax highlighted)
- Ready untuk di-Run

---

### STEP 4: Execute SQL (1 min)

**Instruksi**:
```
1. Klik tombol "Run" (hijau, di kanan atas)
   ATAU
   Tekan Ctrl+Enter
2. Tunggu query execute (15-30 detik)
3. Lihat hasil di bawah
```

**Expected Output**:

```
✅ Query executed successfully
   Rows affected: 5 (profiles insert)

✅ Query executed successfully
   Rows affected: 8 (relationships insert)

✅ Query executed successfully
   Results: 5 rows returned (verification query 1)

✅ Query executed successfully
   Results: 8 rows returned (verification query 2)

... (lebih banyak verification results)
```

**Jika Error**:
- Lihat pesan error di bawah
- Common errors:
  - "relation already exists" = profiles sudah ada (OK, skip)
  - "permission denied" = user role tidak tepat (contact Supabase support)
  - "syntax error" = copy-paste error (re-do dari file)

---

### STEP 5: Review Verification Results (5 min)

**Pada akhir execution, akan muncul 6 verification queries hasil**:

#### Query 1: All Profiles
```
Expected: 5 baris
id                  | nama_lengkap      | gender       | urutan
uuid1...            | Ahmad Sukata      | Laki-laki    | 1
uuid2...            | Siti Nurhaliza    | Perempuan    | 2
uuid3...            | Putri Indah       | Perempuan    | 3
uuid4...            | Bambang Sukata    | Laki-laki    | 4
uuid5...            | Dewi Sukata       | Perempuan    | 5
```

✅ **Status**: Semua 5 profiles ada ✓

#### Query 2: All Relationships
```
Expected: 8 baris
spouse:  Ahmad ↔ Siti
spouse:  Ahmad ↔ Putri
parent_child: Ahmad → Bambang
parent_child: Siti → Bambang
parent_child: Ahmad → Dewi
parent_child: Putri → Dewi
```

✅ **Status**: Semua 8 relationships ada ✓

#### Query 3: Spouse Relationships
```
Expected: 2 baris (2 pairs)
Ahmad-Siti: 2 (bidirectional)
Ahmad-Putri: 2 (bidirectional)
```

✅ **Status**: Poligami terstruktur dengan benar ✓

#### Query 4: Parent-Child Relationships
```
Expected: 4 baris
Ahmad → Bambang
Siti → Bambang
Ahmad → Dewi
Putri → Dewi
```

✅ **Status**: Semua parent-child relationships ada ✓

#### Query 5: Children with 2 Parents Each
```
Expected: 2 baris
Bambang: 2 parents (Ahmad Laki-laki, Siti Perempuan)
Dewi: 2 parents (Ahmad Laki-laki, Putri Perempuan)
```

✅ **Status**: Setiap anak punya exactly 2 parents ✓

#### Query 6: Totals
```
Expected:
total_profiles: 5
spouse_relationships: 4
parent_child_relationships: 4
total_relationships: 8
```

✅ **Status**: Semua count match expected values ✓

---

### STEP 6: Refresh Webapp (1 min)

**Instruksi**:
```
1. Buka browser ke: index.html
   (Local: file:///d:/Sukata/index.html)
2. Refresh halaman: F5 atau Ctrl+Shift+R (hard refresh)
3. Tunggu sampai muncul "Pohon keluarga" (tidak loading)
```

**Expected**:
- Header: "5 anggota" (di kanan)
- Tree: Tampil 5 node (Ahmad di tengah, Siti & Putri di samping, Bambang & Dewi di bawah)
- Warna: Ahmad & Bambang hijau (male), Siti & Putri & Dewi pink (female)
- Status: "Pohon keluarga siap dijelajahi"

---

## ✅ Verification Checklist

### A. Data Input Verification

- [ ] Supabase SQL Editor buka tanpa error
- [ ] FASE3_TEST_DATA.sql copy-paste berhasil
- [ ] SQL Execute tanpa error
- [ ] Query 1: 5 profiles returned
- [ ] Query 2: 8 relationships returned
- [ ] Query 3: 2 spouse pairs (bidirectional)
- [ ] Query 4: 4 parent-child relationships
- [ ] Query 5: Each child has 2 parents
- [ ] Query 6: All totals match

### B. Tree Rendering Verification

- [ ] Webapp refresh tanpa error
- [ ] 5 anggota muncul di header
- [ ] Ahmad muncul di center/root
- [ ] Siti + Putri muncul sebagai spouses
- [ ] Bambang + Dewi muncul sebagai children
- [ ] Warna gender apply (hijau = male, pink = female)
- [ ] Relationships visible (garis connecting nodes)
- [ ] No error message di tree area

### C. Functionality Tests

- [ ] **Search "Ahmad"**: Temukan 3 results (Ahmad, Bambang, Dewi)
- [ ] **Search "Siti"**: Temukan 1 result (Siti)
- [ ] **Search "Jakarta"**: Temukan 2 results (Ahmad, Bambang)
- [ ] **Search "1970"**: Temukan 1 result (Bambang)
- [ ] **Click Ahmad card**: Detail modal muncul, tampil nama, gender, tahun
- [ ] **Click Bambang card**: Detail tampil parents (Ahmad, Siti)
- [ ] **Zoom in button**: Tree besar
- [ ] **Zoom out button**: Tree kecil
- [ ] **Center button**: Ahmad di tengah
- [ ] **Drag tree**: Bisa pan/scroll

### D. Authentication Tests

- [ ] **Click Login button**: Login dialog muncul
- [ ] **Enter email + password**: Bisa input (tapi belum ada admin user, akan fail)
- [ ] **Close dialog**: Bisa tutup dengan X atau outside click
- [ ] **Admin panel**: Tidak muncul (hanya jika login)

---

## ⚠️ Troubleshooting

### Problem 1: SQL Execute Error

**Symptom**: Pesan error saat click "Run"

**Possible Causes**:
- Duplicate data (profiles/relationships sudah ada)
- SQL syntax error
- Copy-paste error

**Solution**:
```
Option A: Delete existing data first
  DELETE FROM relationships;
  DELETE FROM profiles;
  
Then run FASE3_TEST_DATA.sql again

Option B: Manually check SQL
  Copy-paste langsung dari file
  Tidak ada typo
```

---

### Problem 2: Tree Tidak Muncul (Blank)

**Symptom**: Webapp load tapi tree kosong / "Belum ada data"

**Possible Causes**:
- Data belum insert ke Supabase
- Query profiles gagal
- Supabase connection error

**Solution**:
```
1. Check browser console (F12)
   Lihat error message
   
2. Verify data di Supabase:
   SELECT COUNT(*) FROM profiles;
   
3. Check RLS policies:
   Pastikan public READ policy active
   
4. Clear browser cache:
   Ctrl+Shift+Delete → Clear all
   Refresh webpage
```

---

### Problem 3: Tree Render Tapi Tangled/Salah Struktur

**Symptom**: Tree tampil tapi hubungan salah/berantakan

**Possible Causes**:
- Relationships tidak lengkap
- Parent-child direction salah
- Spouse bidirectional missing

**Solution**:
```
1. Verify relationships di Supabase:
   SELECT * FROM relationships ORDER BY type;
   
2. Check spouse bidirectional:
   SELECT * FROM relationships WHERE type = 'spouse';
   (Should have 4 rows: Ahmad→Siti, Siti→Ahmad, Ahmad→Putri, Putri→Ahmad)
   
3. Check parent-child:
   SELECT * FROM relationships WHERE type = 'parent_child';
   (Should have 4 rows: Ahmad→Bambang, Siti→Bambang, Ahmad→Dewi, Putri→Dewi)
   
4. If missing, insert manually:
   INSERT INTO relationships (person_a_id, person_b_id, type)
   VALUES ('<uuid_a>', '<uuid_b>', 'spouse|parent_child');
```

---

### Problem 4: Search Tidak Berfungsi

**Symptom**: Search input ada tapi hasil tidak muncul

**Possible Causes**:
- Tree belum render sepenuhnya
- JavaScript error di browser
- Search logic bug

**Solution**:
```
1. Wait untuk tree fully load (10+ detik)
2. Check browser console (F12 → Console)
3. Click profile dulu, baru coba search
4. Refresh halaman dan coba lagi
```

---

### Problem 5: Login Dialog Error

**Symptom**: Klik Login → error message

**Note**: Ini EXPECTED karena admin user belum ada di Supabase Auth

**Solution**: 
```
Untuk testing login functionality:
1. Buka Supabase Dashboard
2. Navigate: Authentication → Users
3. Tambah user baru dengan email + password
4. Kembali ke webapp
5. Click Login → enter email + password
6. Should login successfully, admin panel muncul
```

---

## 📊 Expected Final State

```
SUPABASE DATABASE
├─ profiles table
│  ├─ Ahmad Sukata (M, 1945, Jakarta, is_root=true)
│  ├─ Siti Nurhaliza (F, 1950, Bandung)
│  ├─ Putri Indah (F, 1955, Surabaya)
│  ├─ Bambang Sukata (M, 1970, Jakarta)
│  └─ Dewi Sukata (F, 1975, Yogyakarta)
│
└─ relationships table
   ├─ Ahmad ↔ Siti (spouse, bidirectional)
   ├─ Ahmad ↔ Putri (spouse, bidirectional)
   ├─ Ahmad → Bambang (parent_child)
   ├─ Siti → Bambang (parent_child)
   ├─ Ahmad → Dewi (parent_child)
   └─ Putri → Dewi (parent_child)

WEBAPP DISPLAY
├─ Header: "5 anggota"
├─ Tree:
│  ├─ Ahmad (root, green)
│  │  ├─ marriage line to Siti
│  │  ├─ marriage line to Putri
│  │  ├─ child line to Bambang
│  │  └─ child line to Dewi
│  ├─ Siti (pink)
│  │  └─ child line to Bambang
│  ├─ Putri (pink)
│  │  └─ child line to Dewi
│  ├─ Bambang (green)
│  │  └─ parent lines from Ahmad + Siti
│  └─ Dewi (pink)
│     └─ parent lines from Ahmad + Putri
│
└─ Features Working:
   ├─ Search by name ✓
   ├─ Search by location ✓
   ├─ Search by year ✓
   ├─ Member detail cards ✓
   ├─ Tree controls (zoom, pan, center) ✓
   └─ Auth UI (login button) ✓
```

---

## 📝 Next Steps (After FASE 3)

### If All Verified ✅
→ Go to **FASE 4: Validation & Testing**
- Run full test suite
- Test with more data (50+ profiles)
- Performance benchmarks
- Accessibility audit

### If Issues Found ❌
→ Debug and fix in FASE 3
- Check Supabase data
- Verify tree rendering logic
- Fix any bugs in webapp

### To Add More Test Data
→ Use Supabase SQL Editor
- Insert more profiles
- Add more relationships
- Test larger tree structures

---

## ⏱️ Timing

- **Actual Data Input**: ~2 minutes
- **Verification Queries**: ~3 minutes
- **Webapp Testing**: ~15-20 minutes
- **Troubleshooting** (if needed): +10-30 minutes
- **TOTAL**: 20-60 minutes

---

## ✨ Success!

When all verification checklist items are ✅, you've successfully completed **FASE 3**!

**Achievement Unlocked**: Data Input & Tree Rendering Working! 🎉

---

**Status After FASE 3**: 67% Project Complete (5/7 FASEs done)

**Next Phase**: FASE 4 - Validation & Testing

---

Good luck! Let me know when done! 🚀
