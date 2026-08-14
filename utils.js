const elements = {
  // Existing elements
  stage: document.getElementById("tree-stage"),
  tree: document.getElementById("tree"),
  treeState: document.getElementById("tree-state"),
  asyncNote: document.getElementById("async-note"),
  memberCount: document.getElementById("member-count"),
  lastUpdated: document.getElementById("last-updated"),
  banner: document.getElementById("instruction-banner"),
  bannerClose: document.getElementById("instruction-close"),
  helpButton: document.getElementById("help-button"),
  listButton: document.getElementById("list-button"),
  memberDialog: document.getElementById("member-dialog"),
  memberDialogCard: document.querySelector("#member-dialog .dialog-card"),
  memberDialogClose: document.getElementById("member-dialog-close"),
  memberDialogTitle: document.getElementById("member-dialog-title"),
  memberDialogMeta: document.getElementById("member-dialog-meta"),
  profileAvatar: document.getElementById("profile-avatar"),
  memberDialogContent: document.getElementById("member-dialog-content"),
  memberListDialog: document.getElementById("member-list-dialog"),
  memberListClose: document.getElementById("member-list-close"),
  memberListSearch: document.getElementById("member-list-search"),
  memberListResults: document.getElementById("member-list-results"),
  memberListContent: document.getElementById("member-list-content"),
  memberListEmpty: document.getElementById("member-list-empty"),
  liveRegion: document.getElementById("live-region"),
  // Auth elements
  authContainer: document.getElementById("auth-container"),
  loginButton: document.getElementById("login-button"),
  loginDialog: document.getElementById("login-dialog"),
  loginDialogClose: document.getElementById("login-dialog-close"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginSubmit: document.getElementById("login-submit"),
  loginEmailError: document.getElementById("login-email-error"),
  loginPasswordError: document.getElementById("login-password-error"),
  loginGeneralError: document.getElementById("login-general-error"),
  adminPanel: document.getElementById("admin-panel"),
  adminPanelClose: document.getElementById("admin-panel-close"),
  addProfileButton: document.getElementById("add-profile-button"),
  manageRelationshipsButton: document.getElementById("manage-relationships-button"),
  relationshipsDialog: document.getElementById("relationships-dialog"),
  relationshipsDialogClose: document.getElementById("relationships-dialog-close"),
  relationshipForm: document.getElementById("relationship-form"),
  relPersonA: document.getElementById("rel-person-a"),
  relPersonB: document.getElementById("rel-person-b"),
  relType: document.getElementById("rel-type"),
  relSubmit: document.getElementById("rel-submit"),
  relPersonAError: document.getElementById("rel-person-a-error"),
  relPersonBError: document.getElementById("rel-person-b-error"),
  relTypeError: document.getElementById("rel-type-error"),
  relGeneralError: document.getElementById("rel-general-error"),
  relationshipsList: document.getElementById("relationships-list"),
  relSearchInput: document.getElementById("rel-search-input"),
  // Add profile elements
  addProfileDialog: document.getElementById("add-profile-dialog"),
  addProfileDialogClose: document.getElementById("add-profile-dialog-close"),
  addProfileForm: document.getElementById("add-profile-form"),
  addProfileSubmit: document.getElementById("add-profile-submit"),
  addProfileGeneralError: document.getElementById("add-profile-general-error"),
  addProfileNamaLengkapError: document.getElementById("new-profile-nama-lengkap-error"),
  addProfileNamaPanggilanError: document.getElementById("new-profile-nama-panggilan-error"),
  addProfileGenderError: document.getElementById("new-profile-gender-error"),
  addProfileTahunLahirError: document.getElementById("new-profile-tahun-lahir-error"),
  addProfileTahunWafatError: document.getElementById("new-profile-tahun-wafat-error"),
  addProfileDomisiliError: document.getElementById("new-profile-domisili-error"),
  addProfileBioError: document.getElementById("new-profile-bio-error"),
  // Member dialog edit elements
  memberDialogSaveRel: document.getElementById("member-dialog-save-rel"),
  memberDialogFooterHint: document.getElementById("member-dialog-footer-hint"),
  memberDialogFooterView: document.getElementById("member-dialog-footer-view"),
  memberDialogDeletePerson: document.getElementById("member-dialog-delete-person"),
  memberDialogDeleteError: document.getElementById("member-dialog-delete-error"),
  memberDialogEditProfile: document.getElementById("member-dialog-edit-profile"),
  memberDialogSaveProfile: document.getElementById("member-dialog-save-profile"),
  memberDialogCancelEdit: document.getElementById("member-dialog-cancel-edit"),
  logoutButton: document.getElementById("logout-button"),
  addProfilePhoto: document.getElementById("new-profile-photo"),
  addPhotoPreview: document.getElementById("add-photo-preview"),
  addPhotoRemove: document.getElementById("add-photo-remove"),
  addPhotoError: document.getElementById("new-profile-photo-error"),
  memberPhotoInput: document.getElementById("member-photo-input"),
  memberPhotoPreview: document.getElementById("dialog-photo-preview"),
  memberPhotoRemove: document.getElementById("member-photo-remove"),
  memberPhotoError: document.getElementById("member-photo-error"),
  confirmDialog: document.getElementById("confirm-dialog"),
  confirmDialogMessage: document.getElementById("confirm-dialog-message"),
  confirmDialogOk: document.getElementById("confirm-dialog-ok"),
  confirmDialogCancel: document.getElementById("confirm-dialog-cancel"),
  confirmDialogClose: document.getElementById("confirm-dialog-close")
};

const runtime = {
  status: "loading",
  nodes: [],
  searchResults: [],
  searchActiveIndex: -1,
  searchQuery: "",
  selectedPerson: null,
  activeDialog: null,
  familyTree: null,
  lastFocusedElement: null,
  activeController: null,
  statusObserver: null,
  focusedMemberTimer: null,
  requestId: 0,
  // Auth state
  user: null,
  isAdmin: false,
  // Relationship editing state
  editingPerson: null,
  addProfileCallback: null,
  adminPanelWasVisible: false
};

function safeValue(value, fallback = "Belum dicatat") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function processFoto(url) {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const parsed = new URL(url.trim(), window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (error) {
    return "";
  }
}

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validatePhotoFile(file) {
  if (!file) return "Pilih foto terlebih dahulu";
  if (file.size > MAX_PHOTO_SIZE) return "Ukuran foto maksimal 2MB";
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Format foto harus JPG, PNG, atau WebP";
  }
  return null;
}

async function uploadPhoto(file, personId) {
  if (!file || !personId) return null;

  const validationError = validatePhotoFile(file);
  if (validationError) throw new Error(validationError);

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${personId}/profile.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabaseClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return {
    foto_path: path,
    foto_url: publicData?.publicUrl || ""
  };
}

function getDisplayName(person) {
  return safeValue(person && (person.nama_panggilan || person.nama_lengkap || person.name), "Belum dicatat");
}

function getFullName(person) {
  return safeValue(person && (person.nama_lengkap || person.nama_panggilan || person.name), "Belum dicatat");
}

function getInitials(name) {
  const words = safeValue(name, "?").split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function formatGender(value) {
  return genderMap[value] || safeValue(value);
}

function formatLifespan(person) {
  const birth = safeValue(person && person.tahun_lahir, "");
  const death = safeValue(person && person.tahun_wafat, "");
  if (birth && death) return `${birth} — ${death}`;
  if (birth) return `${birth} — sekarang`;
  if (death) return `Wafat ${death}`;
  return "Belum dicatat";
}

function formatStatus(person) {
  if (safeValue(person && person.tahun_wafat, "")) return "Sudah berpulang";
  if (safeValue(person && person.tahun_lahir, "")) return "Masih bersama kita";
  return "Belum dicatat";
}

function calculateAge(tahunLahir) {
  const birth = Number(tahunLahir);
  if (!Number.isFinite(birth) || birth <= 0) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  return currentYear - birth;
}

function getStatusClass(person) {
  const status = formatStatus(person);
  if (status === "Sudah berpulang") return "is-deceased";
  if (status === "Masih bersama kita") return "is-alive";
  return "is-unknown";
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getMemberSearchText(person) {
  const age = calculateAge(person && person.tahun_lahir);
  return normalizeSearchText([
    getDisplayName(person),
    person && person.nama_lengkap,
    person && person.nama_panggilan,
    person && person.domisili,
    person && person.tahun_lahir,
    person && person.tahun_wafat,
    age !== null ? `${age} tahun` : "",
    person && person.usia_saat_ini
  ].join(" "));
}

function formatSearchCount(count, total, query) {
  if (!query) return `${total} anggota tersedia`;
  return `${count} anggota ditemukan`;
}

function announce(message) {
  elements.liveRegion.textContent = "";
  window.setTimeout(() => {
    elements.liveRegion.textContent = message;
  }, 20);
}
