function avatarMarkup(person, className = "profile-avatar") {
  const genderClass = person && person.gender === "female" ? `${className}--female` : "";
  const initials = escapeHtml(getInitials(getDisplayName(person)));
  const image = person && person.img
    ? `<img src="${escapeHtml(person.img)}" alt="" loading="lazy">`
    : initials;
  return `<div class="${className} ${genderClass}" aria-hidden="true">${image}</div>`;
}

function renderState(status, detail = "") {
  runtime.status = status;
  elements.stage.classList.toggle("is-loading", status === "loading");
  elements.stage.classList.toggle("is-empty", status === "empty");
  elements.stage.classList.toggle("is-error", status === "error");
  elements.tree.setAttribute("aria-hidden", status !== "ready" ? "true" : "false");
  elements.asyncNote.hidden = status !== "loading";

  if (status === "ready") {
    elements.treeState.hidden = true;
    elements.memberCount.textContent = `${runtime.nodes.length} anggota`;
    elements.lastUpdated.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i><span>Terakhir diperbarui hari ini</span>`;
    elements.listButton.disabled = runtime.nodes.length === 0;
    return;
  }

  elements.treeState.hidden = false;
  elements.listButton.disabled = true;

  const states = {
    loading: {
      className: "state-card--loading",
      icon: "ti-tree",
      title: "Menyiapkan silsilah keluarga…",
      description: "Kami sedang membuka catatan keluarga. Data akan muncul sebentar lagi.",
      action: ""
    },
    empty: {
      className: "state-card--empty",
      icon: "ti-users-minus",
      title: "Data keluarga belum tersedia.",
      description: "Belum ada catatan keluarga yang dapat ditampilkan saat ini.",
      action: `<button class="state-action" type="button" data-state-action="retry"><i class="ti ti-refresh" aria-hidden="true"></i>Muat ulang</button>`
    },
    error: {
      className: "state-card--error",
      icon: "ti-wifi-off",
      title: "Koneksi terputus. Mari kita coba lagi.",
      description: detail || "Gagal memuat data keluarga. Periksa koneksi internet Anda lalu coba lagi.",
      action: `<button class="state-action" type="button" data-state-action="retry"><i class="ti ti-refresh" aria-hidden="true"></i>Muat ulang</button>`
    }
  }[status];

  elements.memberCount.textContent = status === "loading" ? "Menyiapkan data" : "Belum tersedia";
  elements.lastUpdated.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i><span>${status === "loading" ? "Menyiapkan silsilah" : "Belum dapat diperbarui"}</span>`;

  const skeleton = status === "loading"
    ? `<div class="state-skeleton" aria-hidden="true"><span class="skeleton-node"></span><span class="skeleton-node"></span><span class="skeleton-node"></span></div>`
    : "";

  elements.treeState.innerHTML = `
    <div class="state-card ${states.className}">
      ${skeleton}
      <div class="state-icon" aria-hidden="true"><i class="ti ${states.icon}"></i></div>
      <h2 class="state-title">${states.title}</h2>
      <p class="state-description">${states.description}</p>
      ${states.action}
    </div>
  `;

  const retryButton = elements.treeState.querySelector('[data-state-action="retry"]');
  if (retryButton) retryButton.addEventListener("click", loadFamily);
}

function destroyFamilyTree() {
  if (runtime.statusObserver) {
    runtime.statusObserver.disconnect();
    runtime.statusObserver = null;
  }
  if (runtime.familyTree && typeof runtime.familyTree.destroy === "function") {
    try {
      runtime.familyTree.destroy();
    } catch (error) {
      console.warn("FamilyTree tidak dapat dibersihkan sepenuhnya.", error);
    }
  }
  runtime.familyTree = null;
  elements.tree.innerHTML = "";
}

function hideFamilyTreeChrome() {
  elements.tree.querySelectorAll('[class*="toolbar"], [class*="controlbar"], [class*="control-bar"]').forEach((element) => {
    element.setAttribute("aria-hidden", "true");
    element.style.display = "none";
  });
}

function applyStatusClasses() {
  const peopleById = new Map(runtime.nodes.map((person) => [String(person.id), person]));
  elements.tree.querySelectorAll("[data-n-id]").forEach((nodeElement) => {
    const person = peopleById.get(String(nodeElement.dataset.nId));
    nodeElement.classList.remove("is-alive", "is-deceased", "is-unknown");
    nodeElement.classList.add(getStatusClass(person));
  });
}

function observeStatusClasses() {
  if (runtime.statusObserver) runtime.statusObserver.disconnect();
  if (typeof MutationObserver === "undefined") return;
  runtime.statusObserver = new MutationObserver(() => applyStatusClasses());
  runtime.statusObserver.observe(elements.tree, { childList: true, subtree: true });
}

function registerAlamCardTemplate() {
  if (FamilyTree.templates.alamCard) return;

  const widthAttribute = FamilyTree.attr && FamilyTree.attr.width ? FamilyTree.attr.width : "data-width";
  const menuAttribute = FamilyTree.attr && FamilyTree.attr.control_node_menu_id
    ? FamilyTree.attr.control_node_menu_id
    : "data-ctrl-n-menu-id";
  const alamCard = Object.assign({}, FamilyTree.templates.base);

  alamCard.size = [240, 112];
  alamCard.padding = [18, 18, 18, 18];
  alamCard.defs = `${FamilyTree.templates.base.defs}
    <clipPath id="alam_card_img"><rect x="18" y="24" width="64" height="64" rx="16" ry="16"></rect></clipPath>
    <g id="alam_node_menu" style="cursor:pointer;">
      <rect x="0" y="0" width="26" height="26" rx="10" fill="#F1FAF4"></rect>
      <circle cx="7" cy="13" r="2" fill="#2E8B57"></circle>
      <circle cx="13" cy="13" r="2" fill="#2E8B57"></circle>
      <circle cx="19" cy="13" r="2" fill="#2E8B57"></circle>
    </g>`;
  alamCard.node = `
    <g class="alam-card">
      <rect class="alam-card-surface" x="0" y="0" width="{w}" height="{h}" rx="16" ry="16" fill="#FFFFFF" stroke="#DDEBE2" stroke-width="1.5"></rect>
      <rect class="alam-card-accent" x="0" y="0" width="6" height="{h}" rx="3" ry="3" fill="#2E8B57"></rect>
      <rect class="alam-card-avatar-well" x="18" y="24" width="64" height="64" rx="16" ry="16" fill="#E6F3EA"></rect>
    </g>`;
  alamCard.link = `<path stroke-linejoin="round" stroke="#000000" stroke-width="3px" fill="none" d="{rounded}" />`;
  alamCard.field_0 = `<text class="alam-card-name" ${widthAttribute}="130" style="font-family: Outfit, sans-serif;font-size:18px;font-weight:700;" fill="#1F4933" x="98" y="43" text-anchor="start">{val}</text>`;
  alamCard.field_1 = `<text class="alam-card-meta" ${widthAttribute}="132" style="font-family: 'Atkinson Hyperlegible', sans-serif;font-size:14px;" fill="#668071" x="98" y="66" text-anchor="start">{val}</text>`;
  alamCard.field_2 = `<text class="alam-card-status" ${widthAttribute}="132" style="font-family: 'Atkinson Hyperlegible', sans-serif;font-size:12px;font-weight:700;" fill="#246B43" x="98" y="89" text-anchor="start">{val}</text>`;
  alamCard.field_3 = `<text class="alam-card-initials" style="font-family: Outfit, sans-serif;font-size:20px;font-weight:700;" fill="#246B43" x="50" y="62" text-anchor="middle">{val}</text>`;
  alamCard.img_0 = `<image class="alam-card-avatar-image" preserveAspectRatio="xMidYMid slice" clip-path="url(#alam_card_img)" xlink:href="{val}" x="18" y="24" width="64" height="64"></image>`;
  alamCard.nodeMenuButton = `<use x="207" y="13" ${menuAttribute}="{id}" xlink:href="#alam_node_menu"/>`;

  FamilyTree.templates.alamCard = alamCard;
  FamilyTree.templates.alamCard_male = Object.assign({}, alamCard);
  FamilyTree.templates.alamCard_female = Object.assign({}, alamCard);
}

function initFamilyTree() {
  if (typeof FamilyTree === "undefined") {
    throw new Error("Pohon keluarga belum siap digunakan.");
  }

  registerAlamCardTemplate();

  runtime.familyTree = new FamilyTree(elements.tree, {
    template: "alamCard",
    mode: "light",
    enableSearch: false,
    nodeMouseClick: FamilyTree.action.none,
    mouseWheel: FamilyTree.action.zoom,
    pinch: true,
    scaleInitial: window.innerWidth <= 640 ? 0.52 : 0.68,
    orientation: FamilyTree.orientation.left,
    nodeBinding: {
      field_0: "name",
      field_1: "node_meta",
      field_2: "node_status",
      field_3: "initials",
      img_0: "img"
    },
    nodeMenu: {
      details: {
        text: "Detail anggota",
        onClick(nodeId) {
          showDetailModal(runtime.nodes.find((person) => String(person.id) === String(nodeId)));
        }
      }
    }
  });

  if (typeof runtime.familyTree.onNodeClick === "function") {
    runtime.familyTree.onNodeClick((args) => {
      if (args && args.node) showDetailModal(args.node);
    });
  }
}

function callTreeMethod(action, message) {
  if (!runtime.familyTree) {
    announce("Data keluarga belum siap dijelajahi.");
    return;
  }

  if (action === "zoom-in" && typeof runtime.familyTree.zoom === "function") {
    runtime.familyTree.zoom(true);
  } else if (action === "zoom-out" && typeof runtime.familyTree.zoom === "function") {
    runtime.familyTree.zoom(false);
  } else if (action === "fit" && typeof runtime.familyTree.fit === "function") {
    runtime.familyTree.fit();
  } else {
    announce("Geser kanvas atau gunakan cubit layar untuk menjelajahi pohon.");
    return;
  }

  announce(message);
}
