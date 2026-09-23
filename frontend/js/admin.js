// IMPACTFRAME Admin & Crew Vault Controller
// Handles Film Archive, Audition Submissions Datasheet, and Form Customizer
document.addEventListener("DOMContentLoaded", () => {
  const CATEGORIES = ["All", "Short Film", "AI Film", "Documentary"];
  let currentFilter = "All";
  let filmsList = [];
  let submissionsList = [];
  let formFieldsList = [];

  // Lock Gate Elements
  const lockGateSection = document.getElementById("crew-lock-gate");
  const lockGateForm = document.getElementById("lock-gate-form");
  const vaultUsernameInput = document.getElementById("vault-username-input");
  const vaultPasswordInput = document.getElementById("vault-password-input");
  const togglePwBtn = document.getElementById("toggle-pw-visibility");
  const lockErrorMsg = document.getElementById("lock-error-msg");
  const vaultUnlockBtn = document.getElementById("vault-unlock-btn");

  // Dashboard Common Elements
  const adminContentView = document.getElementById("admin-content-view");
  const statusBadge = document.getElementById("backend-status-badge");
  const lockVaultBtn = document.getElementById("lock-vault-btn");
  const notificationBox = document.getElementById("admin-notification");
  const datasheetCountBadge = document.getElementById("datasheet-count-badge");
  const auditCountBadge = document.getElementById("audit-count-badge");
  const operatorUsername = document.getElementById("operator-username");
  const operatorRoleBadge = document.getElementById("operator-role-badge");

  // Tab Navigation Elements
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabBtnUsers = document.getElementById("tab-btn-users");
  const tabPanels = {
    films: document.getElementById("panel-films"),
    datasheet: document.getElementById("panel-datasheet"),
    forms: document.getElementById("panel-forms"),
    audit: document.getElementById("panel-audit"),
    users: document.getElementById("panel-users"),
  };

  // Film Catalog Elements
  const filterBar = document.getElementById("admin-filters");
  const filmsContainer = document.getElementById("admin-films-container");
  const openAddModalBtn = document.getElementById("open-add-modal-btn");
  const filmModal = document.getElementById("film-modal");
  const filmModalTitle = document.getElementById("modal-title");
  const filmModalCloseBtn = document.getElementById("modal-close-btn");
  const filmModalCancelBtn = document.getElementById("modal-cancel-btn");
  const filmForm = document.getElementById("film-form");
  const filmIdInput = document.getElementById("film-id");
  const filmTitleInput = document.getElementById("film-title");
  const filmCategoryInput = document.getElementById("film-category");
  const filmDurationInput = document.getElementById("film-duration");
  const filmYearInput = document.getElementById("film-year");
  const filmUrlInput = document.getElementById("film-url");
  const filmSynopsisInput = document.getElementById("film-synopsis");
  const videoPreviewBox = document.getElementById("video-preview-box");
  const previewIframe = document.getElementById("preview-iframe");

  // Datasheet Elements
  const datasheetSearchInput = document.getElementById("datasheet-search-input");
  const datasheetRoleFilter = document.getElementById("datasheet-role-filter");
  const datasheetStatusFilter = document.getElementById("datasheet-status-filter");
  const refreshDatasheetBtn = document.getElementById("refresh-datasheet-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const datasheetTableBody = document.getElementById("datasheet-table-body");

  // Submission Detail Modal Elements
  const subDetailModal = document.getElementById("submission-detail-modal");
  const subDetailTitle = document.getElementById("sub-detail-title");
  const subDetailSummary = document.getElementById("sub-detail-summary");
  const subDetailAnswers = document.getElementById("sub-detail-answers");
  const subDetailCloseBtn = document.getElementById("sub-detail-close-btn");
  const subDetailDismissBtn = document.getElementById("sub-detail-dismiss-btn");

  // Form Customizer Elements
  const openAddFieldModalBtn = document.getElementById("open-add-field-modal-btn");
  const formBuilderContainer = document.getElementById("form-builder-container");
  const fieldModal = document.getElementById("field-modal");
  const fieldModalTitle = document.getElementById("field-modal-title");
  const fieldModalCloseBtn = document.getElementById("field-modal-close-btn");
  const fieldModalCancelBtn = document.getElementById("field-modal-cancel-btn");
  const fieldForm = document.getElementById("field-form");
  const fieldIdInput = document.getElementById("field-id");
  const fieldLabelInput = document.getElementById("field-label");
  const fieldKeyInput = document.getElementById("field-key");
  const fieldTypeSelect = document.getElementById("field-type");
  const fieldOptionsGroup = document.getElementById("field-options-group");
  const fieldOptionsInput = document.getElementById("field-options");
  const fieldRequiredInput = document.getElementById("field-required");
  const fieldOrderInput = document.getElementById("field-order");

  // Access Logs Datasheet Elements
  const auditSearchInput = document.getElementById("audit-search-input");
  const auditStatusFilter = document.getElementById("audit-status-filter");
  const auditUserFilter = document.getElementById("audit-user-filter");
  const refreshAuditBtn = document.getElementById("refresh-audit-btn");
  const exportAuditCsvBtn = document.getElementById("export-audit-csv-btn");
  const auditTableBody = document.getElementById("audit-table-body");
  let auditLogsList = [];

  // Crew Logins Management Elements
  const usersListContainer = document.getElementById("users-list-container");
  const openAddUserModalBtn = document.getElementById("open-add-user-modal-btn");
  const userModal = document.getElementById("user-modal");
  const userModalTitle = document.getElementById("user-modal-title");
  const userModalCloseBtn = document.getElementById("user-modal-close-btn");
  const userModalCancelBtn = document.getElementById("user-modal-cancel-btn");
  const userForm = document.getElementById("user-form");
  const crewNameInput = document.getElementById("crew-name-input");
  const usernamePreviewTag = document.getElementById("username-preview-tag");
  const crewPasswordInput = document.getElementById("crew-password-input");
  const userModalError = document.getElementById("user-modal-error");
  const userModalSubmitBtn = document.getElementById("user-modal-submit-btn");
  let crewUsersList = [];

  // Password visibility toggle
  if (togglePwBtn) {
    togglePwBtn.addEventListener("click", () => {
      const isPassword = vaultPasswordInput.type === "password";
      vaultPasswordInput.type = isPassword ? "text" : "password";
    });
  }

  // Check initial authentication
  if (window.impactframeApi.isCrewAuthenticated()) {
    showDashboard();
  } else {
    showLockGate();
  }

  // Navigation away from admin booth:
  // When the user clicks ANY link to leave admin booth (Home, Gallery, About, Events, etc.),
  // finalize the session, record duration in audit log, and clear session tokens.
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.includes("admin.html") || href.startsWith("javascript:")) {
      return;
    }
    link.addEventListener("click", () => {
      window.impactframeApi.logoutAdminBeacon();
      window.impactframeApi.clearAdminAuth();
    });
  });

  // When restored from browser back/forward cache (bfcache) after navigating to another page:
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.impactframeApi.logoutAdminBeacon();
      window.impactframeApi.clearAdminAuth();
      showLockGate();
    }
  });

  function showLockGate() {
    lockGateSection.style.display = "flex";
    adminContentView.style.display = "none";
    if (vaultPasswordInput) vaultPasswordInput.value = "";
    if (lockErrorMsg) lockErrorMsg.style.display = "none";
  }

  function showDashboard() {
    const session = window.impactframeApi.getCurrentSession();
    if (operatorUsername) {
      operatorUsername.textContent = session ? session.username : "ADMIN_MAIN";
    }
    if (operatorRoleBadge) {
      const isMain = session && session.role === "MAIN";
      operatorRoleBadge.textContent = isMain ? "MAIN" : "CREW";
      operatorRoleBadge.className = isMain ? "role-badge-main" : "role-badge-crew";
    }

    // Only master ADMIN_MAIN can see and provision crew logins
    if (tabBtnUsers) {
      const isMain = session && session.role === "MAIN";
      tabBtnUsers.style.display = isMain ? "inline-flex" : "none";
    }

    lockGateSection.style.display = "none";
    adminContentView.style.display = "block";
    updateStatusBadge();
    renderFilterChips();
    loadAllFilms();
    loadSubmissions();
    loadFormFields();
    loadAuditLogs();
    if (session && session.role === "MAIN") {
      loadCrewUsers();
    }
  }

  // Multi-user authentication form submission handler
  lockGateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = vaultUsernameInput ? vaultUsernameInput.value.trim() : "ADMIN_MAIN";
    const pw = vaultPasswordInput ? vaultPasswordInput.value.trim() : "";
    if (!pw) return;

    vaultUnlockBtn.disabled = true;
    vaultUnlockBtn.textContent = "Verifying…";
    lockErrorMsg.style.display = "none";

    try {
      const res = await window.impactframeApi.loginAdmin(username, pw);
      if (res.success) {
        showDashboard();
      } else {
        lockErrorMsg.textContent = res.error || "Incorrect credentials. Access denied.";
        lockErrorMsg.style.display = "block";
        vaultPasswordInput.focus();
      }
    } catch (err) {
      lockErrorMsg.textContent = "Connection error. Please verify backend is running on port 4000.";
      lockErrorMsg.style.display = "block";
    } finally {
      vaultUnlockBtn.disabled = false;
      vaultUnlockBtn.innerHTML = "Authenticate & Unlock Booth &rarr;";
    }
  });

  // Lock Vault / Logout button
  if (lockVaultBtn) {
    lockVaultBtn.addEventListener("click", async () => {
      await window.impactframeApi.logoutAdmin();
      showLockGate();
      showNotice("Projection booth locked. Session finalized.", "info");
    });
  }

  function showNotice(msg, type = "info") {
    notificationBox.textContent = msg;
    notificationBox.className = `admin-notification ${type}`;
    notificationBox.style.display = "block";
    clearTimeout(notificationBox._timer);
    notificationBox._timer = setTimeout(() => {
      notificationBox.style.display = "none";
    }, 4500);
  }

  async function updateStatusBadge() {
    const isOnline = await window.impactframeApi.checkBackendOnline();
    if (isOnline) {
      statusBadge.className = "status-badge online";
      statusBadge.querySelector(".text").textContent = "Connected to Express Backend (Port 4000)";
    } else {
      statusBadge.className = "status-badge offline";
      statusBadge.querySelector(".text").textContent = "Offline Mode (Local Storage fallback)";
    }
  }

  // Tab Navigation Handling
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      Object.entries(tabPanels).forEach(([key, panel]) => {
        if (panel) {
          if (key === tab) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        }
      });

      if (tab === "datasheet") loadSubmissions();
      if (tab === "forms") loadFormFields();
      if (tab === "audit") loadAuditLogs();
      if (tab === "users") loadCrewUsers();
    });
  });

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ==========================================================================
     TAB 1: FILMS CATALOG
     ========================================================================== */
  function renderFilterChips() {
    filterBar.innerHTML = CATEGORIES.map(
      (c) => `<button type="button" class="chip" data-category="${c}" aria-pressed="${c === currentFilter}">${c}</button>`
    ).join("");

    filterBar.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        currentFilter = chip.dataset.category;
        renderFilterChips();
        renderFilms();
      });
    });
  }

  function renderFilms() {
    let filtered = filmsList;
    if (currentFilter !== "All") {
      filtered = filmsList.filter((f) => f.category === currentFilter);
    }

    if (filtered.length === 0) {
      filmsContainer.innerHTML = `<p class="state-msg">No films match this category yet. Click "+ Add Film / Reel" to create one.</p>`;
      return;
    }

    filmsContainer.innerHTML = filtered
      .map(
        (film) => `
      <div class="admin-film-row sprocket-frame" data-id="${film.id}">
        <div class="admin-film-thumb">
          <iframe src="${film.video_url}" title="${escapeHtml(film.title)}" loading="lazy" allowfullscreen></iframe>
        </div>
        <div class="admin-film-info">
          <div class="admin-film-headline">
            <h3>${escapeHtml(film.title)}</h3>
            <span class="category-pill">${film.category}</span>
          </div>
          <div class="meta">${film.duration_minutes} mins · Year ${film.release_year}</div>
          <p class="synopsis">${escapeHtml(film.synopsis)}</p>
        </div>
        <div class="admin-film-actions">
          <button type="button" class="btn btn-ghost btn-sm edit-film-btn" data-id="${film.id}">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm delete-film-btn" data-id="${film.id}">Delete</button>
        </div>
      </div>
    `
      )
      .join("");

    filmsContainer.querySelectorAll(".edit-film-btn").forEach((btn) => {
      btn.addEventListener("click", () => openFilmEditModal(btn.dataset.id));
    });

    filmsContainer.querySelectorAll(".delete-film-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteFilm(btn.dataset.id));
    });
  }

  async function loadAllFilms() {
    filmsContainer.innerHTML = `<p class="state-msg">Loading archive catalog…</p>`;
    try {
      filmsList = await window.impactframeApi.getFilms("All");
      renderFilms();
    } catch (err) {
      filmsContainer.innerHTML = `<p class="state-msg">Failed to load films (${err.message}).</p>`;
    }
  }

  // Real-time video preview
  filmUrlInput.addEventListener("input", () => {
    const rawUrl = filmUrlInput.value.trim();
    if (!rawUrl) {
      videoPreviewBox.style.display = "none";
      previewIframe.src = "";
      return;
    }
    const embedUrl = window.impactframeApi.formatEmbedUrl(rawUrl);
    if (embedUrl) {
      previewIframe.src = embedUrl;
      videoPreviewBox.style.display = "block";
    }
  });

  function openAddFilmModal() {
    filmModalTitle.textContent = "Add New Film / Reel";
    filmIdInput.value = "";
    filmTitleInput.value = "";
    filmCategoryInput.value = "Short Film";
    filmDurationInput.value = "";
    filmYearInput.value = new Date().getFullYear();
    filmUrlInput.value = "";
    filmSynopsisInput.value = "";
    videoPreviewBox.style.display = "none";
    previewIframe.src = "";
    filmModal.style.display = "flex";
  }

  function openFilmEditModal(id) {
    const film = filmsList.find((f) => String(f.id) === String(id));
    if (!film) return;

    filmModalTitle.textContent = `Edit: ${film.title}`;
    filmIdInput.value = film.id;
    filmTitleInput.value = film.title;
    filmCategoryInput.value = film.category;
    filmDurationInput.value = film.duration_minutes;
    filmYearInput.value = film.release_year;
    filmUrlInput.value = film.video_url;
    filmSynopsisInput.value = film.synopsis;

    const embedUrl = window.impactframeApi.formatEmbedUrl(film.video_url);
    if (embedUrl) {
      previewIframe.src = embedUrl;
      videoPreviewBox.style.display = "block";
    } else {
      videoPreviewBox.style.display = "none";
    }

    filmModal.style.display = "flex";
  }

  function closeFilmModal() {
    filmModal.style.display = "none";
    previewIframe.src = "";
  }

  filmModalCloseBtn.addEventListener("click", closeFilmModal);
  filmModalCancelBtn.addEventListener("click", closeFilmModal);
  filmModal.addEventListener("click", (e) => {
    if (e.target === filmModal) closeFilmModal();
  });
  openAddModalBtn.addEventListener("click", openAddFilmModal);

  filmForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = filmIdInput.value;
    const filmData = {
      title: filmTitleInput.value.trim(),
      category: filmCategoryInput.value,
      duration_minutes: parseInt(filmDurationInput.value, 10),
      release_year: parseInt(filmYearInput.value, 10),
      video_url: filmUrlInput.value.trim(),
      synopsis: filmSynopsisInput.value.trim(),
      thumbnail_url: "",
    };

    try {
      if (id) {
        await window.impactframeApi.updateFilm(id, filmData);
        showNotice(`Film "${filmData.title}" updated successfully!`, "success");
      } else {
        await window.impactframeApi.createFilm(filmData);
        showNotice(`Film "${filmData.title}" saved to archive!`, "success");
      }
      closeFilmModal();
      await loadAllFilms();
      updateStatusBadge();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  async function handleDeleteFilm(id) {
    const film = filmsList.find((f) => String(f.id) === String(id));
    const title = film ? film.title : "this project";
    if (!confirm(`Are you sure you want to remove "${title}" from the public archive?`)) {
      return;
    }

    try {
      await window.impactframeApi.deleteFilm(id);
      showNotice(`Film deleted successfully.`, "success");
      await loadAllFilms();
      updateStatusBadge();
    } catch (err) {
      showNotice(err.message, "error");
    }
  }

  /* ==========================================================================
     TAB 2: AUDITIONS & SUBMISSIONS DATASHEET
     ========================================================================== */
  async function loadSubmissions() {
    datasheetTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--parchment-dim);">
          Loading submissions datasheet…
        </td>
      </tr>
    `;

    const filters = {
      role: datasheetRoleFilter.value !== "All" ? datasheetRoleFilter.value : "",
      status: datasheetStatusFilter.value !== "All" ? datasheetStatusFilter.value : "",
      q: datasheetSearchInput.value.trim(),
    };

    try {
      submissionsList = await window.impactframeApi.getSubmissions(filters);
      if (datasheetCountBadge) {
        datasheetCountBadge.textContent = submissionsList.length;
      }
      renderDatasheet();
    } catch (err) {
      console.error("Failed to load submissions:", err);
      datasheetTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #ff9999;">
            Failed to load submissions: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  function renderDatasheet() {
    if (!submissionsList || submissionsList.length === 0) {
      datasheetTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px; color: var(--parchment-dim);">
            No audition submissions match your search or filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    datasheetTableBody.innerHTML = submissionsList
      .map((sub) => {
        const formattedDate = sub.created_at
          ? new Date(sub.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        const statusClass = `status-${(sub.status || "new").toLowerCase().replace(/[^a-z]/g, "")}`;

        return `
        <tr data-sub-id="${sub.id}">
          <td style="font-family: monospace; font-weight: 600; color: var(--amber); font-size: 0.85rem;">
            #IF-${String(sub.id).padStart(3, "0")}
          </td>
          <td style="font-size: 0.85rem; color: var(--parchment-dim); white-space: nowrap;">
            ${formattedDate}
          </td>
          <td>
            <strong style="color: var(--paper); font-size: 0.95rem; display: block;">${escapeHtml(sub.applicant_name)}</strong>
          </td>
          <td style="font-size: 0.85rem;">
            ${
              sub.applicant_email
                ? `<div><a href="mailto:${escapeHtml(sub.applicant_email)}" style="color: var(--leaf-light); text-decoration: underline;">${escapeHtml(sub.applicant_email)}</a></div>`
                : ""
            }
            ${
              sub.applicant_phone
                ? `<div><a href="https://wa.me/${escapeHtml(sub.applicant_phone).replace(/[^0-9]/g, "")}" target="_blank" rel="noopener" style="color: var(--parchment-dim);">${escapeHtml(sub.applicant_phone)}</a></div>`
                : ""
            }
          </td>
          <td>
            <span class="hud-pill" style="font-size: 0.72rem; padding: 2px 8px;">
              ${escapeHtml(sub.role_interest || "General")}
            </span>
          </td>
          <td>
            <select class="status-select ${statusClass}" data-sub-id="${sub.id}">
              <option value="New" ${sub.status === "New" ? "selected" : ""}>New</option>
              <option value="Reviewing" ${sub.status === "Reviewing" ? "selected" : ""}>Reviewing</option>
              <option value="Shortlisted" ${sub.status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
              <option value="Accepted" ${sub.status === "Accepted" ? "selected" : ""}>Accepted</option>
              <option value="Rejected" ${sub.status === "Rejected" ? "selected" : ""}>Rejected</option>
            </select>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-ghost btn-sm view-sub-btn" data-sub-id="${sub.id}" style="padding: 4px 10px; font-size: 0.8rem;">
              Inspect
            </button>
            <button type="button" class="btn btn-ghost btn-sm delete-sub-btn" data-sub-id="${sub.id}" style="padding: 4px 10px; font-size: 0.8rem; color: #ff8888;">
              Delete
            </button>
          </td>
        </tr>
      `;
      })
      .join("");

    // Status change listener
    datasheetTableBody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.dataset.subId;
        const newStatus = sel.value;
        sel.disabled = true;
        try {
          await window.impactframeApi.updateSubmissionStatus(id, newStatus);
          sel.className = `status-select status-${newStatus.toLowerCase()}`;
          showNotice(`Status for applicant #${id} set to ${newStatus}`, "success");
        } catch (err) {
          showNotice(`Failed to update status: ${err.message}`, "error");
        } finally {
          sel.disabled = false;
        }
      });
    });

    // Inspect Details listener
    datasheetTableBody.querySelectorAll(".view-sub-btn").forEach((btn) => {
      btn.addEventListener("click", () => openSubmissionDetail(btn.dataset.subId));
    });

    // Delete submission listener
    datasheetTableBody.querySelectorAll(".delete-sub-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteSubmission(btn.dataset.subId));
    });
  }

  function openSubmissionDetail(id) {
    const sub = submissionsList.find((s) => String(s.id) === String(id));
    if (!sub) return;

    subDetailTitle.textContent = `${sub.applicant_name} — Application Details`;

    const subData = sub.data || {};
    subDetailSummary.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 0.8rem; color: var(--parchment-dim);">ID #IF-${String(sub.id).padStart(3, "0")} · Submitted ${new Date(sub.created_at).toLocaleString()}</span>
          <h4 style="margin: 4px 0 0; color: var(--paper); font-size: 1.15rem;">${escapeHtml(sub.applicant_name)}</h4>
        </div>
        <span class="hud-pill"><span class="rec-dot"></span> ${escapeHtml(sub.status || "New")}</span>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 0.88rem; flex-wrap: wrap;">
        ${sub.applicant_email ? `<div><strong>Email:</strong> <a href="mailto:${escapeHtml(sub.applicant_email)}" style="color: var(--leaf-light);">${escapeHtml(sub.applicant_email)}</a></div>` : ""}
        ${sub.applicant_phone ? `<div><strong>Phone:</strong> <a href="tel:${escapeHtml(sub.applicant_phone)}" style="color: var(--parchment);">${escapeHtml(sub.applicant_phone)}</a></div>` : ""}
        ${sub.role_interest ? `<div><strong>Role:</strong> <span style="color: var(--amber);">${escapeHtml(sub.role_interest)}</span></div>` : ""}
      </div>
    `;

    subDetailAnswers.innerHTML = "";
    Object.entries(subData).forEach(([key, val]) => {
      const dt = document.createElement("dt");
      dt.textContent = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const dd = document.createElement("dd");
      const strVal = String(val || "—");

      if (strVal.startsWith("http://") || strVal.startsWith("https://")) {
        dd.innerHTML = `<a href="${escapeHtml(strVal)}" target="_blank" rel="noopener" style="color: var(--leaf-light); text-decoration: underline;">${escapeHtml(strVal)} &nearr;</a>`;
      } else {
        dd.textContent = strVal;
      }

      subDetailAnswers.appendChild(dt);
      subDetailAnswers.appendChild(dd);
    });

    subDetailModal.style.display = "flex";
  }

  function closeSubmissionDetail() {
    subDetailModal.style.display = "none";
  }

  subDetailCloseBtn.addEventListener("click", closeSubmissionDetail);
  subDetailDismissBtn.addEventListener("click", closeSubmissionDetail);
  subDetailModal.addEventListener("click", (e) => {
    if (e.target === subDetailModal) closeSubmissionDetail();
  });

  async function handleDeleteSubmission(id) {
    if (!confirm(`Delete applicant record #${id}? This action cannot be undone.`)) {
      return;
    }
    try {
      await window.impactframeApi.deleteSubmission(id);
      showNotice(`Applicant record #${id} removed.`, "success");
      loadSubmissions();
    } catch (err) {
      showNotice(err.message, "error");
    }
  }

  // Filter & Search Event Listeners
  let searchTimer;
  datasheetSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadSubmissions, 300);
  });
  datasheetRoleFilter.addEventListener("change", loadSubmissions);
  datasheetStatusFilter.addEventListener("change", loadSubmissions);
  refreshDatasheetBtn.addEventListener("click", loadSubmissions);

  // 1-Click CSV Export Trigger
  exportCsvBtn.addEventListener("click", () => {
    window.impactframeApi.exportSubmissionsCsv(submissionsList);
  });

  /* ==========================================================================
     TAB 3: AUDITIONS FORM CUSTOMIZER
     ========================================================================== */
  async function loadFormFields() {
    formBuilderContainer.innerHTML = `<p class="state-msg">Loading question fields…</p>`;
    try {
      formFieldsList = await window.impactframeApi.getAllFormFields();
      renderFormFields();
    } catch (err) {
      formBuilderContainer.innerHTML = `<p class="state-msg">Failed to load fields (${escapeHtml(err.message)})</p>`;
    }
  }

  function renderFormFields() {
    if (!formFieldsList || formFieldsList.length === 0) {
      formBuilderContainer.innerHTML = `<p class="state-msg">No custom questions created yet. Click "+ Add New Question" above.</p>`;
      return;
    }

    formBuilderContainer.innerHTML = formFieldsList
      .map((field) => {
        const isActive = field.is_active !== 0;
        return `
        <div class="form-field-card sprocket-frame ${!isActive ? "is-disabled" : ""}" data-field-id="${field.id}">
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="color: var(--paper); font-size: 1.05rem;">${escapeHtml(field.label)}</strong>
              ${
                field.required
                  ? '<span class="req-badge" title="Candidate must answer">* Required</span>'
                  : '<span class="opt-badge">Optional</span>'
              }
            </div>
            <div class="form-field-meta">
              <span>Key: <span class="field-type-pill">${escapeHtml(field.field_key)}</span></span>
              <span>Type: <strong style="color: var(--leaf-light);">${field.type}</strong></span>
              <span>Order: ${field.sort_order}</span>
              <span>Status: <strong style="color: ${isActive ? "#86efac" : "#fca5a5"};">${isActive ? "Active (Visible)" : "Disabled"}</strong></span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-ghost btn-sm toggle-field-status-btn" data-field-id="${field.id}" data-current-active="${isActive}">
              ${isActive ? "Disable" : "Enable"}
            </button>
            <button type="button" class="btn btn-ghost btn-sm edit-field-btn" data-field-id="${field.id}">
              Edit
            </button>
            <button type="button" class="btn btn-ghost btn-sm delete-field-btn" data-field-id="${field.id}" style="color: #ff8888;">
              Delete
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    // Toggle active status
    formBuilderContainer.querySelectorAll(".toggle-field-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.fieldId;
        const currentActive = btn.dataset.currentActive === "true";
        try {
          await window.impactframeApi.updateFormField(id, { is_active: !currentActive });
          showNotice(`Question status updated.`, "success");
          loadFormFields();
        } catch (err) {
          showNotice(err.message, "error");
        }
      });
    });

    // Edit field
    formBuilderContainer.querySelectorAll(".edit-field-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditFieldModal(btn.dataset.fieldId));
    });

    // Delete field
    formBuilderContainer.querySelectorAll(".delete-field-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteField(btn.dataset.fieldId));
    });
  }

  function openAddFieldModal() {
    fieldModalTitle.textContent = "Add New Form Question";
    fieldIdInput.value = "";
    fieldLabelInput.value = "";
    fieldKeyInput.value = "";
    fieldKeyInput.readOnly = false;
    fieldTypeSelect.value = "text";
    fieldOptionsGroup.style.display = "none";
    fieldOptionsInput.value = "";
    fieldRequiredInput.checked = false;
    fieldOrderInput.value = (formFieldsList.length + 1) * 2;
    fieldModal.style.display = "flex";
  }

  function openEditFieldModal(id) {
    const field = formFieldsList.find((f) => String(f.id) === String(id));
    if (!field) return;

    fieldModalTitle.textContent = `Edit Question: ${field.label}`;
    fieldIdInput.value = field.id;
    fieldLabelInput.value = field.label;
    fieldKeyInput.value = field.field_key;
    fieldKeyInput.readOnly = true; // Protect key name on update
    fieldTypeSelect.value = field.type || "text";

    if (field.type === "select") {
      fieldOptionsGroup.style.display = "block";
      const opts = Array.isArray(field.options) ? field.options.join(", ") : field.options || "";
      fieldOptionsInput.value = opts;
    } else {
      fieldOptionsGroup.style.display = "none";
      fieldOptionsInput.value = "";
    }

    fieldRequiredInput.checked = Boolean(field.required);
    fieldOrderInput.value = field.sort_order || 10;
    fieldModal.style.display = "flex";
  }

  function closeFieldModal() {
    fieldModal.style.display = "none";
  }

  fieldTypeSelect.addEventListener("change", () => {
    if (fieldTypeSelect.value === "select") {
      fieldOptionsGroup.style.display = "block";
    } else {
      fieldOptionsGroup.style.display = "none";
    }
  });

  // Auto slugify field key from label if new
  fieldLabelInput.addEventListener("input", () => {
    if (!fieldIdInput.value && !fieldKeyInput.value) {
      fieldKeyInput.value = fieldLabelInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 30);
    }
  });

  fieldModalCloseBtn.addEventListener("click", closeFieldModal);
  fieldModalCancelBtn.addEventListener("click", closeFieldModal);
  fieldModal.addEventListener("click", (e) => {
    if (e.target === fieldModal) closeFieldModal();
  });
  openAddFieldModalBtn.addEventListener("click", openAddFieldModal);

  fieldForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = fieldIdInput.value;
    const type = fieldTypeSelect.value;
    let options = [];
    if (type === "select") {
      options = fieldOptionsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const payload = {
      label: fieldLabelInput.value.trim(),
      field_key: fieldKeyInput.value.trim().toLowerCase(),
      type: type,
      options: options,
      required: fieldRequiredInput.checked ? 1 : 0,
      sort_order: parseInt(fieldOrderInput.value, 10) || 10,
    };

    try {
      if (id) {
        await window.impactframeApi.updateFormField(id, payload);
        showNotice(`Question updated successfully!`, "success");
      } else {
        await window.impactframeApi.createFormField(payload);
        showNotice(`New question added to audition sheet!`, "success");
      }
      closeFieldModal();
      loadFormFields();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  async function handleDeleteField(id) {
    const field = formFieldsList.find((f) => String(f.id) === String(id));
    const label = field ? field.label : "this question";
    if (!confirm(`Are you sure you want to permanently remove "${label}" from the application form?`)) {
      return;
    }
    try {
      await window.impactframeApi.deleteFormField(id);
      showNotice(`Question deleted from application form.`, "success");
      loadFormFields();
    } catch (err) {
      showNotice(err.message, "error");
    }
  }

  /* ==========================================================================
     TAB 4: ACCESS LOGS & AUDIT TRAIL DATASHEET
     ========================================================================== */
  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return "—";
    const s = Math.max(0, parseInt(seconds, 10));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const remS = s % 60;
    if (m < 60) return `${m}m ${remS}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }

  function formatTimestamp(isoStr) {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  }

  async function loadAuditLogs() {
    if (!auditTableBody) return;
    auditTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 28px; color: var(--parchment-dim);">
          Loading access logs datasheet…
        </td>
      </tr>
    `;

    const filters = {
      q: auditSearchInput ? auditSearchInput.value.trim() : "",
      status: auditStatusFilter ? auditStatusFilter.value : "All",
      username: auditUserFilter ? auditUserFilter.value : "All",
    };

    try {
      auditLogsList = await window.impactframeApi.getAuditLogs(filters);
      renderAuditLogs();
    } catch (err) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #fca5a5;">
            Failed to load access logs (${escapeHtml(err.message)})
          </td>
        </tr>
      `;
    }
  }

  function renderAuditLogs() {
    if (auditCountBadge) {
      auditCountBadge.textContent = auditLogsList.length;
    }

    // Populate user filter if needed
    if (auditUserFilter) {
      const currentSelected = auditUserFilter.value;
      const userSet = new Set(auditLogsList.map((l) => l.username).filter(Boolean));
      // Keep "All Users" option
      auditUserFilter.innerHTML = '<option value="All">All Users</option>';
      userSet.forEach((uname) => {
        const opt = document.createElement("option");
        opt.value = uname;
        opt.textContent = uname;
        if (uname === currentSelected) opt.selected = true;
        auditUserFilter.appendChild(opt);
      });
    }

    if (!auditLogsList.length) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px; color: var(--parchment-dim);">
            No access logs match current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    auditTableBody.innerHTML = auditLogsList
      .map((log) => {
        const isActive = log.status === "ACTIVE";
        const roleClass = log.role === "MAIN" ? "role-badge-main" : "role-badge-crew";
        const durationText = isActive
          ? `Active (${formatDuration(log.computed_duration ?? 0)})`
          : formatDuration(log.duration_seconds ?? log.computed_duration ?? 0);

        return `
        <tr>
          <td><code style="font-size: 0.78rem; color: var(--leaf-light);">${escapeHtml((log.session_id || "").slice(0, 16))}…</code></td>
          <td><strong style="color: var(--paper);">${escapeHtml(log.username)}</strong></td>
          <td><span class="${roleClass}">${escapeHtml(log.role)}</span></td>
          <td style="white-space: nowrap;">${formatTimestamp(log.login_time)}</td>
          <td style="white-space: nowrap;">
            ${
              isActive
                ? `<span style="color: #4ade80; font-size: 0.85rem;"><span class="pulse-dot"></span>Session In Progress</span>`
                : formatTimestamp(log.logout_time)
            }
          </td>
          <td style="white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 500;">
            ${durationText}
          </td>
          <td>
            <span class="status-pill ${isActive ? "status-active" : "status-closed"}">
              ${isActive ? '<span class="pulse-dot"></span>ACTIVE' : "LOGGED OUT"}
            </span>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // Audit event listeners
  let auditSearchTimer;
  if (auditSearchInput) {
    auditSearchInput.addEventListener("input", () => {
      clearTimeout(auditSearchTimer);
      auditSearchTimer = setTimeout(loadAuditLogs, 300);
    });
  }
  if (auditStatusFilter) auditStatusFilter.addEventListener("change", loadAuditLogs);
  if (auditUserFilter) auditUserFilter.addEventListener("change", loadAuditLogs);
  if (refreshAuditBtn) refreshAuditBtn.addEventListener("click", loadAuditLogs);
  if (exportAuditCsvBtn) {
    exportAuditCsvBtn.addEventListener("click", () => {
      window.impactframeApi.exportAuditLogsCsv(auditLogsList);
    });
  }

  /* ==========================================================================
     TAB 5: CREW LOGINS MANAGEMENT (ADMIN_MAIN)
     ========================================================================== */
  async function loadCrewUsers() {
    if (!usersListContainer) return;
    usersListContainer.innerHTML = `<p class="state-msg">Loading crew logins…</p>`;
    try {
      crewUsersList = await window.impactframeApi.getCrewUsers();
      renderCrewUsers();
    } catch (err) {
      usersListContainer.innerHTML = `<p class="state-msg" style="color: #fca5a5;">Failed to load crew accounts (${escapeHtml(err.message)})</p>`;
    }
  }

  function renderCrewUsers() {
    if (!crewUsersList.length) {
      usersListContainer.innerHTML = `<p class="state-msg">No crew accounts found.</p>`;
      return;
    }

    usersListContainer.innerHTML = crewUsersList
      .map((user) => {
        const isMain = user.role === "MAIN";
        return `
        <div class="crew-user-card sprocket-frame">
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <strong style="color: var(--paper); font-size: 1.1rem; letter-spacing: 0.03em;">${escapeHtml(user.username)}</strong>
              <span class="${isMain ? "role-badge-main" : "role-badge-crew"}">${isMain ? "MASTER ADMIN" : "CREW MEMBER"}</span>
            </div>
            <div class="crew-user-meta">
              <span>Name: <strong style="color: var(--leaf-light);">${escapeHtml(user.full_name || "Crew Member")}</strong></span>
              <span>Created: ${formatTimestamp(user.created_at)}</span>
              <span>Provisioned By: <code>${escapeHtml(user.created_by || "System")}</code></span>
            </div>
          </div>
          <div>
            ${
              isMain
                ? `<span class="crew-protected-pill">&#128274; Primary Account (Protected)</span>`
                : `<button type="button" class="btn btn-ghost btn-sm delete-user-btn" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" style="color: #f87171;">
                     Revoke Account
                   </button>`
            }
          </div>
        </div>
      `;
      })
      .join("");

    usersListContainer.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteCrewUser(btn.dataset.userId, btn.dataset.username));
    });
  }

  async function handleDeleteCrewUser(id, username) {
    if (!confirm(`Are you sure you want to revoke and delete crew account "${username}"? They will no longer be able to log in.`)) {
      return;
    }

    try {
      await window.impactframeApi.deleteCrewUser(id);
      showNotice(`Account "${username}" revoked successfully.`, "success");
      loadCrewUsers();
    } catch (err) {
      showNotice(err.message, "error");
    }
  }

  // Live preview of formatted username in modal
  if (crewNameInput && usernamePreviewTag) {
    crewNameInput.addEventListener("input", () => {
      const raw = crewNameInput.value.trim();
      if (!raw) {
        usernamePreviewTag.textContent = "ADMIN_NAME";
      } else {
        const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
        usernamePreviewTag.textContent = "ADMIN_" + (clean || "NAME");
      }
    });
  }

  function openAddUserModal() {
    if (userModalTitle) userModalTitle.textContent = "Provision New Crew Login";
    if (crewNameInput) crewNameInput.value = "";
    if (usernamePreviewTag) usernamePreviewTag.textContent = "ADMIN_NAME";
    if (crewPasswordInput) crewPasswordInput.value = "";
    if (userModalError) userModalError.style.display = "none";
    if (userModal) userModal.style.display = "flex";
    if (crewNameInput) crewNameInput.focus();
  }

  function closeUserModal() {
    if (userModal) userModal.style.display = "none";
    if (userModalError) userModalError.style.display = "none";
  }

  if (openAddUserModalBtn) openAddUserModalBtn.addEventListener("click", openAddUserModal);
  if (userModalCloseBtn) userModalCloseBtn.addEventListener("click", closeUserModal);
  if (userModalCancelBtn) userModalCancelBtn.addEventListener("click", closeUserModal);
  if (userModal) {
    userModal.addEventListener("click", (e) => {
      if (e.target === userModal) closeUserModal();
    });
  }

  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = crewNameInput.value.trim();
      const password = crewPasswordInput.value;

      if (!fullName || !password) return;

      userModalSubmitBtn.disabled = true;
      userModalSubmitBtn.textContent = "Provisioning…";
      userModalError.style.display = "none";

      try {
        const res = await window.impactframeApi.createCrewUser({ full_name: fullName, password });
        showNotice(`Crew account "${res.user.username}" created successfully!`, "success");
        closeUserModal();
        loadCrewUsers();
      } catch (err) {
        userModalError.textContent = err.message || "Failed to create crew login";
        userModalError.style.display = "block";
      } finally {
        userModalSubmitBtn.disabled = false;
        userModalSubmitBtn.innerHTML = "Provision Login &rarr;";
      }
    });
  }
});
