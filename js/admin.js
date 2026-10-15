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
    events: document.getElementById("panel-events"),
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
  const datasheetFormTypeFilter = document.getElementById("datasheet-form-type-filter");
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

  // Form Switcher & Active Form State
  let currentActiveForm = "auditions";
  const adminActiveFormSelect = document.getElementById("admin-active-form-select");
  const adminViewPublicFormBtn = document.getElementById("admin-view-public-form-btn");
  const formSettingsActiveLabel = document.getElementById("form-settings-active-label");

  // Form Settings & Header Controls Elements
  const formSettingsForm = document.getElementById("form-settings-form");
  const formTitleInput = document.getElementById("form-title-input");
  const formBannerInput = document.getElementById("form-banner-input");
  const formDescInput = document.getElementById("form-desc-input");
  const formConfirmMsgInput = document.getElementById("form-confirm-msg-input");
  const formClosedMsgInput = document.getElementById("form-closed-msg-input");
  const formAcceptingToggle = document.getElementById("form-accepting-toggle");
  const acceptingStatusLabel = document.getElementById("accepting-status-label");
  const saveFormSettingsBtn = document.getElementById("save-form-settings-btn");

  // Form QR Code Controls Elements
  const formQrInput = document.getElementById("form-qr-input");
  const formQrFileInput = document.getElementById("form-qr-file-input");
  const formQrTitleInput = document.getElementById("form-qr-title-input");
  const formQrInstructionInput = document.getElementById("form-qr-instruction-input");
  const formQrPreviewWrap = document.getElementById("form-qr-preview-wrap");
  const formQrPreviewImg = document.getElementById("form-qr-preview-img");
  const formQrRemoveBtn = document.getElementById("form-qr-remove-btn");

  // Form Questions Elements
  const addPhotoCardBtn = document.getElementById("add-photo-card-btn");
  const addSectionDividerBtn = document.getElementById("add-section-divider-btn");
  const openAddFieldModalBtn = document.getElementById("open-add-field-modal-btn");
  const formBuilderContainer = document.getElementById("form-builder-container");
  const fieldModal = document.getElementById("field-modal");
  const fieldModalTitle = document.getElementById("field-modal-title");
  const fieldModalCloseBtn = document.getElementById("field-modal-close-btn");
  const fieldModalCancelBtn = document.getElementById("field-modal-cancel-btn");
  const fieldForm = document.getElementById("field-form");
  const fieldIdInput = document.getElementById("field-id");
  const fieldLabelInput = document.getElementById("field-label");
  const fieldTypeSelect = document.getElementById("field-type");
  const fieldDescriptionInput = document.getElementById("field-description");
  const fieldImageUrlInput = document.getElementById("field-image-url");
  const fieldImageFileInput = document.getElementById("field-image-file-input");
  const fieldImagePreviewWrap = document.getElementById("field-image-preview-wrap");
  const fieldImagePreviewImg = document.getElementById("field-image-preview-img");
  const fieldImageRemoveBtn = document.getElementById("field-image-remove-btn");
  const fieldPlaceholderGroup = document.getElementById("field-placeholder-group");
  const fieldPlaceholderInput = document.getElementById("field-placeholder");
  const fieldOptionsGroup = document.getElementById("field-options-group");
  const fieldOptionsList = document.getElementById("field-options-list");
  const newOptionInput = document.getElementById("new-option-input");
  const addOptionBtn = document.getElementById("add-option-btn");
  const fieldAllowOther = document.getElementById("field-allow-other");
  const fieldScaleGroup = document.getElementById("field-scale-group");
  const fieldScaleMin = document.getElementById("field-scale-min");
  const fieldScaleMax = document.getElementById("field-scale-max");
  const fieldScaleMinLabel = document.getElementById("field-scale-min-label");
  const fieldScaleMaxLabel = document.getElementById("field-scale-max-label");
  const fieldKeyInput = document.getElementById("field-key");
  const fieldOrderInput = document.getElementById("field-order");
  const fieldRequiredWrap = document.getElementById("field-required-wrap");
  const fieldRequiredInput = document.getElementById("field-required");
  let currentModalOptions = [];

  // Events & Schedule Elements
  const eventsCountBadge = document.getElementById("events-count-badge");
  const eventsSearchInput = document.getElementById("events-search-input");
  const eventsStatusFilter = document.getElementById("events-status-filter");
  const refreshEventsBtn = document.getElementById("refresh-events-btn");
  const openAddEventModalBtn = document.getElementById("open-add-event-modal-btn");
  const adminEventsContainer = document.getElementById("admin-events-container");
  const eventModal = document.getElementById("event-modal");
  const eventModalTitle = document.getElementById("event-modal-title");
  const eventModalCloseBtn = document.getElementById("event-modal-close-btn");
  const eventModalCancelBtn = document.getElementById("event-modal-cancel-btn");
  const eventForm = document.getElementById("event-form");
  const eventIdInput = document.getElementById("event-id");
  const eventTitleInput = document.getElementById("event-title");
  const eventCategoryInput = document.getElementById("event-category");
  const eventDateDayInput = document.getElementById("event-date-day");
  const eventDateMonthInput = document.getElementById("event-date-month");
  const eventTimeInput = document.getElementById("event-time");
  const eventLocationInput = document.getElementById("event-location");
  const eventEntryFeeInput = document.getElementById("event-entry-fee");
  const eventDescriptionInput = document.getElementById("event-description");
  const eventStatusSelect = document.getElementById("event-status-select");
  const eventRegOpenInput = document.getElementById("event-reg-open");
  const eventSortOrderInput = document.getElementById("event-sort-order");
  let adminEventsList = [];

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

  // Change Password Elements
  const openChangePwBtn = document.getElementById("open-change-pw-btn");
  const changePwModal = document.getElementById("change-pw-modal");
  const changePwCloseBtn = document.getElementById("change-pw-close-btn");
  const changePwCancelBtn = document.getElementById("change-pw-cancel-btn");
  const changePwForm = document.getElementById("change-pw-form");
  const changePwTargetUsername = document.getElementById("change-pw-target-username");
  const changePwCurrentInput = document.getElementById("change-pw-current");
  const changePwNewInput = document.getElementById("change-pw-new");
  const changePwConfirmInput = document.getElementById("change-pw-confirm");
  const changePwError = document.getElementById("change-pw-error");
  const changePwSubmitBtn = document.getElementById("change-pw-submit-btn");

  // Reset Crew Password Elements
  const resetCrewModal = document.getElementById("reset-crew-modal");
  const resetCrewCloseBtn = document.getElementById("reset-crew-close-btn");
  const resetCrewCancelBtn = document.getElementById("reset-crew-cancel-btn");
  const resetCrewForm = document.getElementById("reset-crew-form");
  const resetCrewUserIdInput = document.getElementById("reset-crew-user-id");
  const resetCrewTargetName = document.getElementById("reset-crew-target-name");
  const resetCrewNewPwInput = document.getElementById("reset-crew-new-pw");
  const resetCrewConfirmPwInput = document.getElementById("reset-crew-confirm-pw");
  const resetCrewError = document.getElementById("reset-crew-error");
  const resetCrewSubmitBtn = document.getElementById("reset-crew-submit-btn");

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

  // Handle tab close, browser close, or page exit to log off admin in access logs
  function handleAdminPageExit() {
    window.impactframeApi.logoutAdminBeacon();
  }

  // W3C standard: pagehide fires reliably on tab close, window close, or navigation
  window.addEventListener("pagehide", handleAdminPageExit);
  // Fallback for desktop browsers
  window.addEventListener("beforeunload", handleAdminPageExit);

  // Periodic heartbeat every 40 seconds to keep session active while admin tab is open
  setInterval(() => {
    if (adminContentView && adminContentView.style.display !== "none") {
      if (typeof window.impactframeApi.sendHeartbeat === "function") {
        window.impactframeApi.sendHeartbeat();
      }
    }
  }, 40000);

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
    loadFormSettings();
    loadFormFields();
    loadAdminEvents();
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
      if (tab === "forms") {
        loadFormSettings();
        loadFormFields();
      }
      if (tab === "events") loadAdminEvents();
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
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--parchment-dim);">
          Loading submissions datasheet…
        </td>
      </tr>
    `;

    const filters = {
      form_type: datasheetFormTypeFilter && datasheetFormTypeFilter.value !== "All" ? datasheetFormTypeFilter.value : "",
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
          <td colspan="8" style="text-align: center; padding: 24px; color: #ff9999;">
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
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--parchment-dim);">
            No submissions match your search or filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    const formTypeBadges = {
      auditions: '<span class="hud-pill" style="font-size: 0.72rem; color: #93c5fd; border-color: rgba(147,197,253,0.4);">🎭 Auditions</span>',
      join_crew: '<span class="hud-pill" style="font-size: 0.72rem; color: #86efac; border-color: rgba(134,239,172,0.4);">🎬 Crew</span>',
      events: '<span class="hud-pill" style="font-size: 0.72rem; color: #fde047; border-color: rgba(253,224,71,0.4);">🎟️ Event</span>',
    };

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
        const formBadge = formTypeBadges[sub.form_type] || `<span class="hud-pill" style="font-size: 0.72rem;">${escapeHtml(sub.form_type || "auditions")}</span>`;

        return `
        <tr data-sub-id="${sub.id}">
          <td style="font-family: monospace; font-weight: 600; color: var(--amber); font-size: 0.85rem;">
            #IF-${String(sub.id).padStart(3, "0")}
          </td>
          <td>
            ${formBadge}
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

    const formNameMap = {
      auditions: "🎭 Auditions & Roles Form (apply.html)",
      join_crew: "🎬 Join Crew Application (join.html)",
      events: "🎟️ Events & Workshop Registration (events.html)",
    };
    const formDisplayName = formNameMap[sub.form_type] || (sub.form_type ? `Form: ${sub.form_type}` : "Auditions & Roles Form");

    subDetailTitle.textContent = `${sub.applicant_name} — Details`;

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
        <div><strong>Source Form:</strong> <span style="color: var(--leaf-light); font-weight: 600;">${escapeHtml(formDisplayName)}</span></div>
        ${sub.applicant_email ? `<div><strong>Email:</strong> <a href="mailto:${escapeHtml(sub.applicant_email)}" style="color: var(--leaf-light);">${escapeHtml(sub.applicant_email)}</a></div>` : ""}
        ${sub.applicant_phone ? `<div><strong>Phone:</strong> <a href="tel:${escapeHtml(sub.applicant_phone)}" style="color: var(--parchment);">${escapeHtml(sub.applicant_phone)}</a></div>` : ""}
        ${sub.role_interest ? `<div><strong>Role / Event:</strong> <span style="color: var(--amber);">${escapeHtml(sub.role_interest)}</span></div>` : ""}
      </div>
    `;

    subDetailAnswers.innerHTML = "";
    Object.entries(subData).forEach(([key, val]) => {
      const fieldDef = formFieldsList.find((f) => f.field_key === key);
      const displayLabel = fieldDef ? fieldDef.label : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const dt = document.createElement("dt");
      dt.textContent = displayLabel;

      const dd = document.createElement("dd");
      if (Array.isArray(val)) {
        dd.innerHTML = val.length
          ? val.map((item) => `<span class="hud-pill" style="font-size: 0.78rem; margin-right: 6px; margin-bottom: 4px; display: inline-block;">${escapeHtml(item)}</span>`).join("")
          : "—";
      } else {
        const strVal = String(val ?? "—");
        if (strVal.startsWith("data:image/") || strVal.match(/^https?:\/\/.*\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i)) {
          dd.innerHTML = `
            <div style="margin-top: 6px;">
              <a href="${escapeHtml(strVal)}" target="_blank" rel="noopener">
                <img src="${escapeHtml(strVal)}" alt="Uploaded Photo" style="max-width: 260px; max-height: 220px; border-radius: 6px; border: 1px solid var(--leaf); object-fit: contain; background: #0b1512; display: block; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);" />
              </a>
              <a href="${escapeHtml(strVal)}" target="_blank" rel="noopener" download="applicant_photo_${sub.id}.png" class="btn btn-ghost btn-sm" style="font-size: 0.78rem; padding: 3px 10px; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View / Download Full Image
              </a>
            </div>
          `;
        } else if (strVal.startsWith("http://") || strVal.startsWith("https://")) {
          dd.innerHTML = `<a href="${escapeHtml(strVal)}" target="_blank" rel="noopener" style="color: var(--leaf-light); text-decoration: underline;">${escapeHtml(strVal)} &nearr;</a>`;
        } else {
          dd.textContent = strVal;
        }
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
  if (datasheetFormTypeFilter) {
    datasheetFormTypeFilter.addEventListener("change", loadSubmissions);
  }
  datasheetRoleFilter.addEventListener("change", loadSubmissions);
  datasheetStatusFilter.addEventListener("change", loadSubmissions);
  refreshDatasheetBtn.addEventListener("click", loadSubmissions);

  // 1-Click CSV Export Trigger
  exportCsvBtn.addEventListener("click", () => {
    window.impactframeApi.exportSubmissionsCsv(submissionsList);
  });

  /* ==========================================================================
     TAB 3: GOOGLE FORMS CUSTOMIZER & SETTINGS
     ========================================================================== */

  // Universal Form Switcher Function
  function switchActiveForm(formType) {
    currentActiveForm = formType;

    // Update pill buttons active styling
    const pills = document.querySelectorAll(".form-pill-btn");
    pills.forEach((p) => {
      const isTarget = p.dataset.form === formType;
      if (isTarget) {
        p.classList.add("active");
        p.style.border = "2px solid var(--leaf)";
        p.style.background = "rgba(82, 183, 136, 0.25)";
        p.style.color = "var(--paper)";
      } else {
        p.classList.remove("active");
        p.style.border = "1px solid var(--navy-mid)";
        p.style.background = "var(--navy-dark)";
        p.style.color = "var(--parchment-dim)";
      }
    });

    if (adminActiveFormSelect) {
      adminActiveFormSelect.value = formType;
    }

    const linkMap = {
      auditions: "apply.html",
      join_crew: "join.html",
      events: "events.html",
    };
    const labelMap = {
      auditions: "🎭 Auditions & Roles Form Configuration (apply.html)",
      join_crew: "🎬 Join Crew Application Form Configuration (join.html)",
      events: "🎟️ Events & Workshop Registration Form Configuration (events.html)",
    };

    if (adminViewPublicFormBtn) {
      adminViewPublicFormBtn.href = linkMap[currentActiveForm] || "apply.html";
    }
    if (formSettingsActiveLabel) {
      formSettingsActiveLabel.textContent = labelMap[currentActiveForm] || "Form Configuration";
    }

    loadFormSettings(currentActiveForm);
    loadFormFields(currentActiveForm);
  }

  // Wire pill button click events
  document.querySelectorAll(".form-pill-btn").forEach((pill) => {
    pill.addEventListener("click", () => {
      const targetForm = pill.dataset.form;
      if (targetForm) {
        switchActiveForm(targetForm);
        showNotice(`Editing: ${targetForm === 'join_crew' ? 'Join Crew Form' : (targetForm === 'events' ? 'Events Form' : 'Auditions Form')}`, "info");
      }
    });
  });

  if (adminActiveFormSelect) {
    adminActiveFormSelect.addEventListener("change", () => {
      switchActiveForm(adminActiveFormSelect.value);
    });
  }

  // Question Photo Preview Helper
  function updateFieldImagePreviewUI(url) {
    if (!fieldImagePreviewWrap || !fieldImagePreviewImg) return;
    const clean = (url || "").trim();
    if (clean) {
      fieldImagePreviewImg.src = clean;
      fieldImagePreviewWrap.style.display = "flex";
    } else {
      fieldImagePreviewImg.src = "";
      fieldImagePreviewWrap.style.display = "none";
    }
  }

  if (fieldImageFileInput) {
    fieldImageFileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        showNotice("Processing question photo...", "info");
        const dataUrl = await window.impactframeApi.fileToDataUrl(file);
        if (fieldImageUrlInput) fieldImageUrlInput.value = dataUrl;
        updateFieldImagePreviewUI(dataUrl);
        showNotice("Question photo attached!", "success");
      } catch (err) {
        showNotice("Failed to load question photo: " + err.message, "error");
      }
    });
  }

  if (fieldImageUrlInput) {
    fieldImageUrlInput.addEventListener("input", () => {
      updateFieldImagePreviewUI(fieldImageUrlInput.value);
    });
  }

  if (fieldImageRemoveBtn) {
    fieldImageRemoveBtn.addEventListener("click", () => {
      if (fieldImageUrlInput) fieldImageUrlInput.value = "";
      if (fieldImageFileInput) fieldImageFileInput.value = "";
      updateFieldImagePreviewUI("");
      showNotice("Question photo removed.", "info");
    });
  }

  if (addPhotoCardBtn) {
    addPhotoCardBtn.addEventListener("click", () => {
      openAddFieldModal(false);
      fieldModalTitle.textContent = "Add Photo Question / Image Card";
      fieldTypeSelect.value = "photo";
      fieldLabelInput.value = "Photo / Reference Picture";
      fieldPlaceholderInput.value = "Attach image or provide reference link...";
      updateModalTypeVisibility();
    });
  }

  // QR Code Preview Helper
  function updateQrPreviewUI(url) {
    if (!formQrPreviewWrap || !formQrPreviewImg) return;
    const clean = (url || "").trim();
    if (clean) {
      formQrPreviewImg.src = clean;
      formQrPreviewWrap.style.display = "flex";
    } else {
      formQrPreviewImg.src = "";
      formQrPreviewWrap.style.display = "none";
    }
  }

  // QR Code File Upload Listener
  if (formQrFileInput) {
    formQrFileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        showNotice("Processing QR photo...", "info");
        const dataUrl = await window.impactframeApi.fileToDataUrl(file);
        if (formQrInput) formQrInput.value = dataUrl;
        updateQrPreviewUI(dataUrl);
        showNotice("QR photo loaded! Click 'Save Settings' to apply.", "success");
      } catch (err) {
        showNotice("Failed to load QR image: " + err.message, "error");
      }
    });
  }

  if (formQrInput) {
    formQrInput.addEventListener("input", () => {
      updateQrPreviewUI(formQrInput.value);
    });
  }

  if (formQrRemoveBtn) {
    formQrRemoveBtn.addEventListener("click", () => {
      if (formQrInput) formQrInput.value = "";
      if (formQrFileInput) formQrFileInput.value = "";
      updateQrPreviewUI("");
      showNotice("QR code photo removed. Click 'Save Settings' to apply.", "info");
    });
  }

  // Load and apply form-level settings (Title, Description, Accepting status, Closed msg, QR code)
  async function loadFormSettings(formType = currentActiveForm) {
    try {
      const settings = await window.impactframeApi.getFormSettings(formType);
      if (formTitleInput) formTitleInput.value = settings.form_title || "";
      if (formBannerInput) formBannerInput.value = settings.header_banner_url || "";
      if (formDescInput) formDescInput.value = settings.form_description || "";
      if (formConfirmMsgInput) formConfirmMsgInput.value = settings.confirmation_message || "";
      if (formClosedMsgInput) formClosedMsgInput.value = settings.closed_message || "";
      if (formQrInput) formQrInput.value = settings.qr_code_image || "";
      if (formQrTitleInput) formQrTitleInput.value = settings.qr_code_title || "";
      if (formQrInstructionInput) formQrInstructionInput.value = settings.qr_code_instruction || "";

      updateQrPreviewUI(settings.qr_code_image);

      const isAccepting = Boolean(settings.is_accepting_responses);
      if (formAcceptingToggle) formAcceptingToggle.checked = isAccepting;
      updateAcceptingStatusUI(isAccepting);
    } catch (err) {
      console.warn("Could not load form settings:", err);
    }
  }

  function updateAcceptingStatusUI(isAccepting) {
    if (!acceptingStatusLabel) return;
    if (isAccepting) {
      acceptingStatusLabel.textContent = "● Accepting Responses";
      acceptingStatusLabel.style.color = "#86efac";
    } else {
      acceptingStatusLabel.textContent = "○ Closed (Not Accepting)";
      acceptingStatusLabel.style.color = "#fca5a5";
    }
  }

  // Live toggle for accepting responses
  if (formAcceptingToggle) {
    formAcceptingToggle.addEventListener("change", async () => {
      const isAccepting = formAcceptingToggle.checked;
      updateAcceptingStatusUI(isAccepting);
      try {
        const payload = {
          is_accepting_responses: isAccepting,
          form_title: formTitleInput ? formTitleInput.value.trim() : undefined,
          form_description: formDescInput ? formDescInput.value.trim() : undefined,
          header_banner_url: formBannerInput ? formBannerInput.value.trim() : undefined,
          confirmation_message: formConfirmMsgInput ? formConfirmMsgInput.value.trim() : undefined,
          closed_message: formClosedMsgInput ? formClosedMsgInput.value.trim() : undefined,
          qr_code_image: formQrInput ? formQrInput.value.trim() : undefined,
          qr_code_title: formQrTitleInput ? formQrTitleInput.value.trim() : undefined,
          qr_code_instruction: formQrInstructionInput ? formQrInstructionInput.value.trim() : undefined,
        };
        await window.impactframeApi.updateFormSettings(payload, currentActiveForm);
        showNotice(
          isAccepting
            ? `Form (${currentActiveForm}) is now OPEN and accepting responses.`
            : `Form (${currentActiveForm}) is now CLOSED. Visitors will see the closed notice.`,
          isAccepting ? "success" : "info"
        );
      } catch (err) {
        showNotice("Failed to update response status: " + err.message, "error");
      }
    });
  }

  // Save all form header & behavior settings
  if (saveFormSettingsBtn) {
    saveFormSettingsBtn.addEventListener("click", async () => {
      saveFormSettingsBtn.disabled = true;
      saveFormSettingsBtn.textContent = "Saving…";
      try {
        const payload = {
          form_title: formTitleInput.value.trim(),
          form_description: formDescInput.value.trim(),
          header_banner_url: formBannerInput.value.trim(),
          confirmation_message: formConfirmMsgInput.value.trim(),
          closed_message: formClosedMsgInput.value.trim(),
          qr_code_image: formQrInput ? formQrInput.value.trim() : "",
          qr_code_title: formQrTitleInput ? formQrTitleInput.value.trim() : "",
          qr_code_instruction: formQrInstructionInput ? formQrInstructionInput.value.trim() : "",
          is_accepting_responses: formAcceptingToggle ? formAcceptingToggle.checked : true,
        };
        await window.impactframeApi.updateFormSettings(payload, currentActiveForm);
        showNotice(`Form settings for "${currentActiveForm}" saved successfully! Updated on live website.`, "success");
      } catch (err) {
        showNotice("Failed to save settings: " + err.message, "error");
      } finally {
        saveFormSettingsBtn.disabled = false;
        saveFormSettingsBtn.textContent = "Save Settings";
      }
    });
  }

  // Load and render question fields
  async function loadFormFields(formType = currentActiveForm) {
    formBuilderContainer.innerHTML = `<p class="state-msg">Loading question fields…</p>`;
    try {
      formFieldsList = await window.impactframeApi.getAllFormFields(formType);
      renderFormFields();
    } catch (err) {
      formBuilderContainer.innerHTML = `<p class="state-msg">Failed to load fields (${escapeHtml(err.message)})</p>`;
    }
  }

  function getFieldTypeBadge(type) {
    const map = {
      text: { label: "Short answer", color: "#93c5fd" },
      textarea: { label: "Paragraph", color: "#a5b4fc" },
      radio: { label: "Multiple choice", color: "#fcd34d" },
      checkbox: { label: "Checkboxes", color: "#fdba74" },
      select: { label: "Dropdown", color: "#c084fc" },
      scale: { label: "Linear scale", color: "#86efac" },
      date: { label: "Date", color: "#67e8f9" },
      time: { label: "Time", color: "#6ee7b7" },
      number: { label: "Number", color: "#f9a8d4" },
      email: { label: "Email", color: "#93c5fd" },
      tel: { label: "Phone", color: "#fde047" },
      url: { label: "Link / URL", color: "#5eead4" },
      photo: { label: "Photo / Image Upload", color: "#f472b6" },
      image_card: { label: "🖼️ Standalone Image Card", color: "#f472b6" },
      image: { label: "🖼️ Standalone Image Card", color: "#f472b6" },
      file: { label: "File upload", color: "#cbd5e1" },
      section: { label: "Section divider", color: "#fbbf24" },
    };
    return map[type] || { label: type, color: "var(--leaf-light)" };
  }

  function renderFormFields() {
    if (!formFieldsList || formFieldsList.length === 0) {
      formBuilderContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; border: 1px dashed var(--navy-mid); border-radius: var(--radius);">
          <p class="state-msg" style="margin-bottom: 14px;">No questions created yet.</p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('open-add-field-modal-btn').click()">
            + Add Your First Question
          </button>
        </div>
      `;
      return;
    }

    formBuilderContainer.innerHTML = formFieldsList
      .map((field, index) => {
        const isActive = field.is_active !== false && field.active !== false && field.is_active !== 0 && field.active !== 0;
        const isSection = field.type === "section";
        const typeInfo = getFieldTypeBadge(field.type);

        if (isSection) {
          return `
            <div class="form-field-card section-divider-card sprocket-frame ${!isActive ? "is-disabled" : ""}" data-field-id="${field.id}" style="background: rgba(30, 48, 40, 0.7); border: 2px solid var(--leaf-dark); padding: 16px 20px;">
              <div style="flex: 1; min-width: 240px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span class="hud-pill" style="background: var(--amber); color: #000; font-weight: 700; font-size: 0.72rem; padding: 2px 8px;">
                    SECTION DIVIDER
                  </span>
                  <strong style="color: var(--amber-light); font-size: 1.15rem; letter-spacing: 0.02em;">${escapeHtml(field.label)}</strong>
                </div>
                ${field.description ? `<p style="margin: 4px 0 0; color: var(--parchment-dim); font-size: 0.88rem;">${escapeHtml(field.description)}</p>` : ""}
                <div class="form-field-meta" style="margin-top: 8px;">
                  <span>Order: <strong>${field.sort_order}</strong></span>
                  <span>Status: <strong style="color: ${isActive ? "#86efac" : "#fca5a5"};">${isActive ? "Active" : "Hidden"}</strong></span>
                </div>
              </div>

              <!-- Reorder, Duplicate & Actions -->
              <div class="field-actions-row" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn btn-ghost btn-sm move-field-up-btn" data-field-idx="${index}" title="Move Up" ${index === 0 ? "disabled style='opacity: 0.35;'" : ""}>
                  ▲
                </button>
                <button type="button" class="btn btn-ghost btn-sm move-field-down-btn" data-field-idx="${index}" title="Move Down" ${index === formFieldsList.length - 1 ? "disabled style='opacity: 0.35;'" : ""}>
                  ▼
                </button>
                <button type="button" class="btn btn-ghost btn-sm toggle-field-status-btn" data-field-id="${field.id}" data-current-active="${isActive}">
                  ${isActive ? "Hide" : "Show"}
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
        }

        // Options or scale summary preview
        let previewInfo = "";
        if (["radio", "checkbox", "select"].includes(field.type)) {
          const optCount = Array.isArray(field.options) ? field.options.length : 0;
          previewInfo = `<span style="font-size: 0.8rem; color: var(--parchment-dim);">(${optCount} option${optCount === 1 ? "" : "s"}${field.allow_other ? " + Other" : ""})</span>`;
        } else if (field.type === "scale") {
          previewInfo = `<span style="font-size: 0.8rem; color: var(--parchment-dim);">(${field.scale_min} to ${field.scale_max}: "${escapeHtml(field.scale_min_label || "Min")}" → "${escapeHtml(field.scale_max_label || "Max")}")</span>`;
        }

        return `
          <div class="form-field-card sprocket-frame ${!isActive ? "is-disabled" : ""}" data-field-id="${field.id}">
            <div style="flex: 1; min-width: 240px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-size: 0.82rem; font-weight: 700; color: var(--amber); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">#${index + 1}</span>
                <strong style="color: var(--paper); font-size: 1.05rem;">${escapeHtml(field.label)}</strong>
                ${
                  field.required
                    ? '<span class="req-badge" title="Candidate must answer">* Required</span>'
                    : '<span class="opt-badge">Optional</span>'
                }
              </div>

              ${field.description ? `<p style="margin: 4px 0 0; color: var(--parchment-dim); font-size: 0.85rem;">${escapeHtml(field.description)}</p>` : ""}

              ${field.image_url ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <a href="${escapeHtml(field.image_url)}" target="_blank" rel="noopener">
                    <img src="${escapeHtml(field.image_url)}" alt="Question photo" style="width: 48px; height: 38px; object-fit: contain; background: #0b1512; border-radius: 4px; border: 1px solid var(--leaf); display: block;" />
                  </a>
                  <span class="hud-pill" style="font-size: 0.72rem; color: #86efac; border-color: rgba(134,239,172,0.4);">📷 Photo Attached</span>
                </div>
              ` : ""}

              <div class="form-field-meta" style="margin-top: 6px;">
                <span>Type: <strong style="color: ${typeInfo.color};">${typeInfo.label}</strong> ${previewInfo}</span>
                <span>Key: <span class="field-type-pill">${escapeHtml(field.field_key)}</span></span>
                <span>Status: <strong style="color: ${isActive ? "#86efac" : "#fca5a5"};">${isActive ? "Active (Visible)" : "Disabled"}</strong></span>
              </div>
            </div>

            <!-- Reorder, Duplicate & Actions -->
            <div class="field-actions-row" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn btn-ghost btn-sm move-field-up-btn" data-field-idx="${index}" title="Move Up in Form" ${index === 0 ? "disabled style='opacity: 0.35;'" : ""}>
                ▲
              </button>
              <button type="button" class="btn btn-ghost btn-sm move-field-down-btn" data-field-idx="${index}" title="Move Down in Form" ${index === formFieldsList.length - 1 ? "disabled style='opacity: 0.35;'" : ""}>
                ▼
              </button>
              <button type="button" class="btn btn-ghost btn-sm duplicate-field-btn" data-field-id="${field.id}" title="Duplicate this question">
                Duplicate
              </button>
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

    // Move Up
    formBuilderContainer.querySelectorAll(".move-field-up-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleReorderMove(parseInt(btn.dataset.fieldIdx, 10), -1));
    });

    // Move Down
    formBuilderContainer.querySelectorAll(".move-field-down-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleReorderMove(parseInt(btn.dataset.fieldIdx, 10), 1));
    });

    // Duplicate question (Google Forms feature)
    formBuilderContainer.querySelectorAll(".duplicate-field-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDuplicateField(btn.dataset.fieldId));
    });

    // Toggle active status
    formBuilderContainer.querySelectorAll(".toggle-field-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.fieldId;
        const currentActive = btn.dataset.currentActive === "true";
        try {
          await window.impactframeApi.updateFormField(id, { is_active: !currentActive });
          showNotice(`Question visibility updated.`, "success");
          loadFormFields(currentActiveForm);
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

  // Handle reordering up/down
  async function handleReorderMove(fromIndex, delta) {
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= formFieldsList.length) return;

    const listCopy = [...formFieldsList];
    const temp = listCopy[fromIndex];
    listCopy[fromIndex] = listCopy[toIndex];
    listCopy[toIndex] = temp;

    const orderedIds = listCopy.map((f) => f.id);
    try {
      await window.impactframeApi.reorderFormFields(orderedIds);
      formFieldsList = listCopy;
      renderFormFields();
      showNotice("Question order updated.", "success");
    } catch (err) {
      showNotice("Failed to reorder: " + err.message, "error");
      loadFormFields(currentActiveForm);
    }
  }

  // Handle 1-click duplicate
  async function handleDuplicateField(id) {
    try {
      await window.impactframeApi.duplicateFormField(id);
      showNotice("Question duplicated with all options and configurations!", "success");
      loadFormFields(currentActiveForm);
    } catch (err) {
      showNotice("Failed to duplicate: " + err.message, "error");
    }
  }

  // Dynamic Options Editor in Modal
  function renderModalOptions() {
    if (!fieldOptionsList) return;
    if (!currentModalOptions || currentModalOptions.length === 0) {
      fieldOptionsList.innerHTML = `<span style="font-size: 0.85rem; color: var(--parchment-dim);">No choices added yet. Add an option below:</span>`;
      return;
    }

    fieldOptionsList.innerHTML = currentModalOptions
      .map(
        (opt, idx) => `
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="color: var(--amber); font-weight: 600; font-size: 0.8rem; width: 18px;">${idx + 1}.</span>
          <input type="text" class="input modal-option-item-input" value="${escapeHtml(opt)}" data-opt-idx="${idx}" style="flex: 1; padding: 6px 10px; font-size: 0.88rem;" />
          <button type="button" class="btn btn-ghost btn-sm remove-modal-option-btn" data-opt-idx="${idx}" style="padding: 4px 8px; color: #ff8888;" title="Delete this option">
            &times;
          </button>
        </div>
      `
      )
      .join("");

    fieldOptionsList.querySelectorAll(".modal-option-item-input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const idx = parseInt(inp.dataset.optIdx, 10);
        currentModalOptions[idx] = inp.value;
      });
    });

    fieldOptionsList.querySelectorAll(".remove-modal-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.optIdx, 10);
        currentModalOptions.splice(idx, 1);
        renderModalOptions();
      });
    });
  }

  function addModalOption() {
    if (!newOptionInput) return;
    const val = newOptionInput.value.trim();
    if (!val) return;
    currentModalOptions.push(val);
    newOptionInput.value = "";
    renderModalOptions();
    newOptionInput.focus();
  }

  if (addOptionBtn) {
    addOptionBtn.addEventListener("click", addModalOption);
  }
  if (newOptionInput) {
    newOptionInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addModalOption();
      }
    });
  }

  // Update modal input sections based on selected Question Type
  function updateModalTypeVisibility() {
    const type = fieldTypeSelect.value;
    const isPhoto = type === "photo";
    const isChoice = ["radio", "checkbox", "select"].includes(type);
    const isScale = type === "scale";
    const isSection = type === "section";
    const isTextLike = ["text", "textarea", "number", "email", "tel", "url"].includes(type) || isPhoto;

    if (fieldOptionsGroup) fieldOptionsGroup.style.display = isChoice ? "block" : "none";
    if (fieldScaleGroup) fieldScaleGroup.style.display = isScale ? "block" : "none";
    if (fieldPlaceholderGroup) fieldPlaceholderGroup.style.display = isTextLike ? "block" : "none";

    const allowOtherContainer = document.getElementById("allow-other-container");
    if (allowOtherContainer) {
      allowOtherContainer.style.display = (type === "radio" || type === "checkbox") ? "flex" : "none";
    }

    if (fieldRequiredWrap) {
      fieldRequiredWrap.style.display = isSection ? "none" : "flex";
    }

    // Adapt labels for section dividers
    const labelTitleEl = fieldLabelInput.previousElementSibling;
    if (labelTitleEl) {
      labelTitleEl.textContent = isSection ? "Section Header Title *" : "Question Title / Prompt *";
    }
  }

  fieldTypeSelect.addEventListener("change", updateModalTypeVisibility);

  // Auto slugify field key from question prompt
  fieldLabelInput.addEventListener("input", () => {
    if (!fieldIdInput.value && !fieldKeyInput.readOnly) {
      fieldKeyInput.value = fieldLabelInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 30);
    }
  });

  function openAddFieldModal(isSection = false) {
    fieldModalTitle.textContent = isSection ? "Add Section Divider" : "Add Form Question";
    fieldIdInput.value = "";
    fieldLabelInput.value = isSection ? "Section Title" : "";
    fieldDescriptionInput.value = "";
    fieldPlaceholderInput.value = "";
    fieldKeyInput.value = "";
    fieldKeyInput.readOnly = false;
    fieldTypeSelect.value = isSection ? "section" : "text";

    if (fieldImageUrlInput) fieldImageUrlInput.value = "";
    if (fieldImageFileInput) fieldImageFileInput.value = "";
    updateFieldImagePreviewUI("");

    currentModalOptions = isSection ? [] : ["Option 1", "Option 2"];
    renderModalOptions();

    if (fieldAllowOther) fieldAllowOther.checked = false;
    if (fieldScaleMin) fieldScaleMin.value = "1";
    if (fieldScaleMax) fieldScaleMax.value = "5";
    if (fieldScaleMinLabel) fieldScaleMinLabel.value = "";
    if (fieldScaleMaxLabel) fieldScaleMaxLabel.value = "";

    fieldRequiredInput.checked = !isSection;
    fieldOrderInput.value = (formFieldsList.length + 1) * 2;

    updateModalTypeVisibility();
    fieldModal.style.display = "flex";
    fieldLabelInput.focus();
  }

  function openEditFieldModal(id) {
    const field = formFieldsList.find((f) => String(f.id) === String(id));
    if (!field) return;

    fieldModalTitle.textContent = `Edit: ${field.label}`;
    fieldIdInput.value = field.id;
    fieldLabelInput.value = field.label;
    fieldDescriptionInput.value = field.description || "";
    fieldPlaceholderInput.value = field.placeholder || "";
    fieldKeyInput.value = field.field_key;
    fieldKeyInput.readOnly = true;
    fieldTypeSelect.value = field.type || "text";

    if (fieldImageUrlInput) fieldImageUrlInput.value = field.image_url || "";
    if (fieldImageFileInput) fieldImageFileInput.value = "";
    updateFieldImagePreviewUI(field.image_url || "");

    let opts = [];
    if (Array.isArray(field.options)) {
      opts = [...field.options];
    } else if (typeof field.options === "string") {
      try {
        opts = JSON.parse(field.options);
      } catch {
        opts = field.options.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    currentModalOptions = opts;
    renderModalOptions();

    if (fieldAllowOther) fieldAllowOther.checked = Boolean(field.allow_other);
    if (fieldScaleMin) fieldScaleMin.value = String(field.scale_min ?? 1);
    if (fieldScaleMax) fieldScaleMax.value = String(field.scale_max ?? 5);
    if (fieldScaleMinLabel) fieldScaleMinLabel.value = field.scale_min_label || "";
    if (fieldScaleMaxLabel) fieldScaleMaxLabel.value = field.scale_max_label || "";

    fieldRequiredInput.checked = Boolean(field.required);
    fieldOrderInput.value = field.sort_order || 10;

    updateModalTypeVisibility();
    fieldModal.style.display = "flex";
  }

  function closeFieldModal() {
    fieldModal.style.display = "none";
  }

  fieldModalCloseBtn.addEventListener("click", closeFieldModal);
  fieldModalCancelBtn.addEventListener("click", closeFieldModal);
  fieldModal.addEventListener("click", (e) => {
    if (e.target === fieldModal) closeFieldModal();
  });

  openAddFieldModalBtn.addEventListener("click", () => openAddFieldModal(false));
  if (addSectionDividerBtn) {
    addSectionDividerBtn.addEventListener("click", () => openAddFieldModal(true));
  }

  // Submit Question / Section Save
  fieldForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = fieldIdInput.value;
    const type = fieldTypeSelect.value;

    const payload = {
      form_type: currentActiveForm,
      label: fieldLabelInput.value.trim(),
      description: fieldDescriptionInput.value.trim(),
      field_key: fieldKeyInput.value.trim().toLowerCase(),
      type: type,
      image_url: fieldImageUrlInput ? fieldImageUrlInput.value.trim() : "",
      placeholder: fieldPlaceholderInput.value.trim(),
      options: currentModalOptions.filter((s) => Boolean(s && s.trim())),
      allow_other: fieldAllowOther && fieldAllowOther.checked ? 1 : 0,
      scale_min: parseInt(fieldScaleMin.value, 10) || 1,
      scale_max: parseInt(fieldScaleMax.value, 10) || 5,
      scale_min_label: fieldScaleMinLabel.value.trim(),
      scale_max_label: fieldScaleMaxLabel.value.trim(),
      required: type === "section" ? 0 : (fieldRequiredInput.checked ? 1 : 0),
      sort_order: parseInt(fieldOrderInput.value, 10) || 10,
    };

    try {
      if (id) {
        await window.impactframeApi.updateFormField(id, payload);
        showNotice(`Question updated successfully!`, "success");
      } else {
        await window.impactframeApi.createFormField(payload);
        showNotice(`New question added to "${currentActiveForm}" form!`, "success");
      }
      closeFieldModal();
      loadFormFields(currentActiveForm);
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  async function handleDeleteField(id) {
    const field = formFieldsList.find((f) => String(f.id) === String(id));
    const label = field ? field.label : "this question";
    if (!confirm(`Are you sure you want to permanently remove "${label}" from the form?`)) {
      return;
    }
    try {
      await window.impactframeApi.deleteFormField(id);
      showNotice(`Question deleted from form.`, "success");
      loadFormFields(currentActiveForm);
    } catch (err) {
      showNotice(err.message, "error");
    }
  }

  /* ==========================================================================
     TAB: EVENTS & SCHEDULE MANAGEMENT (events.html)
     ========================================================================== */
  async function loadAdminEvents() {
    if (!adminEventsContainer) return;
    adminEventsContainer.innerHTML = '<p class="state-msg">Loading events catalog…</p>';
    try {
      adminEventsList = await window.impactframeApi.getEvents();
      if (eventsCountBadge) {
        eventsCountBadge.textContent = adminEventsList.length;
      }
      renderAdminEvents();
    } catch (err) {
      adminEventsContainer.innerHTML = `<p class="state-msg error">Failed to load events: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderAdminEvents() {
    if (!adminEventsContainer) return;
    const filterQuery = (eventsSearchInput?.value || "").toLowerCase().trim();
    const filterStatus = eventsStatusFilter?.value || "All";

    const filtered = adminEventsList.filter((evt) => {
      const isPast = Boolean(evt.is_past);
      if (filterStatus === "upcoming" && isPast) return false;
      if (filterStatus === "past" && !isPast) return false;

      if (filterQuery) {
        const text = `${evt.title || ""} ${evt.category || ""} ${evt.location || ""} ${evt.description || ""}`.toLowerCase();
        if (!text.includes(filterQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      adminEventsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; border: 1px dashed var(--navy-mid); border-radius: var(--radius);">
          <p class="state-msg" style="margin-bottom: 14px;">No events found matching your filter criteria.</p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('open-add-event-modal-btn').click()">
            + Create New Event
          </button>
        </div>
      `;
      return;
    }

    adminEventsContainer.innerHTML = filtered
      .map((evt) => {
        const isPast = Boolean(evt.is_past);
        const isRegOpen = Boolean(evt.registration_open !== 0 && evt.registration_open !== false);

        return `
          <div class="form-field-card sprocket-frame ${isPast ? "is-disabled" : ""}" data-event-id="${evt.id}" style="${isPast ? "border-color: #555; background: rgba(20,20,20,0.6);" : "border-color: var(--leaf-dark); background: rgba(14,26,23,0.85);"} padding: 18px 20px;">
            <div style="display: flex; gap: 18px; align-items: flex-start; flex: 1; min-width: 280px; flex-wrap: wrap;">
              <!-- Date Badge -->
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 68px; height: 68px; background: ${isPast ? "#2a2a2a" : "var(--leaf-dark)"}; border: 2px solid ${isPast ? "#555" : "var(--leaf)"}; border-radius: 8px; flex-shrink: 0; text-align: center;">
                <span style="font-size: 1.45rem; font-weight: 800; line-height: 1; color: var(--paper);">${escapeHtml(evt.date_day || "01")}</span>
                <span style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: ${isPast ? "#aaa" : "var(--leaf-light)"}; letter-spacing: 0.05em; margin-top: 3px;">${escapeHtml(evt.date_month || "OCT")}</span>
              </div>

              <!-- Event Details -->
              <div style="flex: 1; min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                  <span class="hud-pill" style="font-size: 0.72rem; ${isPast ? "color: #aaa; border-color: #555;" : "color: var(--leaf-light); border-color: var(--leaf);"}">${escapeHtml(evt.category || "WORKSHOP")}</span>
                  ${
                    isPast
                      ? '<span class="hud-pill" style="background: rgba(100,100,100,0.3); color: #cbd5e1; font-weight: 700; font-size: 0.72rem; border-color: #666;">⚪ PAST / CONCLUDED</span>'
                      : '<span class="hud-pill" style="background: rgba(82, 183, 136, 0.2); color: #86efac; font-weight: 700; font-size: 0.72rem; border-color: var(--leaf);">🟢 UPCOMING EVENT</span>'
                  }
                  ${
                    !isPast && !isRegOpen
                      ? '<span class="hud-pill" style="color: #f87171; border-color: rgba(248,113,113,0.4); font-size: 0.72rem;">Registrations Closed</span>'
                      : ''
                  }
                </div>

                <h4 style="margin: 0 0 6px; font-size: 1.18rem; color: var(--paper);">${escapeHtml(evt.title)}</h4>

                <div style="display: flex; align-items: center; gap: 14px; font-size: 0.85rem; color: var(--parchment-dim); margin-bottom: 8px; flex-wrap: wrap;">
                  <span>📍 ${escapeHtml(evt.location || "Campus")}</span>
                  ${evt.time_info ? `<span>⏰ ${escapeHtml(evt.time_info)}</span>` : ""}
                  ${evt.entry_fee ? `<span>🎟️ ${escapeHtml(evt.entry_fee)}</span>` : ""}
                </div>

                ${evt.description ? `<p style="margin: 0; font-size: 0.88rem; color: var(--parchment-dim); line-height: 1.45;">${escapeHtml(evt.description)}</p>` : ""}
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="field-actions-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-ghost btn-sm toggle-event-past-btn" data-event-id="${evt.id}" data-is-past="${isPast ? "1" : "0"}" title="${isPast ? "Mark as Upcoming Event" : "Mark as Past / Gone Event"}">
                ${isPast ? "Mark Upcoming" : "Mark as Gone"}
              </button>
              <button type="button" class="btn btn-ghost btn-sm edit-event-btn" data-event-id="${evt.id}">
                Edit
              </button>
              <button type="button" class="btn btn-ghost btn-sm delete-event-btn" data-event-id="${evt.id}" style="color: #ff8888;">
                Delete
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Wire buttons
    adminEventsContainer.querySelectorAll(".toggle-event-past-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleToggleEventPast(btn.dataset.eventId, btn.dataset.isPast === "1"));
    });

    adminEventsContainer.querySelectorAll(".edit-event-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditEventModal(btn.dataset.eventId));
    });

    adminEventsContainer.querySelectorAll(".delete-event-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteEvent(btn.dataset.eventId));
    });
  }

  async function handleToggleEventPast(id, currentlyPast) {
    try {
      const newStatus = currentlyPast ? 0 : 1;
      await window.impactframeApi.updateEvent(id, { is_past: newStatus });
      showNotice(currentlyPast ? "Event marked as Upcoming!" : "Event marked as Past / Concluded!", "success");
      loadAdminEvents();
    } catch (err) {
      showNotice("Failed to update event status: " + err.message, "error");
    }
  }

  function openAddEventModal() {
    eventModalTitle.textContent = "Add Calendar Event";
    eventIdInput.value = "";
    eventTitleInput.value = "";
    eventCategoryInput.value = "WORKSHOP";
    eventDateDayInput.value = "15";
    eventDateMonthInput.value = "OCTOBER";
    eventTimeInput.value = "6:00 PM";
    eventLocationInput.value = "Central Campus Amphitheater";
    eventEntryFeeInput.value = "Free Entry";
    eventDescriptionInput.value = "";
    eventStatusSelect.value = "0";
    eventRegOpenInput.checked = true;
    eventSortOrderInput.value = (adminEventsList.length + 1) * 10;
    eventModal.style.display = "flex";
    eventTitleInput.focus();
  }

  function openEditEventModal(id) {
    const evt = adminEventsList.find((e) => String(e.id) === String(id));
    if (!evt) return;

    eventModalTitle.textContent = `Edit Event: ${evt.title}`;
    eventIdInput.value = evt.id;
    eventTitleInput.value = evt.title || "";
    eventCategoryInput.value = evt.category || "";
    eventDateDayInput.value = evt.date_day || "";
    eventDateMonthInput.value = evt.date_month || "";
    eventTimeInput.value = evt.time_info || "";
    eventLocationInput.value = evt.location || "";
    eventEntryFeeInput.value = evt.entry_fee || "";
    eventDescriptionInput.value = evt.description || "";
    eventStatusSelect.value = String(evt.is_past ? 1 : 0);
    eventRegOpenInput.checked = Boolean(evt.registration_open !== 0 && evt.registration_open !== false);
    eventSortOrderInput.value = evt.sort_order || 10;
    eventModal.style.display = "flex";
  }

  function closeEventModal() {
    if (eventModal) eventModal.style.display = "none";
  }

  async function handleDeleteEvent(id) {
    const evt = adminEventsList.find((e) => String(e.id) === String(id));
    const title = evt ? `"${evt.title}"` : "this event";
    if (!confirm(`Are you sure you want to permanently delete ${title}?`)) return;

    try {
      await window.impactframeApi.deleteEvent(id);
      showNotice("Event removed from schedule.", "info");
      loadAdminEvents();
    } catch (err) {
      showNotice("Failed to delete event: " + err.message, "error");
    }
  }

  if (openAddEventModalBtn) {
    openAddEventModalBtn.addEventListener("click", openAddEventModal);
  }
  if (eventModalCloseBtn) {
    eventModalCloseBtn.addEventListener("click", closeEventModal);
  }
  if (eventModalCancelBtn) {
    eventModalCancelBtn.addEventListener("click", closeEventModal);
  }
  if (eventModal) {
    eventModal.addEventListener("click", (e) => {
      if (e.target === eventModal) closeEventModal();
    });
  }

  if (eventForm) {
    eventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = eventIdInput.value;
      const payload = {
        title: eventTitleInput.value.trim(),
        category: eventCategoryInput.value.trim().toUpperCase(),
        date_day: eventDateDayInput.value.trim(),
        date_month: eventDateMonthInput.value.trim().toUpperCase(),
        time_info: eventTimeInput.value.trim(),
        location: eventLocationInput.value.trim(),
        entry_fee: eventEntryFeeInput.value.trim(),
        description: eventDescriptionInput.value.trim(),
        is_past: parseInt(eventStatusSelect.value, 10) || 0,
        registration_open: eventRegOpenInput.checked ? 1 : 0,
        sort_order: parseInt(eventSortOrderInput.value, 10) || 10,
      };

      try {
        if (id) {
          await window.impactframeApi.updateEvent(id, payload);
          showNotice("Event updated successfully!", "success");
        } else {
          await window.impactframeApi.createEvent(payload);
          showNotice("New event created and added to schedule!", "success");
        }
        closeEventModal();
        loadAdminEvents();
      } catch (err) {
        showNotice("Failed to save event: " + err.message, "error");
      }
    });
  }

  if (eventsSearchInput) {
    eventsSearchInput.addEventListener("input", renderAdminEvents);
  }
  if (eventsStatusFilter) {
    eventsStatusFilter.addEventListener("change", renderAdminEvents);
  }
  if (refreshEventsBtn) {
    refreshEventsBtn.addEventListener("click", () => {
      loadAdminEvents();
      showNotice("Events list refreshed.", "info");
    });
  }

  /* ==========================================================================
     TAB 4: ACCESS LOGS & AUDIT TRAIL DATASHEET
     ========================================================================== */
  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return "—";
    const s = Math.max(0, parseInt(seconds, 10) || 0);
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
    try {
      const str = String(isoStr).trim();
      const sanitized = str.includes("T") ? str : str.replace(" ", "T");
      const d = new Date(sanitized);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(isoStr);
    }
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
                ? `<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                     <span class="crew-protected-pill">&#128274; Primary Account (Protected)</span>
                     <button type="button" class="btn btn-ghost btn-sm trigger-change-my-pw-btn">Change Password</button>
                   </div>`
                : `<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                     <button type="button" class="btn btn-ghost btn-sm reset-crew-pw-btn" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
                       Reset Password
                     </button>
                     <button type="button" class="btn btn-ghost btn-sm delete-user-btn" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" style="color: #f87171;">
                       Revoke Account
                     </button>
                   </div>`
            }
          </div>
        </div>
      `;
      })
      .join("");

    usersListContainer.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteCrewUser(btn.dataset.userId, btn.dataset.username));
    });
    usersListContainer.querySelectorAll(".reset-crew-pw-btn").forEach((btn) => {
      btn.addEventListener("click", () => openResetCrewModal(btn.dataset.userId, btn.dataset.username));
    });
    usersListContainer.querySelectorAll(".trigger-change-my-pw-btn").forEach((btn) => {
      btn.addEventListener("click", openChangePwModal);
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
        showNotice(`Crew account "${res.user.username}" created! Login with "${res.user.username}" or "${fullName}".`, "success");
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

  /* ==========================================================================
     PASSWORD MANAGEMENT: CHANGE PASSWORD & RESET CREW PASSWORD
     ========================================================================== */
  function openChangePwModal() {
    const session = window.impactframeApi.getCurrentSession();
    const uname = session?.username || "ADMIN_MAIN";
    if (changePwTargetUsername) changePwTargetUsername.textContent = uname;
    if (changePwCurrentInput) changePwCurrentInput.value = "";
    if (changePwNewInput) changePwNewInput.value = "";
    if (changePwConfirmInput) changePwConfirmInput.value = "";
    if (changePwError) changePwError.style.display = "none";
    if (changePwModal) changePwModal.style.display = "flex";
    if (changePwCurrentInput) changePwCurrentInput.focus();
  }

  function closeChangePwModal() {
    if (changePwModal) changePwModal.style.display = "none";
    if (changePwError) changePwError.style.display = "none";
  }

  if (openChangePwBtn) openChangePwBtn.addEventListener("click", openChangePwModal);
  if (changePwCloseBtn) changePwCloseBtn.addEventListener("click", closeChangePwModal);
  if (changePwCancelBtn) changePwCancelBtn.addEventListener("click", closeChangePwModal);
  if (changePwModal) {
    changePwModal.addEventListener("click", (e) => {
      if (e.target === changePwModal) closeChangePwModal();
    });
  }

  if (changePwForm) {
    changePwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPw = changePwCurrentInput.value;
      const newPw = changePwNewInput.value;
      const confirmPw = changePwConfirmInput.value;

      if (!currentPw || !newPw) return;

      if (newPw !== confirmPw) {
        changePwError.textContent = "New passwords do not match. Please re-type.";
        changePwError.style.display = "block";
        return;
      }

      if (newPw.length < 4) {
        changePwError.textContent = "New password must be at least 4 characters long.";
        changePwError.style.display = "block";
        return;
      }

      changePwSubmitBtn.disabled = true;
      changePwSubmitBtn.textContent = "Updating…";
      changePwError.style.display = "none";

      try {
        await window.impactframeApi.changeAdminPassword(currentPw, newPw);
        showNotice("Password changed successfully! Keep your new password safe.", "success");
        closeChangePwModal();
      } catch (err) {
        changePwError.textContent = err.message || "Failed to update password.";
        changePwError.style.display = "block";
      } finally {
        changePwSubmitBtn.disabled = false;
        changePwSubmitBtn.innerHTML = "Update Password &rarr;";
      }
    });
  }

  function openResetCrewModal(userId, username) {
    if (resetCrewUserIdInput) resetCrewUserIdInput.value = userId;
    if (resetCrewTargetName) resetCrewTargetName.textContent = username;
    if (resetCrewNewPwInput) resetCrewNewPwInput.value = "";
    if (resetCrewConfirmPwInput) resetCrewConfirmPwInput.value = "";
    if (resetCrewError) resetCrewError.style.display = "none";
    if (resetCrewModal) resetCrewModal.style.display = "flex";
    if (resetCrewNewPwInput) resetCrewNewPwInput.focus();
  }

  function closeResetCrewModal() {
    if (resetCrewModal) resetCrewModal.style.display = "none";
    if (resetCrewError) resetCrewError.style.display = "none";
  }

  if (resetCrewCloseBtn) resetCrewCloseBtn.addEventListener("click", closeResetCrewModal);
  if (resetCrewCancelBtn) resetCrewCancelBtn.addEventListener("click", closeResetCrewModal);
  if (resetCrewModal) {
    resetCrewModal.addEventListener("click", (e) => {
      if (e.target === resetCrewModal) closeResetCrewModal();
    });
  }

  if (resetCrewForm) {
    resetCrewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = resetCrewUserIdInput.value;
      const username = resetCrewTargetName.textContent;
      const newPw = resetCrewNewPwInput.value;
      const confirmPw = resetCrewConfirmPwInput.value;

      if (!userId || !newPw) return;

      if (newPw !== confirmPw) {
        resetCrewError.textContent = "New passwords do not match. Please re-type.";
        resetCrewError.style.display = "block";
        return;
      }

      if (newPw.length < 4) {
        resetCrewError.textContent = "New password must be at least 4 characters long.";
        resetCrewError.style.display = "block";
        return;
      }

      resetCrewSubmitBtn.disabled = true;
      resetCrewSubmitBtn.textContent = "Resetting…";
      resetCrewError.style.display = "none";

      try {
        await window.impactframeApi.resetCrewPassword(userId, newPw);
        showNotice(`Password for "${username}" has been reset successfully!`, "success");
        closeResetCrewModal();
      } catch (err) {
        resetCrewError.textContent = err.message || "Failed to reset crew password.";
        resetCrewError.style.display = "block";
      } finally {
        resetCrewSubmitBtn.disabled = false;
        resetCrewSubmitBtn.innerHTML = "Reset Password &rarr;";
      }
    });
  }
});
