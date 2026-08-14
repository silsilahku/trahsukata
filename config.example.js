// ============================================
// Trah Sukata - Supabase Configuration Template
// ============================================
// Salin file ini menjadi "config.js" dan ganti nilai di bawah
// dengan kredensial project Supabase Anda.
//
// config.js INI TIDAK AKAN TER-KOMMIT ke GitHub
// (sudah ada di .gitignore) — jangan pernah commit config.js asli!
// ============================================

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";
const STORAGE_BUCKET = "fotos";
const ADMIN_EMAIL = "trah@sukata.com";

function isAdminUser(user) {
  return String(user?.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App Configuration
const REQUEST_TIMEOUT_MS = 20000;
const BANNER_STORAGE_KEY = "trah-sukata-instruction-dismissed";
const genderMap = {
  M: "Laki-laki",
  F: "Perempuan",
  "Laki-laki": "Laki-laki",
  Perempuan: "Perempuan",
  male: "Laki-laki",
  female: "Perempuan"
};
