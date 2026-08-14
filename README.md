# Trah Sukata

A family tree web application for the "Sukata" family. This is a **static web app** built with vanilla JavaScript, [Supabase](https://supabase.com/) (for the backend/database/storage), and a custom family-tree rendering engine (`tree.js`). Visitors can browse the family tree in read-only mode; authenticated admins can add/edit/delete family members, manage relationships, and upload photos.

## 📋 Ringkasan Proyek

| Aspek | Detail |
|--------|--------|
| **Tipe** | Static web app (HTML + CSS + vanilla JS) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Render Pohon** | Custom JS (`tree.js`) |
| **Auth** | Supabase Auth (admin-only: `trah@sukata.com`) |
| **Bahasa UI** | Indonesia |

## 🚀 Quick Start

1. Buka `index.html` di browser — aplikasi otomatis terhubung ke project Supabase yang dikonfigurasi di `config.js`.
2. **Jelajah pohon**: Klik node pohon atau tombol "Daftar Anggota" untuk melihat detail anggota.
3. **Login admin**: Klik tombol "Login", masukkan kredensial `trah@sukata.com`, lalu gunakan panel admin untuk mengelola anggota, relasi, dan foto.
4. **Setup database**: Jalankan `SQL_FASE1_EXECUTE.sql` di Supabase SQL Editor (ikuti panduan fase di bawah).

## 📁 Struktur File

| File | Tujuan |
|------|---------|
| `index.html` | Markup HTML utama (dialogs, forms, tree container) |
| `app.js` | Inisialisasi aplikasi, event wiring, setup Supabase |
| `utils.js` | Helper bersama (DOM refs, formatting, photo upload, validation) |
| `dialogs.js` | Logika UI untuk semua dialog/menu (member list, detail, relationships, auth) |
| `tree.js` | Engine render pohon keluarga |
| `style.css` | Semua styles |
| `config.js` | Konfigurasi Supabase (URL, anon key, bucket name) |
| `SQL_FASE1_EXECUTE.sql` | **Master** script setup database + RLS + storage |
| `SQL_STORAGE_POLICIES.sql` | Referensi storage policies (terintegrasi dalam FASE1) |
| `FASE*_*.md` | Panduan setup dan penggunaan per fase |

## 📖 Panduan Fase

- **Fase 1** — Setup database (tabel, RLS, storage policies). Lihat `FASE1_DATABASE_SETUP.md` dan `SQL_FASE1_EXECUTE.sql`.
- **Fase 2** — Implementasi aplikasi. Lihat `FASE2_IMPLEMENTATION_SUMMARY.md`.
- **Fase 3** — Input data & verifikasi web app. Lihat `FASE3_*.md`.
- **Fase 4** — Validasi & testing. Lihat `FASE4_VALIDATION_TESTING.md`.

---

## Daftar Validasi di Webapp

Berikut adalah semua validasi yang diberlakukan di aplikasi Trah Sukata, dibagi per layer:

---

## 1. Database Constraints (PostgreSQL/Supabase)

### Tabel profiles
- nama_lengkap — NOT NULL
- gender — NOT NULL + CHECK (gender IN ('Laki-laki', 'Perempuan'))
- id — PRIMARY KEY (UUID)

### Tabel relationships
- person_a_id — NOT NULL + foreign key ke profiles(id) dengan ON DELETE CASCADE
- person_b_id — NOT NULL + foreign key ke profiles(id) dengan ON DELETE CASCADE
- type — NOT NULL + CHECK (type IN ('parent_child', 'spouse'))
- no_self_reference — constraint CHECK (person_a_id != person_b_id) (tidak bisa relasi ke diri sendiri)
- UNIQUE(person_a_id, person_b_id, type) — tidak boleh duplikat relasi jenis yang sama antara 2 orang yang sama

---

## 2. Storage Policies (bucket fotos)

- Public read — siapa pun bisa melihat foto
- Authenticated insert/update/delete — hanya admin yang login bisa upload, edit, hapus foto
- Bucket restriction — policies hanya berlaku untuk bucket fotos

---

## 3. Frontend Form Validations

### A. Form Tambah Anggota (handleAddProfile)
- Nama lengkap — harus diisi
- Jenis kelamin — harus diisi
- Tahun lahir — jika diisi, harus antara 1900-2100
- Tahun wafat — jika diisi, harus antara 1900-2100
- Tahun wafat vs tahun lahir — tahun wafat harus setelah tahun lahir
- Foto — opsional, tapi jika diupload:
  - Maksimal 2MB
  - Hanya format JPG, PNG, WebP

### B. Form Tambah Relasi (handleAddRelationship)
- Anggota A — harus dipilih
- Jenis relasi — harus dipilih
- Anggota B — harus dipilih
- Anggota A != Anggota B — tidak boleh relasi ke diri sendiri
- Jenis kelamin orang tua — jika relasi parent_child, Anggota A (orang tua) harus sudah punya data jenis kelamin

---

## 4. Business Logic Validations

### A. Hapus Anggota (handleDeletePerson)
- Tidak bisa hapus jika masih ada relasi — dicek via checkPersonHasRelationships()
- Konfirmasi required — custom confirm dialog sebelum hapus

### B. Simpan Relasi di Detail Dialog (saveMemberRelationships)
- Bapak dan ibu harus sudah terdaftar sebagai pasangan — dicek via validateParentsAreSpouses()
- Tidak boleh ada __add_new__ — jika dropdown "Tambah baru" masih aktif, harus selesaikan penambahan anggota dulu
- Validasi gender orang tua — untuk parent_child, Anggota A harus punya gender

### C. Upload Foto (uploadPhoto)
- File harus ada — if (!file || !personId) return null
- Ukuran maksimal 2MB
- Format hanya JPG/PNG/WebP

### D. Hapus Foto (handleDeleteMemberPhoto)
- Konfirmasi required — custom confirm dialog
- Menghapus file dari storage — berdasarkan person.foto_path
- Mengosongkan foto_path dan foto_url di database

---

## 5. Authentication & Authorization Validations

- Login — email dan password harus diisi
- Admin only actions:
  - Tambah anggota
  - Hapus anggota
  - Tambah relasi
  - Hapus relasi
  - Upload/edit/hapus foto
  - Kelola relasi di detail dialog
- Public access — hanya baca (SELECT) untuk profiles, relationships, dan foto publik

---

## 6. RLS Policies (Row Level Security)

- profiles: public read, authenticated insert/update/delete
- relationships: public read, authenticated insert/update/delete
- storage.objects (fotos): public read, authenticated insert/update/delete

---

## 7. UI-Level Guards

- Tombol admin disembunyikan jika belum login (runtime.isAdmin = false)
- Dialog edit relasi hanya muncul jika admin login
- Kontrol upload foto hanya muncul di detail anggota jika admin login
- Error messages ditampilkan di elemen error spesifik per field

---

## Ringkasan Validasi yang Belum Ada

Yang tidak divalidasi:
- Duplikat nama anggota (boleh ada nama sama)
- Tahun lahir vs tahun wafat untuk relasi orang tua-anak
- Validasi usia/logika keluarga lain selain spouse untuk parent_child
- Limit jumlah relasi per orang
