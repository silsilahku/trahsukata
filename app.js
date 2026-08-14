elements.bannerClose.addEventListener("click", () => {
  elements.banner.hidden = true;
  try {
    window.sessionStorage.setItem(BANNER_STORAGE_KEY, "true");
  } catch (error) {
    // Storage may be unavailable; dismiss for the current view anyway.
  }
  announce("Petunjuk ditutup.");
});

elements.helpButton.addEventListener("click", showInstructions);
elements.listButton.addEventListener("click", openMemberList);
elements.memberListSearch.addEventListener("input", (event) => {
  renderMemberList(event.target.value);
});
elements.memberListSearch.addEventListener("keydown", onSearchKeydown);
elements.memberDialogClose.addEventListener("click", () => closeDialog("member"));
elements.memberListClose.addEventListener("click", () => closeDialog("list"));

elements.memberDialog.addEventListener("click", async (event) => {
  if (event.target === elements.memberDialog) {
    closeDialog("member");
    return;
  }

  const button = event.target.closest(".family-list-link");
  if (button) {
    const relatedId = button.getAttribute("data-related-id");
    const relatedPerson = runtime.nodes.find((node) => String(node.id) === String(relatedId));
    if (relatedPerson) {
      showDetailModal(relatedPerson);
    }
    return;
  }

  const savePhotoButton = event.target.closest("#member-photo-save");
  if (savePhotoButton && runtime.editingPerson) {
    handleUpdateMemberPhoto(runtime.editingPerson);
    return;
  }

  const removePhotoButton = event.target.closest("#member-photo-remove");
  if (removePhotoButton && runtime.editingPerson) {
    handleDeleteMemberPhoto(runtime.editingPerson);
    return;
  }

  const editProfileButton = event.target.closest("#member-dialog-edit-profile");
  if (editProfileButton && runtime.editingPerson) {
    startEditingProfile(runtime.editingPerson);
    return;
  }

  const saveProfileButton = event.target.closest("#member-dialog-save-profile");
  if (saveProfileButton && runtime.editingPerson) {
    await saveProfileEdit(runtime.editingPerson);
    return;
  }

  const cancelEditButton = event.target.closest("#member-dialog-cancel-edit");
  if (cancelEditButton && runtime.editingPerson) {
    cancelEditProfile();
    return;
  }
});

elements.memberListDialog.addEventListener("click", (event) => {
  if (event.target === elements.memberListDialog) closeDialog("list");
});

// ===== AUTH EVENT LISTENERS =====

elements.loginButton.addEventListener("click", () => {
  if (runtime.isAdmin) {
    handleLogout();
  } else {
    showLoginDialog();
  }
});

elements.loginDialogClose.addEventListener("click", hideLoginDialog);

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleLogin(elements.loginEmail.value, elements.loginPassword.value);
});

elements.loginDialog.addEventListener("click", (event) => {
  if (event.target === elements.loginDialog) hideLoginDialog();
});

elements.adminPanelClose.addEventListener("click", () => {
  elements.adminPanel.style.display = "none";
});

elements.logoutButton.addEventListener("click", async () => {
  if (await showConfirmDialog("Yakin ingin logout?")) {
    handleLogout();
  }
});

elements.addProfileButton.addEventListener("click", () => {
  showAddProfileDialog();
});

elements.manageRelationshipsButton.addEventListener("click", () => {
  showRelationshipsDialog();
});

elements.relationshipsDialogClose.addEventListener("click", () => {
  hideRelationshipsDialog();
});

elements.relationshipForm.addEventListener("submit", (event) => {
  handleAddRelationship(event);
});

if (elements.relSearchInput) {
  elements.relSearchInput.addEventListener("input", () => {
    renderRelationshipsList(elements.relSearchInput.value);
  });
}

elements.relationshipsDialog.addEventListener("click", (event) => {
  if (event.target === elements.relationshipsDialog) hideRelationshipsDialog();
});

function bindRelationshipComboboxEvents(container) {
  if (!container) return;

  container.addEventListener("focusin", (event) => {
    const input = event.target.closest(".rel-edit-input");
    if (!input) return;
    const combobox = input.closest(".rel-edit-combobox");
    if (combobox && !combobox.classList.contains("is-open")) openRelationshipCombobox(combobox);
  });

  container.addEventListener("input", (event) => {
    const input = event.target.closest(".rel-edit-input");
    if (!input) return;
    const combobox = input.closest(".rel-edit-combobox");
    if (!combobox) return;
    if (!combobox.classList.contains("is-open")) openRelationshipCombobox(combobox);
    renderRelationshipComboboxOptions(combobox, input.value);
  });

  container.addEventListener("click", (event) => {
    const clearButton = event.target.closest(".rel-edit-clear");
    if (!clearButton) return;
    const combobox = clearButton.closest(".rel-edit-combobox");
    const input = combobox?.querySelector(".rel-edit-input");
    if (!combobox || !input) return;
    input.value = "";
    renderRelationshipComboboxOptions(combobox);
    input.focus({ preventScroll: true });
  });

  container.addEventListener("keydown", (event) => {
    handleRelationshipComboboxKeydown(event);
  });

  container.addEventListener("click", (event) => {
    const input = event.target.closest(".rel-edit-input");
    if (input) {
      const combobox = input.closest(".rel-edit-combobox");
      if (combobox && !combobox.classList.contains("is-open")) openRelationshipCombobox(combobox);
      return;
    }

    const option = event.target.closest('.rel-edit-option[role="option"]');
    if (!option) return;
    commitRelationshipOption(option.closest(".rel-edit-combobox"), option);
  });
}

bindRelationshipComboboxEvents(elements.memberDialogContent);
bindRelationshipComboboxEvents(elements.relationshipsDialog);

document.addEventListener("pointerdown", (event) => {
  document.querySelectorAll(".rel-edit-combobox.is-open").forEach((combobox) => {
    if (!combobox.contains(event.target)) closeRelationshipCombobox(combobox);
  });
});

elements.memberDialogContent.addEventListener("change", (event) => {
  const photoInput = event.target.closest("#member-photo-input");
  if (!photoInput) return;
  const file = photoInput.files?.[0];
  const preview = document.getElementById("dialog-photo-preview");
  const errorEl = document.getElementById("member-photo-error");

  if (errorEl) errorEl.textContent = "";
  if (!preview) return;

  preview.querySelectorAll("img").forEach((img) => img.remove());

  if (!file) {
    preview.textContent = "Belum ada foto";
    return;
  }

  const validationError = validatePhotoFile(file);
  if (validationError) {
    if (errorEl) errorEl.textContent = validationError;
    photoInput.value = "";
    preview.textContent = "Belum ada foto";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.alt = "";
    preview.textContent = "";
    preview.appendChild(img);
  };
  reader.readAsDataURL(file);
});

elements.memberDialogDeletePerson.addEventListener("click", () => {
  if (runtime.editingPerson) {
    handleDeletePerson(runtime.editingPerson);
  }
});

elements.addProfileDialogClose.addEventListener("click", hideAddProfileDialog);

elements.addProfileForm.addEventListener("submit", (event) => {
  handleAddProfile(event);
});

elements.addProfileDialog.addEventListener("click", (event) => {
  if (event.target === elements.addProfileDialog) hideAddProfileDialog();
});

if (elements.addProfilePhoto) {
  elements.addProfilePhoto.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = elements.addPhotoPreview;
    const removeBtn = elements.addPhotoRemove;
    const errorEl = elements.addPhotoError;

    errorEl.textContent = "";
    preview.querySelectorAll("img").forEach((img) => img.remove());

    if (!file) {
      preview.textContent = "Foto";
      removeBtn.style.display = "none";
      return;
    }

    const validationError = validatePhotoFile(file);
    if (validationError) {
      errorEl.textContent = validationError;
      event.target.value = "";
      preview.textContent = "Foto";
      removeBtn.style.display = "none";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = "";
      preview.textContent = "";
      preview.appendChild(img);
      removeBtn.style.display = "inline-flex";
    };
    reader.readAsDataURL(file);
  });
}

if (elements.addPhotoRemove) {
  elements.addPhotoRemove.addEventListener("click", () => {
    if (elements.addProfilePhoto) elements.addProfilePhoto.value = "";
    const preview = elements.addPhotoPreview;
    preview.querySelectorAll("img").forEach((img) => img.remove());
    preview.textContent = "Foto";
    elements.addPhotoRemove.style.display = "none";
    elements.addPhotoError.textContent = "";
  });
}

document.querySelectorAll("[data-tree-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.treeAction;
    if (action === "zoom-in") callTreeMethod(action, "Pohon diperbesar.");
    if (action === "zoom-out") callTreeMethod(action, "Pohon diperkecil.");
    if (action === "fit") callTreeMethod(action, "Pohon dipusatkan.");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && runtime.activeDialog) {
    if (runtime.activeDialog === "confirm") {
      const cancelButton = elements.confirmDialogCancel;
      if (cancelButton) cancelButton.click();
      return;
    }
    if (runtime.activeDialog === "relationships") {
      hideRelationshipsDialog();
      return;
    }
    closeDialog(runtime.activeDialog);
    return;
  }

  if (event.key !== "Tab" || !runtime.activeDialog) return;
  let dialog;
  if (runtime.activeDialog === "list") {
    dialog = elements.memberListDialog;
  } else if (runtime.activeDialog === "relationships") {
    dialog = elements.relationshipsDialog;
  } else if (runtime.activeDialog === "add-profile") {
    dialog = elements.addProfileDialog;
  } else if (runtime.activeDialog === "confirm") {
    dialog = elements.confirmDialog;
  } else {
    dialog = elements.memberDialog;
  }
  if (!dialog) return;
  const focusable = getFocusable(dialog);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

try {
  if (window.sessionStorage.getItem(BANNER_STORAGE_KEY) === "true") elements.banner.hidden = true;
} catch (error) {
  // Keep the instruction visible if storage is unavailable.
}

// Initialize auth and load data
(async () => {
  await checkAuthStatus();
  await loadFamily();
})();

