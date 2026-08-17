const SUPABASE_URL = "https://dxcuuuwfhhaorjlihlgt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Y3V1dXdmaGhhb3JqbGlobGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDYyMjYsImV4cCI6MjEwMjUyMjIyNn0.YLivaX2IxSuMvnwP1V79JuaaeXBLL91hj7LoooDzFpY";
const STORAGE_BUCKET = "fotos";
const ADMIN_EMAIL = "admin@demo.com";

function isAdminUser(user) {
  return String(user?.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App Configuration
const REQUEST_TIMEOUT_MS = 20000;
const BANNER_STORAGE_KEY = "silsilah-demo-dismissed";
const genderMap = {
  M: "Laki-laki",
  F: "Perempuan",
  "Laki-laki": "Laki-laki",
  Perempuan: "Perempuan",
  male: "Laki-laki",
  female: "Perempuan"
};