const SUPABASE_URL = "https://dokmqzakcjmtoncljkik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva21xemFrY2ptdG9uY2xqa2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDQ5OTIsImV4cCI6MjEwMjA4MDk5Mn0.8adGIEFs1HvsLe8jKmACMqwQT0WtraYa9UU3UL1gJvU";
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
