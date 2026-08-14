function detailValue(label, value) {
  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <strong class="detail-value" title="${escapeHtml(safeValue(value))}">${escapeHtml(safeValue(value))}</strong>
    </div>
  `;
}

function familyValue(label, value) {
  return `
    <li>
      <span class="family-list-label">${escapeHtml(label)}</span>
      <strong class="family-list-value">${escapeHtml(safeValue(value))}</strong>
    </li>
  `;
}

function familyPersonRow(label, person) {
  const name = getDisplayName(person);
  if (!name || name === "Belum dicatat") {
    return familyValue(label, "Belum dicatat");
  }
  return `
    <li>
      <span class="family-list-label">${escapeHtml(label)}</span>
      <button type="button" class="family-list-link" data-related-id="${escapeHtml(String(person.id))}">${escapeHtml(name)}</button>
    </li>
  `;
}

function resolvePerson(person) {
  if (!person) return null;
  const match = runtime.nodes.find((node) => String(node.id) === String(person.id));
  return match || person;
}

function renderMemberList(query = "") {
  runtime.searchQuery = query;
  runtime.searchResults = runtime.nodes.filter((person) => {
    const normalizedQuery = normalizeSearchText(query);
    return !normalizedQuery || getMemberSearchText(person).includes(normalizedQuery);
  });
  runtime.searchActiveIndex = -1;
  elements.memberListSearch.value = query;
  elements.memberListSearch.removeAttribute("aria-activedescendant");
  elements.memberListResults.textContent = formatSearchCount(runtime.searchResults.length, runtime.nodes.length, normalizeSearchText(query));
  elements.memberListEmpty.hidden = runtime.searchResults.length !== 0;
  elements.memberListContent.hidden = runtime.searchResults.length === 0;

  if (!runtime.searchResults.length) {
    elements.memberListContent.innerHTML = "";
    return;
  }

  elements.memberListContent.innerHTML = runtime.searchResults.map((person, index) => `
    <button
      class="member-list-item"
      id="member-result-${index}"
      type="button"
      role="option"
      aria-selected="false"
      data-member-index="${index}"
      aria-label="Lihat detail ${escapeHtml(getDisplayName(person))}"
    >
      ${avatarMarkup(person, "list-avatar")}
      <span>
        <strong class="member-list-name">${escapeHtml(getDisplayName(person))}</strong>
        <small class="member-list-meta">${escapeHtml(formatLifespan(person))} · ${escapeHtml(safeValue(person.domisili, "Domisili belum dicatat"))}</small>
      </span>
      <i class="ti ti-chevron-right" aria-hidden="true"></i>
    </button>
  `).join("");

  elements.memberListContent.querySelectorAll("[data-member-index]").forEach((button) => {
    button.addEventListener("click", () => selectMemberResult(Number(button.dataset.memberIndex)));
  });
}

function updateSearchActiveResult(index) {
  if (!runtime.searchResults.length) return;
  const total = runtime.searchResults.length;
  runtime.searchActiveIndex = ((index % total) + total) % total;
  const resultButtons = [...elements.memberListContent.querySelectorAll("[data-member-index]")];

  resultButtons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === runtime.searchActiveIndex;
    button.classList.toggle("is-keyboard-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  const activeButton = resultButtons[runtime.searchActiveIndex];
  if (!activeButton) return;
  elements.memberListSearch.setAttribute("aria-activedescendant", activeButton.id);
  activeButton.scrollIntoView({ block: "nearest" });
  elements.memberListResults.textContent = `${formatSearchCount(runtime.searchResults.length, runtime.nodes.length, runtime.searchQuery)} · Gunakan Enter untuk memilih`;
}

function onSearchKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    updateSearchActiveResult(runtime.searchActiveIndex + 1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    updateSearchActiveResult(runtime.searchActiveIndex <= 0 ? runtime.searchResults.length - 1 : runtime.searchActiveIndex - 1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (runtime.searchActiveIndex >= 0) {
      selectMemberResult(runtime.searchActiveIndex);
    } else if (runtime.searchResults.length === 1) {
      selectMemberResult(0);
    } else if (runtime.searchResults.length > 1) {
      announce("Gunakan tombol panah untuk memilih anggota.");
    }
  }
}

const MEMBER_FOCUS_EFFECT_MS = 5000;

function highlightFocusedMember(person) {
  if (runtime.focusedMemberTimer) window.clearTimeout(runtime.focusedMemberTimer);

  elements.tree.classList.remove("is-member-focus");
  elements.tree.querySelectorAll(".is-focus-target").forEach((node) => {
    node.classList.remove("is-focus-target");
  });

  const target = [...elements.tree.querySelectorAll("[data-n-id]")]
    .find((node) => String(node.dataset.nId) === String(person.id));
  if (!target) return;

  // Restart the animation when the same member is selected repeatedly.
  void target.getBoundingClientRect();
  elements.tree.classList.add("is-member-focus");
  target.classList.add("is-focus-target");
  runtime.focusedMemberTimer = window.setTimeout(() => {
    elements.tree.classList.remove("is-member-focus");
    target.classList.remove("is-focus-target");
    runtime.focusedMemberTimer = null;
  }, MEMBER_FOCUS_EFFECT_MS);
}

function focusMember(person, returnTarget, { openDetails = true } = {}) {
  const resolvedPerson = resolvePerson(person);
  if (!resolvedPerson) return;
  const onCentered = () => {
    highlightFocusedMember(resolvedPerson);
    announce("Anggota dipusatkan di pohon keluarga.");
    if (openDetails) showDetailModal(resolvedPerson, returnTarget);
  };

  if (runtime.familyTree && typeof runtime.familyTree.center === "function") {
    try {
      runtime.familyTree.center(resolvedPerson.id, {
        horizontal: true,
        vertical: true
      }, onCentered);
    } catch (error) {
      onCentered();
    }
  } else {
    onCentered();
  }
}

function selectMemberResult(index) {
  const person = runtime.searchResults[index];
  if (!person) return;
  const returnTarget = runtime.lastFocusedElement || elements.listButton;
  closeDialog("list", { restoreFocus: false });
  focusMember(person, returnTarget, { openDetails: false });
}

const RELATIONSHIP_ADD_NEW_VALUE = "__add_new__";

function getSortedRelationshipMembers(excludedPersonId) {
  return runtime.nodes
    .filter((node) => String(node.id) !== String(excludedPersonId))
    .sort((a, b) => {
      const nameOrder = getFullName(a).localeCompare(getFullName(b), "id", { sensitivity: "base" });
      return nameOrder || String(a.id).localeCompare(String(b.id));
    });
}

function getRelationshipSearchText(person) {
  return normalizeSearchText([
    getFullName(person),
    getDisplayName(person)
  ].join(" "));
}

function relationshipComboboxMarkup(field, value = "", excludedPersonId = "", {
  hiddenId = `rel-edit-${field}`,
  inputId = `rel-edit-${field}-input`,
  listboxId = `rel-edit-${field}-listbox`,
  label = field,
  includeAddNew = true,
  returnDialog = "member"
} = {}) {
  const selectedPerson = runtime.nodes.find((node) => String(node.id) === String(value));
  const selectedLabel = selectedPerson ? getFullName(selectedPerson) : "";

  return `
    <div class="rel-edit-combobox" data-field="${escapeHtml(field)}" data-excluded-id="${escapeHtml(String(excludedPersonId))}" data-selected-label="${escapeHtml(selectedLabel)}" data-include-add-new="${String(includeAddNew)}" data-return-dialog="${escapeHtml(returnDialog)}" data-active-index="-1">
      <input type="hidden" id="${escapeHtml(hiddenId)}" value="${escapeHtml(value || "")}" data-field="${escapeHtml(field)}">
      <input
        class="rel-edit-input"
        id="${escapeHtml(inputId)}"
        type="search"
        value="${escapeHtml(selectedLabel)}"
        placeholder="Cari nama anggota..."
        autocomplete="off"
        spellcheck="false"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="${escapeHtml(listboxId)}"
        aria-expanded="false"
        aria-label="Cari anggota untuk ${escapeHtml(label)}"
        aria-required="true"
      >
      <button class="rel-edit-clear" type="button" aria-label="Hapus pencarian anggota" hidden>
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
      <div class="rel-edit-listbox" id="${escapeHtml(listboxId)}" role="listbox" aria-label="Pilihan anggota untuk ${escapeHtml(label)}" hidden></div>
    </div>
  `;
}

function syncRelationshipClearButton(combobox) {
  const input = combobox?.querySelector(".rel-edit-input");
  const clearButton = combobox?.querySelector(".rel-edit-clear");
  if (!input || !clearButton) return;
  clearButton.hidden = !(combobox.classList.contains("is-open") && input.value);
}

function updateRelationshipComboboxPlacement(combobox) {
  const input = combobox?.querySelector(".rel-edit-input");
  const listbox = combobox?.querySelector(".rel-edit-listbox");
  const scrollContainer = combobox?.closest(".dialog-content");
  if (!input || !listbox || !scrollContainer || !combobox.classList.contains("is-open")) return;

  const inputRect = input.getBoundingClientRect();
  const listboxRect = listbox.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const spaceBelow = containerRect.bottom - inputRect.bottom;
  const spaceAbove = inputRect.top - containerRect.top;
  const shouldFlip = listboxRect.height > spaceBelow && spaceAbove > spaceBelow;
  combobox.classList.toggle("is-flipped", shouldFlip);
}

function renderRelationshipComboboxOptions(combobox, query = "") {
  const listbox = combobox?.querySelector(".rel-edit-listbox");
  if (!listbox) return;

  const normalizedQuery = normalizeSearchText(query);
  const selectedId = combobox.querySelector('input[type="hidden"]')?.value || "";
  const members = getSortedRelationshipMembers(combobox.dataset.excludedId)
    .filter((person) => !normalizedQuery || getRelationshipSearchText(person).includes(normalizedQuery));

  const options = [`
    <div class="rel-edit-option${selectedId ? "" : " is-selected"}" id="${escapeHtml(`${listbox.id}-empty-value`)}" role="option" aria-selected="${String(!selectedId)}" data-value="">
      Pilih anggota...
    </div>
  `];

  if (!members.length && normalizedQuery) {
    options.push('<div class="rel-edit-empty" role="status">Tidak ada anggota yang cocok.</div>');
  }

  members.forEach((person, index) => {
    const value = String(person.id);
    const selected = value === selectedId;
    options.push(`
      <div
        class="rel-edit-option${selected ? " is-selected" : ""}"
        id="${escapeHtml(`${listbox.id}-member-${index}`)}"
        role="option"
        aria-selected="${String(selected)}"
        data-value="${escapeHtml(value)}"
      >${escapeHtml(getFullName(person))}</div>
    `);
  });

  if (combobox.dataset.includeAddNew !== "false") {
    options.push(`
      <div class="rel-edit-option rel-edit-option--add-new" id="${escapeHtml(`${listbox.id}-add-new`)}" role="option" aria-selected="false" data-value="${RELATIONSHIP_ADD_NEW_VALUE}">
        <span aria-hidden="true">＋</span> Tambah Anggota Baru...
      </div>
    `);
  }

  listbox.innerHTML = options.join("");
  combobox.dataset.activeIndex = "-1";
  const input = combobox.querySelector(".rel-edit-input");
  input?.removeAttribute("aria-activedescendant");
  syncRelationshipClearButton(combobox);
  updateRelationshipComboboxPlacement(combobox);
}

function setupRelationshipComboboxes(container = document) {
  container.querySelectorAll(".rel-edit-combobox").forEach((combobox) => {
    const input = combobox.querySelector(".rel-edit-input");
    const selectedLabel = combobox.dataset.selectedLabel || "";
    if (input) input.value = selectedLabel;
    renderRelationshipComboboxOptions(combobox);
  });
}

function openRelationshipCombobox(combobox) {
  if (!combobox) return;
  document.querySelectorAll(".rel-edit-combobox.is-open").forEach((other) => {
    if (other !== combobox) closeRelationshipCombobox(other);
  });

  const input = combobox.querySelector(".rel-edit-input");
  if (!input) return;
  combobox.classList.add("is-open");
  combobox.querySelector(".rel-edit-listbox")?.removeAttribute("hidden");
  input.setAttribute("aria-expanded", "true");
  input.value = "";
  renderRelationshipComboboxOptions(combobox);
  input.select();
}

function closeRelationshipCombobox(combobox, restoreValue = true) {
  if (!combobox) return;
  const input = combobox.querySelector(".rel-edit-input");
  const listbox = combobox.querySelector(".rel-edit-listbox");
  combobox.classList.remove("is-open", "is-flipped");
  listbox?.setAttribute("hidden", "");
  input?.setAttribute("aria-expanded", "false");
  input?.removeAttribute("aria-activedescendant");
  combobox.dataset.activeIndex = "-1";

  if (restoreValue && input) input.value = combobox.dataset.selectedLabel || "";
  syncRelationshipClearButton(combobox);
}

function updateRelationshipActiveOption(combobox, index) {
  const input = combobox?.querySelector(".rel-edit-input");
  const options = [...(combobox?.querySelectorAll('.rel-edit-option[role="option"]') || [])]
    .filter((option) => option.dataset.value !== "");
  if (!input || !options.length) return;

  const activeIndex = ((index % options.length) + options.length) % options.length;
  combobox.dataset.activeIndex = String(activeIndex);
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === activeIndex;
    option.classList.toggle("is-active", isActive);
  });
  input.setAttribute("aria-activedescendant", options[activeIndex].id);
  options[activeIndex].scrollIntoView({ block: "nearest" });
}

function setRelationshipValue(combobox, value) {
  const hiddenInput = combobox?.querySelector('input[type="hidden"]');
  const input = combobox?.querySelector(".rel-edit-input");
  if (!hiddenInput || !input) return;

  const person = runtime.nodes.find((node) => String(node.id) === String(value));
  const label = person ? getFullName(person) : "";
  hiddenInput.value = person ? String(person.id) : "";
  combobox.dataset.selectedLabel = label;
  input.value = label;
  input.focus({ preventScroll: true });
  closeRelationshipCombobox(combobox);
}

function commitRelationshipOption(combobox, option) {
  if (!combobox || !option) return;
  const value = option.dataset.value || "";

  if (value === RELATIONSHIP_ADD_NEW_VALUE) {
    const input = combobox.querySelector(".rel-edit-input");
    closeRelationshipCombobox(combobox);
    showAddProfileDialog((newPersonId) => {
      setRelationshipValue(combobox, newPersonId);
      runtime.activeDialog = combobox.dataset.returnDialog || "member";
    });
    return;
  }

  setRelationshipValue(combobox, value);
}

function handleRelationshipComboboxKeydown(event) {
  const input = event.target.closest(".rel-edit-input");
  if (!input) return;
  const combobox = input.closest(".rel-edit-combobox");
  if (!combobox) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!combobox.classList.contains("is-open")) openRelationshipCombobox(combobox);
    const currentIndex = Number(combobox.dataset.activeIndex || -1);
    const nextIndex = currentIndex < 0
      ? (event.key === "ArrowDown" ? 0 : -1)
      : currentIndex + (event.key === "ArrowDown" ? 1 : -1);
    updateRelationshipActiveOption(combobox, nextIndex);
    return;
  }

  if (event.key === "Enter") {
    if (!combobox.classList.contains("is-open")) return;
    event.preventDefault();
    const options = [...combobox.querySelectorAll('.rel-edit-option[role="option"]')]
      .filter((option) => option.dataset.value !== "");
    const activeIndex = Number(combobox.dataset.activeIndex || -1);
    if (options[activeIndex]) commitRelationshipOption(combobox, options[activeIndex]);
    return;
  }

  if (event.key === "Escape") {
    if (!combobox.classList.contains("is-open")) return;
    event.preventDefault();
    event.stopPropagation();
    closeRelationshipCombobox(combobox);
    return;
  }

  if (event.key === "Tab") {
    closeRelationshipCombobox(combobox);
  }
}

function showDetailModal(person, returnTarget = document.activeElement) {
  person = resolvePerson(person);
  if (!person) return;
  runtime.selectedPerson = person;
  runtime.editingPerson = person;
  if (returnTarget) runtime.lastFocusedElement = returnTarget;
  runtime.activeDialog = "member";

  const displayName = getDisplayName(person);
  const gender = formatGender(person.gender_label || person.gender);
  const editGender = gender === "Laki-laki" || gender === "Perempuan" ? gender : "";
  const location = safeValue(person.domisili, "Domisili belum dicatat");
  const lifespan = formatLifespan(person);
  const father = person.fid ? runtime.nodes.find((node) => String(node.id) === String(person.fid)) : null;
  const mother = person.mid ? runtime.nodes.find((node) => String(node.id) === String(person.mid)) : null;
  const spouses = (person.pids || [])
    .map((pid) => runtime.nodes.find((node) => String(node.id) === String(pid)))
    .filter(Boolean);

  const isAdmin = runtime.isAdmin;
  const fatherValue = father ? String(father.id) : "";
  const motherValue = mother ? String(mother.id) : "";
  const spouseValue = spouses.length ? String(spouses[0].id) : "";
  const familyRows = [
    ["Bapak", father],
    ["Ibu", mother],
    ["Pasangan", spouses.length ? spouses[0] : null]
  ];

  let familySection = "";
  if (isAdmin) {
    familySection = `
      <section class="dialog-section" aria-labelledby="family-person-title">
        <h3 class="dialog-section-title" id="family-person-title">Keluarga</h3>
        <div class="rel-edit-group">
          <div class="rel-edit-row">
            <label class="rel-edit-label" for="rel-edit-father-input">Nama bapak</label>
            ${relationshipComboboxMarkup("father", fatherValue, person.id)}
            <p class="rel-edit-hint">Ketik nama untuk mencari. Bapak dan ibu harus sudah terdaftar sebagai pasangan.</p>
            <p class="rel-edit-error" id="rel-edit-father-error"></p>
          </div>
          <div class="rel-edit-row">
            <label class="rel-edit-label" for="rel-edit-mother-input">Nama ibu</label>
            ${relationshipComboboxMarkup("mother", motherValue, person.id)}
            <p class="rel-edit-hint">Ketik nama untuk mencari anggota keluarga.</p>
            <p class="rel-edit-error" id="rel-edit-mother-error"></p>
          </div>
          <div class="rel-edit-row">
            <label class="rel-edit-label" for="rel-edit-spouse-input">Pasangan</label>
            ${relationshipComboboxMarkup("spouse", spouseValue, person.id)}
            <p class="rel-edit-hint">Ketik nama untuk mencari pasangan.</p>
            <p class="rel-edit-error" id="rel-edit-spouse-error"></p>
          </div>
          <p class="rel-edit-error" id="rel-edit-general-error"></p>
        </div>
      </section>
    `;
  } else {
    familySection = `
      <section class="dialog-section" aria-labelledby="family-person-title">
        <h3 class="dialog-section-title" id="family-person-title">Keluarga</h3>
        <ul class="family-list">
          ${familyRows.map(([label, value]) => {
            if (Array.isArray(value)) {
              return value.map((person) => familyPersonRow(label, person)).join("");
            }
            return familyPersonRow(label, value);
          }).join("")}
        </ul>
      </section>
    `;
  }

  elements.profileAvatar.outerHTML = avatarMarkup(person, "profile-avatar");
  elements.profileAvatar = document.querySelector("#member-dialog .profile-avatar");
  elements.memberDialogTitle.textContent = displayName;
  elements.memberDialogMeta.innerHTML = `<span>${escapeHtml(gender)}</span><span>${escapeHtml(location)}</span><span>${escapeHtml(lifespan)}</span>`;

  let photoSection = "";
  if (isAdmin) {
    const currentPhoto = person.img || "";
    photoSection = `
      <section class="dialog-section" aria-labelledby="photo-person-title">
        <h3 class="dialog-section-title" id="photo-person-title">Foto</h3>
        <div class="dialog-photo-section">
          <div class="dialog-photo-preview" id="dialog-photo-preview">
            ${currentPhoto ? `<img src="${escapeHtml(currentPhoto)}" alt="">` : "Belum ada foto"}
          </div>
          <div class="photo-upload-controls">
            <div class="photo-upload-input">
              <input type="file" class="form-input" id="member-photo-input" accept="image/*">
              <p class="rel-edit-hint">Pilih foto JPG/PNG untuk mengganti. Maksimal 2MB.</p>
              <div class="form-error" id="member-photo-error"></div>
            </div>
            <button type="button" class="photo-upload-remove" id="member-photo-remove">Hapus Foto</button>
            <button type="button" class="form-button" id="member-photo-save" style="margin-top: 8px;">Upload Foto</button>
          </div>
        </div>
      </section>
    `;
  }

  elements.memberDialogContent.innerHTML = `
    ${photoSection}
    <section class="dialog-section" aria-labelledby="about-person-title">
      <h3 class="dialog-section-title" id="about-person-title">Tentang beliau</h3>
      <div class="detail-grid" id="person-detail-view">
        ${detailValue("Nama lengkap", person.nama_lengkap)}
        ${detailValue("Nama panggilan", person.nama_panggilan)}
        ${detailValue("Domisili", person.domisili)}
        ${detailValue("Status", formatStatus(person))}
        ${detailValue("Tahun lahir", person.tahun_lahir)}
        ${detailValue("Usia saat ini", person.usia_saat_ini !== null && person.usia_saat_ini !== undefined ? `${person.usia_saat_ini} tahun` : "Belum dicatat")}
        ${detailValue("Tahun wafat", person.tahun_wafat)}
        ${detailValue("Usia saat wafat", person.usia_saat_wafat)}
      </div>
      <form class="admin-form" id="person-edit-form" autocomplete="off" style="display: none;">
        <div class="form-group">
          <label class="form-label" for="edit-nama-lengkap">Nama lengkap <span style="color: var(--danger-ink);">*</span></label>
          <input type="text" class="form-input" id="edit-nama-lengkap" value="${escapeHtml(person.nama_lengkap || "")}">
          <div class="form-error" id="edit-nama-lengkap-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-nama-panggilan">Nama panggilan</label>
          <input type="text" class="form-input" id="edit-nama-panggilan" value="${escapeHtml(person.nama_panggilan || "")}">
          <div class="form-error" id="edit-nama-panggilan-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-gender">Jenis kelamin <span style="color: var(--danger-ink);">*</span></label>
          <select class="form-select" id="edit-gender">
            <option value="">Pilih jenis kelamin...</option>
            <option value="Laki-laki" ${editGender === "Laki-laki" ? "selected" : ""}>Laki-laki</option>
            <option value="Perempuan" ${editGender === "Perempuan" ? "selected" : ""}>Perempuan</option>
          </select>
          <div class="form-error" id="edit-gender-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-tahun-lahir">Tahun lahir</label>
          <input type="number" class="form-input" id="edit-tahun-lahir" value="${escapeHtml(String(person.tahun_lahir || ''))}" min="1900" max="2100">
          <div class="form-error" id="edit-tahun-lahir-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-tahun-wafat">Tahun wafat</label>
          <input type="number" class="form-input" id="edit-tahun-wafat" value="${escapeHtml(String(person.tahun_wafat || ''))}" min="1900" max="2100">
          <div class="form-error" id="edit-tahun-wafat-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-domisili">Domisili terakhir</label>
          <input type="text" class="form-input" id="edit-domisili" value="${escapeHtml(person.domisili || '')}">
          <div class="form-error" id="edit-domisili-error"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-bio">Bio</label>
          <textarea class="form-textarea" id="edit-bio">${escapeHtml(person.bio || '')}</textarea>
          <div class="form-error" id="edit-bio-error"></div>
        </div>
      </form>
    </section>
    ${familySection}
  `;

  if (isAdmin) {
    setupRelationshipComboboxes();
    elements.memberDialogFooterHint.style.display = "none";
    elements.memberDialogFooterView.style.display = "none";
    elements.memberDialogEditProfile.style.display = "inline-flex";
    elements.memberDialogSaveProfile.style.display = "none";
    elements.memberDialogCancelEdit.style.display = "none";
    elements.memberDialogSaveRel.style.display = "inline-flex";
    elements.memberDialogSaveRel.onclick = () => saveMemberRelationships(person);
    elements.memberDialogDeletePerson.style.display = "inline-flex";
    elements.memberDialogDeletePerson.onclick = () => handleDeletePerson(person);
  } else {
    elements.memberDialogFooterHint.style.display = "";
    elements.memberDialogFooterView.style.display = "";
    elements.memberDialogEditProfile.style.display = "none";
    elements.memberDialogSaveProfile.style.display = "none";
    elements.memberDialogCancelEdit.style.display = "none";
    elements.memberDialogSaveRel.style.display = "none";
    elements.memberDialogDeletePerson.style.display = "none";
  }

  if (elements.memberDialogDeleteError) {
    elements.memberDialogDeleteError.textContent = "";
    elements.memberDialogDeleteError.style.display = "none";
  }

  elements.memberDialog.hidden = false;
  elements.memberDialog.setAttribute("aria-label", `Detail ${displayName}`);
  elements.memberDialogClose.focus({ preventScroll: true });
  announce(`Detail ${displayName} terbuka.`);
}

function getFocusable(container) {
  return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.disabled && element.offsetParent !== null);
}

function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("confirm-dialog");
    const messageEl = document.getElementById("confirm-dialog-message");
    const okButton = document.getElementById("confirm-dialog-ok");
    const cancelButton = document.getElementById("confirm-dialog-cancel");
    const closeButton = document.getElementById("confirm-dialog-close");

    if (!dialog || !messageEl || !okButton || !cancelButton) {
      resolve(window.confirm(message));
      return;
    }

    messageEl.textContent = message;
    dialog.hidden = false;
    runtime.activeDialog = "confirm";

    const cleanup = (value) => {
      dialog.hidden = true;
      runtime.activeDialog = null;
      resolve(value);
    };

    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onClose = () => cleanup(false);

    okButton.onclick = onOk;
    cancelButton.onclick = onCancel;
    closeButton.onclick = onClose;

    dialog.onclick = (event) => {
      if (event.target === dialog) onClose();
    };

    okButton.focus({ preventScroll: true });
  });
}

function closeDialog(dialogName, { restoreFocus = true } = {}) {
  let dialog;
  if (dialogName === "list") {
    dialog = elements.memberListDialog;
  } else if (dialogName === "relationships") {
    dialog = elements.relationshipsDialog;
  } else if (dialogName === "add-profile") {
    dialog = elements.addProfileDialog;
  } else if (dialogName === "confirm") {
    dialog = elements.confirmDialog;
  } else {
    dialog = elements.memberDialog;
  }
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  runtime.activeDialog = null;
  if (restoreFocus) {
    const target = runtime.lastFocusedElement && typeof runtime.lastFocusedElement.focus === "function"
      ? runtime.lastFocusedElement
      : elements.listButton;
    target.focus({ preventScroll: true });
  }
  announce(dialogName === "list" ? "Daftar anggota ditutup." : (dialogName === "relationships" ? "Kelola relasi ditutup." : (dialogName === "add-profile" ? "Tambah anggota ditutup." : "Detail anggota ditutup.")));
}

function openMemberList() {
  if (!runtime.nodes.length) return;
  runtime.lastFocusedElement = document.activeElement;
  runtime.activeDialog = "list";
  elements.memberListDialog.hidden = false;
  renderMemberList();
  elements.memberListSearch.focus({ preventScroll: true });
  announce("Daftar anggota terbuka.");
}

function replaceRelationshipSelect(element, field, label) {
  if (!element) return null;
  const wrapper = element.closest(".rel-edit-combobox") || element;
  wrapper.outerHTML = relationshipComboboxMarkup(field, "", "", {
    hiddenId: element.id,
    inputId: `${element.id}-input`,
    listboxId: `${element.id}-listbox`,
    label,
    includeAddNew: true,
    returnDialog: "relationships"
  });
  return document.getElementById(element.id);
}

function resetRelationshipComboboxes() {
  document.querySelectorAll("#relationships-dialog .rel-edit-combobox").forEach((combobox) => {
    const hiddenInput = combobox.querySelector('input[type="hidden"]');
    const input = combobox.querySelector(".rel-edit-input");
    if (hiddenInput) hiddenInput.value = "";
    combobox.dataset.selectedLabel = "";
    if (input) input.value = "";
    closeRelationshipCombobox(combobox);
    renderRelationshipComboboxOptions(combobox);
  });
}

async function populateRelationshipSelects() {
  elements.relPersonA = replaceRelationshipSelect(elements.relPersonA, "person-a", "Anggota A");
  elements.relPersonB = replaceRelationshipSelect(elements.relPersonB, "person-b", "Anggota B");
  setupRelationshipComboboxes(elements.relationshipsDialog);
}

async function showRelationshipsDialog() {
  if (!runtime.nodes.length) return;
  runtime.lastFocusedElement = document.activeElement;
  runtime.adminPanelWasVisible = Boolean(elements.adminPanel && getComputedStyle(elements.adminPanel).display !== "none");
  if (runtime.adminPanelWasVisible) elements.adminPanel.style.display = "none";
  runtime.activeDialog = "relationships";

  await populateRelationshipSelects();
  if (elements.relSearchInput) elements.relSearchInput.value = "";
  await renderRelationshipsList();

  elements.relationshipsDialog.hidden = false;
  elements.relationshipsDialogClose.focus({ preventScroll: true });
  announce("Kelola relasi terbuka.");
}

function hideRelationshipsDialog() {
  elements.relationshipsDialog.hidden = true;
  runtime.activeDialog = null;
  elements.relationshipForm.reset();
  resetRelationshipComboboxes();
  elements.relPersonAError.textContent = "";
  elements.relPersonBError.textContent = "";
  elements.relTypeError.textContent = "";
  elements.relGeneralError.textContent = "";
  if (elements.relSearchInput) elements.relSearchInput.value = "";

  if (runtime.adminPanelWasVisible && runtime.isAdmin) {
    elements.adminPanel.style.display = "flex";
  }
  runtime.adminPanelWasVisible = false;

  if (runtime.lastFocusedElement && typeof runtime.lastFocusedElement.focus === "function") {
    runtime.lastFocusedElement.focus({ preventScroll: true });
  }
  announce("Kelola relasi ditutup.");
}

async function validateParentsAreSpouses(fatherId, motherId) {
  const { data, error } = await supabaseClient
    .from('relationships')
    .select('id')
    .or(`and(person_a_id.eq.${fatherId},person_b_id.eq.${motherId},type.eq.spouse),and(person_a_id.eq.${motherId},person_b_id.eq.${fatherId},type.eq.spouse)`)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
}

async function checkPersonHasRelationships(personId) {
  const { data, error } = await supabaseClient
    .from('relationships')
    .select('id')
    .or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
}

async function handleDeletePerson(person) {
  if (!person || !runtime.isAdmin) return;

  const deleteError = elements.memberDialogDeleteError;
  if (deleteError) {
    deleteError.textContent = "";
    deleteError.style.display = "none";
  }

  try {
    const hasRelationships = await checkPersonHasRelationships(person.id);
    if (hasRelationships) {
      if (deleteError) {
        deleteError.textContent = "Tidak dapat menghapus: anggota ini masih memiliki relasi. Hapus relasi terlebih dahulu di menu Kelola Relasi.";
        deleteError.style.display = "block";
      }
      announce("Gagal menghapus: anggota masih memiliki relasi.");
      return;
    }

     const confirmed = await showConfirmDialog(`Yakin ingin menghapus anggota "${getDisplayName(person)}"? Aksi ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    const { error } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', person.id);

    if (error) throw error;

    await loadFamily();
    closeDialog("member");
    announce(`Anggota "${getDisplayName(person)}" berhasil dihapus.`);
  } catch (error) {
    if (deleteError) {
      deleteError.textContent = "Gagal menghapus anggota. Periksa koneksi internet Anda dan coba lagi.";
      deleteError.style.display = "block";
    }
    console.error("Delete person error:", error);
  }
}

async function handleUpdateMemberPhoto(person) {
  if (!person || !runtime.isAdmin) return;

  const photoInput = document.getElementById("member-photo-input");
  const file = photoInput?.files?.[0];
  const errorEl = elements.memberPhotoError;

  if (errorEl) errorEl.textContent = "";

  if (!file) {
    if (errorEl) errorEl.textContent = "Pilih foto terlebih dahulu";
    return;
  }

  try {
    const photoResult = await uploadPhoto(file, person.id);
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        foto_path: photoResult.foto_path,
        foto_url: photoResult.foto_url
      })
      .eq('id', person.id);

    if (error) throw error;

    await loadFamily();
    showDetailModal(person);
    announce("Foto berhasil diperbarui.");
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = "Gagal mengunggah foto. Periksa koneksi internet Anda dan coba lagi.";
    }
    console.error("Update member photo error:", error);
  }
}

async function handleDeleteMemberPhoto(person) {
  if (!person || !runtime.isAdmin) return;

  const confirmed = await showConfirmDialog('Yakin ingin menghapus foto anggota ini?');
  if (!confirmed) return;

  const errorEl = elements.memberPhotoError;
  if (errorEl) errorEl.textContent = '';

  try {
    if (person.foto_path) {
      await supabaseClient.storage.from(STORAGE_BUCKET).remove([person.foto_path]);
    }

    const { error } = await supabaseClient
      .from('profiles')
      .update({
        foto_path: null,
        foto_url: null
      })
      .eq('id', person.id);

    if (error) throw error;

    await loadFamily();
    showDetailModal(person);
    announce('Foto berhasil dihapus.');
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = 'Gagal menghapus foto. Periksa koneksi internet Anda dan coba lagi.';
    }
    console.error('Delete member photo error:', error);
  }
}

function startEditingProfile(person) {
  if (!person || !runtime.isAdmin) return;

  const detailView = document.getElementById("person-detail-view");
  const editForm = document.getElementById("person-edit-form");
  const editProfileBtn = elements.memberDialogEditProfile;
  const saveProfileBtn = elements.memberDialogSaveProfile;
  const cancelEditBtn = elements.memberDialogCancelEdit;
  const saveRelBtn = elements.memberDialogSaveRel;
  const deletePersonBtn = elements.memberDialogDeletePerson;

  if (detailView) detailView.style.display = "none";
  if (editForm) editForm.style.display = "block";
  if (editProfileBtn) editProfileBtn.style.display = "none";
  if (saveProfileBtn) saveProfileBtn.style.display = "inline-flex";
  if (cancelEditBtn) cancelEditBtn.style.display = "inline-flex";
  if (saveRelBtn) saveRelBtn.style.display = "none";
  if (deletePersonBtn) deletePersonBtn.style.display = "none";

  runtime.editingPerson = person;
}

function cancelEditProfile() {
  const person = runtime.editingPerson || runtime.selectedPerson;
  if (!person) return;

  const detailView = document.getElementById("person-detail-view");
  const editForm = document.getElementById("person-edit-form");
  const editProfileBtn = elements.memberDialogEditProfile;
  const saveProfileBtn = elements.memberDialogSaveProfile;
  const cancelEditBtn = elements.memberDialogCancelEdit;
  const saveRelBtn = elements.memberDialogSaveRel;
  const deletePersonBtn = elements.memberDialogDeletePerson;

  if (detailView) detailView.style.display = "block";
  if (editForm) editForm.style.display = "none";
  if (editProfileBtn) editProfileBtn.style.display = "inline-flex";
  if (saveProfileBtn) saveProfileBtn.style.display = "none";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (saveRelBtn) saveRelBtn.style.display = "inline-flex";
  if (deletePersonBtn) deletePersonBtn.style.display = "inline-flex";

  runtime.editingPerson = person;
}

async function saveProfileEdit(person) {
  if (!person || !runtime.isAdmin) return;

  const namaLengkap = document.getElementById("edit-nama-lengkap").value.trim();
  const namaPanggilan = document.getElementById("edit-nama-panggilan").value.trim();
  const gender = document.getElementById("edit-gender").value.trim();
  const tahunLahir = document.getElementById("edit-tahun-lahir").value.trim();
  const tahunWafat = document.getElementById("edit-tahun-wafat").value.trim();
  const domisili = document.getElementById("edit-domisili").value.trim();
  const bio = document.getElementById("edit-bio").value.trim();

  document.getElementById("edit-nama-lengkap-error").textContent = "";
  document.getElementById("edit-nama-panggilan-error").textContent = "";
  document.getElementById("edit-gender-error").textContent = "";
  document.getElementById("edit-tahun-lahir-error").textContent = "";
  document.getElementById("edit-tahun-wafat-error").textContent = "";
  document.getElementById("edit-domisili-error").textContent = "";
  document.getElementById("edit-bio-error").textContent = "";

  let hasError = false;

  if (!namaLengkap) {
    document.getElementById("edit-nama-lengkap-error").textContent = "Nama lengkap diperlukan";
    hasError = true;
  }

  if (!gender) {
    document.getElementById("edit-gender-error").textContent = "Jenis kelamin diperlukan";
    hasError = true;
  }

  if (tahunLahir && (Number(tahunLahir) < 1900 || Number(tahunLahir) > 2100)) {
    document.getElementById("edit-tahun-lahir-error").textContent = "Tahun lahir harus antara 1900-2100";
    hasError = true;
  }

  if (tahunWafat && (Number(tahunWafat) < 1900 || Number(tahunWafat) > 2100)) {
    document.getElementById("edit-tahun-wafat-error").textContent = "Tahun wafat harus antara 1900-2100";
    hasError = true;
  }

  if (tahunLahir && tahunWafat && Number(tahunWafat) <= Number(tahunLahir)) {
    document.getElementById("edit-tahun-wafat-error").textContent = "Tahun wafat harus setelah tahun lahir";
    hasError = true;
  }

  if (hasError) return;

  elements.memberDialogSaveProfile.disabled = true;

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        nama_lengkap: namaLengkap,
        nama_panggilan: namaPanggilan || null,
        gender: gender,
        tahun_lahir: tahunLahir ? Number(tahunLahir) : null,
        tahun_wafat: tahunWafat ? Number(tahunWafat) : null,
        domisili_terakhir: domisili || null,
        bio: bio || null
      })
      .eq('id', person.id);

    if (error) throw error;

    await loadFamily();
    showDetailModal(person);
    announce("Profil berhasil diperbarui.");
  } catch (error) {
    document.getElementById("edit-nama-lengkap-error").textContent = "Gagal menyimpan perubahan. Periksa koneksi internet Anda dan coba lagi.";
    console.error("Save profile edit error:", error);
  } finally {
    elements.memberDialogSaveProfile.disabled = false;
  }
}

async function saveMemberRelationships(person) {
  if (!person) return;

  const fatherId = document.getElementById("rel-edit-father")?.value?.trim() || "";
  const motherId = document.getElementById("rel-edit-mother")?.value?.trim() || "";
  const spouseId = document.getElementById("rel-edit-spouse")?.value?.trim() || "";

  const fatherError = document.getElementById("rel-edit-father-error");
  const motherError = document.getElementById("rel-edit-mother-error");
  const spouseError = document.getElementById("rel-edit-spouse-error");
  const generalError = document.getElementById("rel-edit-general-error");

  if (fatherError) fatherError.textContent = "";
  if (motherError) motherError.textContent = "";
  if (spouseError) spouseError.textContent = "";
  if (generalError) generalError.textContent = "";

  if (fatherId === "__add_new__" || motherId === "__add_new__" || spouseId === "__add_new__") {
    if (generalError) generalError.textContent = "Selesaikan penambahan anggota terlebih dahulu.";
    return;
  }

  if (fatherId && motherId) {
    const areSpouses = await validateParentsAreSpouses(fatherId, motherId);
    if (!areSpouses) {
      if (fatherError) fatherError.textContent = "Bapak dan ibu harus sudah terdaftar sebagai pasangan";
      if (motherError) motherError.textContent = "Bapak dan ibu harus sudah terdaftar sebagai pasangan";
      if (generalError) generalError.textContent = "Bapak dan ibu harus sudah memiliki relasi pasangan sebelum dapat ditambahkan sebagai orang tua.";
      announce("Validasi gagal: bapak dan ibu harus terdaftar sebagai pasangan.");
      return;
    }
  }

  try {
    const { data: existingRels, error: fetchError } = await supabaseClient
      .from('relationships')
      .select('*')
      .or(`and(person_b_id.eq.${person.id},type.eq.parent_child),and(person_a_id.eq.${person.id},type.eq.spouse),and(person_b_id.eq.${person.id},type.eq.spouse)`);

    if (fetchError) throw fetchError;

    const relIdsToDelete = (existingRels || []).map(r => r.id);
    if (relIdsToDelete.length) {
      const { error: deleteError } = await supabaseClient
        .from('relationships')
        .delete()
        .in('id', relIdsToDelete);
      if (deleteError) throw deleteError;
    }

    if (fatherId) {
      const { error } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: fatherId, person_b_id: person.id, type: 'parent_child' });
      if (error) throw error;
    }

    if (motherId) {
      const { error } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: motherId, person_b_id: person.id, type: 'parent_child' });
      if (error) throw error;
    }

    if (spouseId) {
      const { error: error1 } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: person.id, person_b_id: spouseId, type: 'spouse' });
      if (error1) throw error1;

      const { error: error2 } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: spouseId, person_b_id: person.id, type: 'spouse' });
      if (error2) {
        await supabaseClient.from('relationships').delete().eq('person_a_id', person.id).eq('person_b_id', spouseId).eq('type', 'spouse');
        throw error2;
      }
    }

    await loadFamily();
    announce("Relasi berhasil disimpan.");
    closeDialog("member");
  } catch (error) {
    if (generalError) generalError.textContent = "Gagal menyimpan relasi. Periksa koneksi internet Anda dan coba lagi.";
    console.error("Save relationship error:", error);
  }
}

async function showAddProfileDialog(dropdownContext) {
  hideAddProfileDialog();
  runtime.addProfileCallback = typeof dropdownContext === "function" ? dropdownContext : null;
  runtime.activeDialog = "add-profile";
  elements.addProfileDialog.hidden = false;
  elements.addProfileDialogClose.focus({ preventScroll: true });
  announce("Formulir tambah anggota terbuka.");
}

function hideAddProfileDialog() {
  elements.addProfileDialog.hidden = true;
  runtime.addProfileCallback = null;
  elements.addProfileForm.reset();
  elements.addProfileGeneralError.textContent = "";
  elements.addProfileNamaLengkapError.textContent = "";
  elements.addProfileNamaPanggilanError.textContent = "";
  elements.addProfileGenderError.textContent = "";
  elements.addProfileTahunLahirError.textContent = "";
  elements.addProfileTahunWafatError.textContent = "";
  elements.addProfileDomisiliError.textContent = "";
  elements.addProfileBioError.textContent = "";
  elements.addPhotoError.textContent = "";
  elements.addPhotoPreview.textContent = "Foto";
  elements.addPhotoPreview.querySelectorAll("img").forEach((img) => img.remove());
  elements.addPhotoRemove.style.display = "none";
  if (elements.addProfilePhoto) elements.addProfilePhoto.value = "";
}

async function handleAddProfile(event) {
  event.preventDefault();

  const namaLengkap = document.getElementById("new-profile-nama-lengkap").value.trim();
  const namaPanggilan = document.getElementById("new-profile-nama-panggilan").value.trim();
  const gender = document.getElementById("new-profile-gender").value.trim();
  const tahunLahir = document.getElementById("new-profile-tahun-lahir").value.trim();
  const tahunWafat = document.getElementById("new-profile-tahun-wafat").value.trim();
  const domisili = document.getElementById("new-profile-domisili").value.trim();
  const bio = document.getElementById("new-profile-bio").value.trim();
  const photoFile = elements.addProfilePhoto?.files?.[0] || null;

  elements.addProfileGeneralError.textContent = "";
  elements.addProfileNamaLengkapError.textContent = "";
  elements.addProfileNamaPanggilanError.textContent = "";
  elements.addProfileGenderError.textContent = "";
  elements.addProfileTahunLahirError.textContent = "";
  elements.addProfileTahunWafatError.textContent = "";
  elements.addProfileDomisiliError.textContent = "";
  elements.addProfileBioError.textContent = "";
  elements.addPhotoError.textContent = "";

  let hasError = false;

  if (!namaLengkap) {
    elements.addProfileNamaLengkapError.textContent = "Nama lengkap diperlukan";
    hasError = true;
  }

  if (!gender) {
    elements.addProfileGenderError.textContent = "Jenis kelamin diperlukan";
    hasError = true;
  }

  if (tahunLahir && (Number(tahunLahir) < 1900 || Number(tahunLahir) > 2100)) {
    elements.addProfileTahunLahirError.textContent = "Tahun lahir harus antara 1900-2100";
    hasError = true;
  }

  if (tahunWafat && (Number(tahunWafat) < 1900 || Number(tahunWafat) > 2100)) {
    elements.addProfileTahunWafatError.textContent = "Tahun wafat harus antara 1900-2100";
    hasError = true;
  }

  if (tahunLahir && tahunWafat && Number(tahunWafat) <= Number(tahunLahir)) {
    elements.addProfileTahunWafatError.textContent = "Tahun wafat harus setelah tahun lahir";
    hasError = true;
  }

  if (hasError) return;

  elements.addProfileSubmit.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .insert({
        nama_lengkap: namaLengkap,
        nama_panggilan: namaPanggilan || null,
        gender: gender,
        tahun_lahir: tahunLahir ? Number(tahunLahir) : null,
        tahun_wafat: tahunWafat ? Number(tahunWafat) : null,
        domisili_terakhir: domisili || null,
        bio: bio || null
      })
      .select()
      .single();

    if (error) throw error;

    if (photoFile) {
      try {
        const photoResult = await uploadPhoto(photoFile, data.id);
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            foto_path: photoResult.foto_path,
            foto_url: photoResult.foto_url
          })
          .eq('id', data.id);

        if (updateError) throw updateError;
      } catch (photoError) {
        console.error("Photo upload failed:", photoError);
    elements.addProfileGeneralError.textContent = "Anggota berhasil ditambahkan, namun foto gagal diunggah: " + (photoError.message || "Gagal mengunggah foto. Periksa koneksi internet Anda.");
      }
    }

    await loadFamily();

    const newPerson = runtime.nodes.find(n => String(n.id) === String(data.id));
    const addProfileCallback = runtime.addProfileCallback;
    hideAddProfileDialog();
    if (newPerson && addProfileCallback) {
      addProfileCallback(newPerson.id);
    }

    announce("Anggota berhasil ditambahkan.");
  } catch (error) {
     elements.addProfileGeneralError.textContent = "Gagal menambahkan anggota: " + (error.message || "Gagal menyimpan ke server. Periksa koneksi internet Anda.");
    console.error("Add profile error:", error);
  } finally {
    elements.addProfileSubmit.disabled = false;
  }
}

async function fetchRelationships() {
  const { data, error } = await supabaseClient
    .from('relationships')
    .select('*')
    .order('type', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function renderRelationshipsList(query = "") {
  const relationships = await fetchRelationships();
  const normalizedQuery = query.trim().toLowerCase();

  const profileMap = new Map(runtime.nodes.map(p => [String(p.id), p]));

  const matchesQuery = (rel) => {
    if (!normalizedQuery) return true;
    const personA = profileMap.get(String(rel.person_a_id));
    const personB = profileMap.get(String(rel.person_b_id));
    const nameA = personA ? getDisplayName(personA).toLowerCase() : "";
    const nameB = personB ? getDisplayName(personB).toLowerCase() : "";
    return nameA.includes(normalizedQuery) || nameB.includes(normalizedQuery);
  };

  const filteredRelationships = relationships.filter(matchesQuery);
  const spouseRelationships = filteredRelationships.filter(r => r.type === 'spouse');
  const parentChildRelationships = filteredRelationships.filter(r => r.type === 'parent_child');

  if (!filteredRelationships.length) {
    elements.relationshipsList.innerHTML = `
      <div class="relationship-empty">
        <p>${normalizedQuery ? "Tidak ada relasi yang cocok dengan pencarian." : "Belum ada relasi yang didefinisikan."}</p>
      </div>
    `;
    return;
  }

  let html = '';

  if (spouseRelationships.length) {
    html += `<p class="relationship-group-title">Pasangan</p>`;
    html += `<div class="relationship-list">`;
    spouseRelationships.forEach(rel => {
      const personA = profileMap.get(String(rel.person_a_id));
      const personB = profileMap.get(String(rel.person_b_id));
      const nameA = personA ? getDisplayName(personA) : "Tidak diketahui";
      const nameB = personB ? getDisplayName(personB) : "Tidak diketahui";
      html += `
        <div class="relationship-item">
          <div class="relationship-names">
            <strong>${escapeHtml(nameA)}</strong>
            <span class="relationship-arrow">↔</span>
            <strong>${escapeHtml(nameB)}</strong>
          </div>
          <button type="button" class="relationship-delete" data-delete-rel="${escapeHtml(String(rel.id))}">Hapus</button>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (parentChildRelationships.length) {
    html += `<p class="relationship-group-title">Orang Tua - Anak</p>`;
    html += `<div class="relationship-list">`;
    parentChildRelationships.forEach(rel => {
      const parent = profileMap.get(String(rel.person_a_id));
      const child = profileMap.get(String(rel.person_b_id));
      const parentName = parent ? getDisplayName(parent) : "Tidak diketahui";
      const childName = child ? getDisplayName(child) : "Tidak diketahui";
      html += `
        <div class="relationship-item">
          <div class="relationship-names">
            <strong>${escapeHtml(parentName)}</strong>
            <span class="relationship-arrow">→</span>
            <strong>${escapeHtml(childName)}</strong>
          </div>
          <button type="button" class="relationship-delete" data-delete-rel="${escapeHtml(String(rel.id))}">Hapus</button>
        </div>
      `;
    });
    html += `</div>`;
  }

  elements.relationshipsList.innerHTML = html;

  elements.relationshipsList.querySelectorAll("[data-delete-rel]").forEach(button => {
    button.addEventListener("click", async () => {
      const relId = button.getAttribute("data-delete-rel");
      if (await showConfirmDialog("Yakin ingin menghapus relasi ini?")) {
        await handleDeleteRelationship(relId);
      }
    });
  });
}

async function handleAddRelationship(event) {
  event.preventDefault();

  const personAId = elements.relPersonA.value.trim();
  const type = elements.relType.value.trim();
  const personBId = elements.relPersonB.value.trim();

  elements.relPersonAError.textContent = "";
  elements.relPersonBError.textContent = "";
  elements.relTypeError.textContent = "";
  elements.relGeneralError.textContent = "";

  let hasError = false;

  if (!personAId) {
    elements.relPersonAError.textContent = "Pilih anggota A";
    hasError = true;
  }

  if (!type) {
    elements.relTypeError.textContent = "Pilih jenis relasi";
    hasError = true;
  }

  if (!personBId) {
    elements.relPersonBError.textContent = "Pilih anggota B";
    hasError = true;
  }

  if (hasError) return;

  if (personAId === personBId) {
    elements.relGeneralError.textContent = "Anggota A dan B tidak boleh sama";
    return;
  }

  const personA = runtime.nodes.find(n => String(n.id) === String(personAId));
  const personB = runtime.nodes.find(n => String(n.id) === String(personBId));

  if (!personA || !personB) {
    elements.relGeneralError.textContent = "Anggota tidak ditemukan";
    return;
  }

  if (type === 'parent_child') {
    const parentGender = personA.gender_label || personA.gender;
    if (!parentGender) {
      elements.relGeneralError.textContent = "Jenis kelamin orang tua (Anggota A) belum dicatat";
      return;
    }
  }

  elements.relSubmit.disabled = true;

  try {
    if (type === 'spouse') {
      const { error: error1 } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: personAId, person_b_id: personBId, type: 'spouse' });

      if (error1) throw error1;

      const { error: error2 } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: personBId, person_b_id: personAId, type: 'spouse' });

      if (error2) {
        await supabaseClient.from('relationships').delete().eq('person_a_id', personAId).eq('person_b_id', personBId).eq('type', 'spouse');
        throw error2;
      }
    } else {
      const { error } = await supabaseClient
        .from('relationships')
        .insert({ person_a_id: personAId, person_b_id: personBId, type: 'parent_child' });

      if (error) throw error;
    }

    elements.relationshipForm.reset();
    resetRelationshipComboboxes();
    elements.relPersonAError.textContent = "";
    elements.relPersonBError.textContent = "";
    elements.relTypeError.textContent = "";
    elements.relGeneralError.textContent = "";

    await renderRelationshipsList(elements.relSearchInput?.value || "");
    await loadFamily();
    announce("Relasi berhasil ditambahkan.");
  } catch (error) {
    elements.relGeneralError.textContent = "Gagal menambahkan relasi. Periksa koneksi internet Anda dan coba lagi.";
    console.error("Add relationship error:", error);
  } finally {
    elements.relSubmit.disabled = false;
  }
}

async function handleDeleteRelationship(relId) {
  try {
    const { data: rel, error: fetchError } = await supabaseClient
      .from('relationships')
      .select('*')
      .eq('id', relId)
      .single();

    if (fetchError || !rel) {
      throw new Error("Relasi tidak ditemukan");
    }

    const { error } = await supabaseClient
      .from('relationships')
      .delete()
      .eq('id', relId);

    if (error) throw error;

    if (rel.type === 'spouse') {
      await supabaseClient
        .from('relationships')
        .delete()
        .eq('person_a_id', rel.person_b_id)
        .eq('person_b_id', rel.person_a_id)
        .eq('type', 'spouse');
    }

    await renderRelationshipsList(elements.relSearchInput?.value || "");
    await loadFamily();
    announce("Relasi berhasil dihapus.");
  } catch (error) {
    announce("Gagal menghapus relasi: " + (error.message || "Periksa koneksi internet"));
    console.error("Delete relationship error:", error);
  }
}

function showInstructions() {
  elements.banner.hidden = false;
  try {
    window.sessionStorage.removeItem(BANNER_STORAGE_KEY);
  } catch (error) {
    // Storage may be unavailable in private browsing; the banner still works.
  }
  elements.bannerClose.focus({ preventScroll: true });
  announce("Petunjuk penggunaan ditampilkan.");
}

// ===== AUTHENTICATION FUNCTIONS =====

function showLoginDialog() {
  elements.loginDialog.hidden = false;
  elements.loginEmail.focus();
}

function hideLoginDialog() {
  elements.loginDialog.hidden = true;
  elements.loginForm.reset();
  elements.loginGeneralError.textContent = "";
  elements.loginEmailError.textContent = "";
  elements.loginPasswordError.textContent = "";
}

function updateAuthUI() {
  if (runtime.user && runtime.isAdmin) {
    // Show admin UI
    elements.loginButton.style.display = "none";
    elements.adminPanel.style.display = "flex";
    
    // Update button texts
    elements.loginButton.innerHTML = `<i class="ti ti-logout-2" aria-hidden="true"></i><span>Logout</span>`;
  } else {
    // Show login UI
    elements.loginButton.style.display = "flex";
    elements.adminPanel.style.display = "none";
    
    // Update button texts
    elements.loginButton.innerHTML = `<i class="ti ti-login-2" aria-hidden="true"></i><span>Login</span>`;
  }
}

async function handleLogin(email, password) {
  try {
    elements.loginSubmit.disabled = true;
    elements.loginGeneralError.textContent = "";
    elements.loginEmailError.textContent = "";
    elements.loginPasswordError.textContent = "";

    if (!email || !password) {
      if (!email) elements.loginEmailError.textContent = "Email diperlukan";
      if (!password) elements.loginPasswordError.textContent = "Password diperlukan";
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      elements.loginGeneralError.textContent = "Login gagal: " + (error.message || "Periksa email dan password Anda");
      return;
    }

    if (!isAdminUser(data.user)) {
      await supabaseClient.auth.signOut();
      elements.loginGeneralError.textContent = "Akun ini tidak memiliki akses admin.";
      return;
    }

    runtime.user = data.user;
    runtime.isAdmin = true;
    hideLoginDialog();
    updateAuthUI();
    await loadFamily();
    announce("Login berhasil. Admin panel siap digunakan.");
  } catch (error) {
    elements.loginGeneralError.textContent = "Terjadi kesalahan: " + error.message;
    console.error("Login error:", error);
  } finally {
    elements.loginSubmit.disabled = false;
  }
}

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
    runtime.user = null;
    runtime.isAdmin = false;
    updateAuthUI();
    await loadFamily();
    announce("Logout berhasil.");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

async function checkAuthStatus() {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (user && isAdminUser(user)) {
      runtime.user = user;
      runtime.isAdmin = true;
      updateAuthUI();
    } else {
      if (user) await supabaseClient.auth.signOut();
      runtime.user = null;
      runtime.isAdmin = false;
      updateAuthUI();
    }
  } catch (error) {
    console.error("Auth status check error:", error);
  }
}

async function loadFamily() {
  const requestId = ++runtime.requestId;
  if (runtime.activeController) runtime.activeController.abort();
  runtime.activeController = new AbortController();
  destroyFamilyTree();
  runtime.nodes = [];
  renderState("loading");

  const timeoutId = window.setTimeout(() => runtime.activeController.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Fetch profiles dari Supabase
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*');

    if (profilesError) throw profilesError;
    if (!Array.isArray(profiles)) throw new Error("Format data keluarga tidak sesuai.");
    if (requestId !== runtime.requestId) return;

    // Transform profiles ke format yang diharapkan oleh Balkangraph
    runtime.nodes = profiles
      .map(profile => {
        const genderLabel = formatGender(profile.gender);
        return {
        id: profile.id,
        pids: [],
        fid: null,
        mid: null,
        name: profile.nama_panggilan || profile.nama_lengkap || "Belum dicatat",
        node_meta: `${profile.tahun_lahir || ""} ${profile.tahun_wafat ? `— ${profile.tahun_wafat}` : ""}`.trim() || "Belum dicatat",
        node_status: profile.tahun_wafat ? "Sudah berpulang" : (profile.tahun_lahir ? "Masih bersama kita" : "Status tidak diketahui"),
        initials: getInitials(profile.nama_lengkap || profile.nama_panggilan),
        img: profile.foto_url || "",
        gender: genderLabel === "Perempuan" ? "female" : "male",
        gender_label: genderLabel,
        id_original: profile.id,
        nama_lengkap: profile.nama_lengkap,
        nama_panggilan: profile.nama_panggilan,
        tahun_lahir: profile.tahun_lahir,
        tahun_wafat: profile.tahun_wafat,
        usia_saat_ini: profile.tahun_wafat ? null : calculateAge(profile.tahun_lahir),
        domisili: profile.domisili_terakhir,
        domisili_terakhir: profile.domisili_terakhir,
        bio: profile.bio,
        foto_url: profile.foto_url
        };
      })
      .filter(person => person.id !== undefined && person.id !== null);

    // Fetch relationships dan update parent/child relationships
    const { data: relationships, error: relationshipsError } = await supabaseClient
      .from('relationships')
      .select('*');

    if (relationshipsError) throw relationshipsError;

    // Build relationships map
    const relationshipsMap = {};
    const profileMap = new Map(runtime.nodes.map(p => [String(p.id), p]));

    relationships.forEach(rel => {
      const personA = profileMap.get(String(rel.person_a_id));
      const personB = profileMap.get(String(rel.person_b_id));
      if (!personA || !personB) return;

      if (rel.type === 'spouse') {
        if (!personA.pids) personA.pids = [];
        if (!personB.pids) personB.pids = [];
        if (!personA.pids.includes(String(rel.person_b_id))) {
          personA.pids.push(String(rel.person_b_id));
        }
        if (!personB.pids.includes(String(rel.person_a_id))) {
          personB.pids.push(String(rel.person_a_id));
        }
      } else if (rel.type === 'parent_child') {
        if (personA.gender === 'female') {
          personB.mid = String(rel.person_a_id);
        } else {
          personB.fid = String(rel.person_a_id);
        }
      }
    });

    if (!runtime.nodes.length) {
      renderState("empty");
      announce("Belum ada data keluarga yang dapat ditampilkan.");
      return;
    }

    initFamilyTree();
    observeStatusClasses();
    runtime.familyTree.load(runtime.nodes);
    applyStatusClasses();
    hideFamilyTreeChrome();
    renderState("ready");
    announce(`${runtime.nodes.length} anggota keluarga siap dijelajahi.`);
  } catch (error) {
    if (requestId !== runtime.requestId) return;
    const message = error && error.name === "AbortError"
      ? "Pemuatan data terlalu lama. Periksa koneksi internet Anda lalu coba lagi."
      : `Gagal memuat data keluarga: ${error.message || "Periksa koneksi internet Anda"}`;
    renderState("error", message);
    console.error("Trah Sukata: gagal memuat data keluarga.", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}


