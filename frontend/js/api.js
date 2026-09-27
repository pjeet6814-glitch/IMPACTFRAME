// IMPACTFRAME API Client
// Handles communication with the Express backend, automatically falls back to
// port 4000 when running under VS Code Live Server, and provides offline/mock
// storage resilience if the backend server is temporarily offline.

(function () {
  const LOCAL_STORAGE_KEY = "impactframe_films_cache";
  const SUBMISSIONS_STORAGE_KEY = "impactframe_submissions_cache";
  const FORMS_STORAGE_KEY = "impactframe_form_fields_cache";
  const FORM_SETTINGS_STORAGE_KEY = "impactframe_form_settings_cache";
  const ADMIN_SESSION_KEY = "impactframe_crew_auth";

  const DEFAULT_SAMPLE_FILMS = [];

  // Purge any legacy cached demo films from browser localStorage
  try {
    const cachedFilms = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cachedFilms && (cachedFilms.includes("dQw4w9WgXcQ") || cachedFilms.includes("Groundwater") || cachedFilms.includes("Ash & After"))) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {}

  // Official Social & Email Contact
  const SOCIAL_LINKS = {
    email: "impactframe.ee@charusat.ac.in",
    youtube: "https://www.youtube.com/@ImpactFrameEE",
    instagram: "https://www.instagram.com/impactframe.ee?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw=="
  };

  // Curated Instagram Reels & Shorts Highlights from the club
  const FEATURED_REELS = [];

  // Fallback Form Questions if offline
  const DEFAULT_FORM_FIELDS = [
    {
      id: 1,
      field_key: "full_name",
      label: "Full Name",
      type: "text",
      required: true,
      options: [],
      sort_order: 1
    },
    {
      id: 2,
      field_key: "email",
      label: "Email Address (CHARUSAT / Personal)",
      type: "email",
      required: true,
      options: [],
      sort_order: 2
    },
    {
      id: 3,
      field_key: "phone",
      label: "WhatsApp / Contact Number",
      type: "tel",
      required: true,
      options: [],
      sort_order: 3
    },
    {
      id: 4,
      field_key: "department_sem",
      label: "Department & Current Semester",
      type: "text",
      required: true,
      options: [],
      sort_order: 4
    },
    {
      id: 5,
      field_key: "role_interest",
      label: "Role of Interest (Acting or Crew)",
      type: "select",
      required: true,
      options: [
        "Actor / On-Screen Performer",
        "Voiceover Artist / Narrator",
        "Director & Screenwriter",
        "Cinematographer / Camera Operator",
        "Drone Pilot & Aerial Mapper",
        "Sound Recordist & Foley Designer",
        "Video Editor & Colorist",
        "Generative AI Visual Artist",
        "Field Ecological Researcher / Producer"
      ],
      sort_order: 5
    },
    {
      id: 6,
      field_key: "experience_portfolio",
      label: "Audition Reel, Instagram, or Portfolio Link",
      type: "url",
      required: false,
      options: [],
      sort_order: 6
    },
    {
      id: 7,
      field_key: "motivation",
      label: "Why do you want to perform or work with IMPACTFRAME?",
      type: "textarea",
      required: true,
      options: [],
      sort_order: 7
    }
  ];

  function getApiBase() {
    if (window.IMPACTFRAME_API_BASE !== undefined) {
      return window.IMPACTFRAME_API_BASE;
    }
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && window.location.port && window.location.port !== "4000") {
      return "http://localhost:4000";
    }
    return "";
  }

  function getLocalFilms() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_FILMS));
      return DEFAULT_SAMPLE_FILMS;
    } catch {
      return DEFAULT_SAMPLE_FILMS;
    }
  }

  function saveLocalFilms(films) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(films));
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  }

  // Converts YouTube, Vimeo, and Instagram links into embeddable URLs
  function formatEmbedUrl(url) {
    if (!url) return "";
    url = url.trim();

    // Instagram Reel
    const instaReel = url.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/);
    if (instaReel && instaReel[1]) {
      return `https://www.instagram.com/reel/${instaReel[1]}/embed/`;
    }

    // Instagram Post
    const instaPost = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
    if (instaPost && instaPost[1]) {
      return `https://www.instagram.com/p/${instaPost[1]}/embed/`;
    }

    // YouTube Shorts
    const ytShorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (ytShorts && ytShorts[1]) {
      return `https://www.youtube.com/embed/${ytShorts[1]}`;
    }

    // YouTube watch
    const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/);
    if (ytWatch && ytWatch[1]) {
      return `https://www.youtube.com/embed/${ytWatch[1]}`;
    }

    // YouTube short link
    const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (ytShort && ytShort[1]) {
      return `https://www.youtube.com/embed/${ytShort[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return url;
  }

  async function checkBackendOnline() {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/health`, { method: "GET", signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  function getStoredAdminSession() {
    try {
      const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  const AUDIT_LOGS_STORAGE_KEY = "impactframe_audit_logs_cache_v3";

  function getLocalAuditLogs() {
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveLocalAuditLogs(logs) {
    try {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 150)));
    } catch {}
  }

  function recordLocalAuditLog(entry) {
    if (!entry || !entry.session_id) return;
    const logs = getLocalAuditLogs();
    const idx = logs.findIndex((l) => l.session_id === entry.session_id);
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...entry };
    } else {
      logs.unshift(entry);
    }
    saveLocalAuditLogs(logs);
  }

  function recordLocalAuditLogout(sessionId) {
    if (!sessionId) return;
    const logs = getLocalAuditLogs();
    const idx = logs.findIndex((l) => l.session_id === sessionId);
    if (idx >= 0) {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const loginTime = logs[idx].login_time;
      let duration = 1;
      if (loginTime) {
        duration = Math.max(1, Math.round((new Date(now) - new Date(loginTime)) / 1000));
      }
      logs[idx].status = "LOGGED_OUT";
      logs[idx].logout_time = now;
      logs[idx].duration_seconds = duration;
      logs[idx].computed_duration = duration;
      saveLocalAuditLogs(logs);
    }
  }

  let currentAdminSession = getStoredAdminSession();

  async function loginAdmin(username, password) {
    if (!username || !password) {
      return { success: false, error: "Both username and password are required." };
    }

    const trimmed = String(username).trim();
    const norm = trimmed.toUpperCase();
    const slug = norm.replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    const adminSlug = slug.startsWith("ADMIN_") ? slug : `ADMIN_${slug}`;
    const plainSlug = slug.startsWith("ADMIN_") ? slug.replace(/^ADMIN_/, "") : slug;

    // Find if user is in local crew cache to send cached verification
    const localUsers = getLocalCrewUsers();
    const cachedUser = localUsers.find((u) => {
      const uUpper = (u.username || "").toUpperCase();
      const fnUpper = (u.full_name || "").toUpperCase();
      return (
        uUpper === norm ||
        uUpper === slug ||
        uUpper === adminSlug ||
        uUpper === plainSlug ||
        fnUpper === norm ||
        fnUpper === trimmed.toUpperCase()
      );
    });

    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          cached_user: cachedUser && cachedUser.password_hash ? {
            username: cachedUser.username,
            password_hash: cachedUser.password_hash,
            salt: cachedUser.salt,
            role: cachedUser.role,
            full_name: cachedUser.full_name,
            created_by: cachedUser.created_by,
          } : undefined,
        }),
        signal: AbortSignal.timeout(4500),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const loginTime = new Date().toISOString().replace("T", " ").slice(0, 19);
        currentAdminSession = {
          token: data.token,
          session_id: data.session_id,
          username: data.username,
          role: data.role,
          full_name: data.full_name,
          login_time: loginTime,
        };
        recordLocalAuditLog({
          session_id: data.session_id,
          token: data.token,
          username: data.username,
          role: data.role,
          login_time: loginTime,
          logout_time: null,
          status: "ACTIVE",
          computed_duration: 1,
        });
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentAdminSession));
        } catch {}
        return { success: true, session: currentAdminSession, backend: true };
      }
      return { success: false, error: data.error || "Incorrect username or password." };
    } catch (e) {
      // Offline fallback for master admin
      if ((norm === "ADMIN_MAIN" || norm === "ADMIN" || norm === "MAIN") && password === "impactframe2026") {
        const loginTime = new Date().toISOString().replace("T", " ").slice(0, 19);
        currentAdminSession = {
          token: "impactframe2026",
          session_id: "IF-OFFLINE-" + Date.now().toString().slice(-6),
          username: "ADMIN_MAIN",
          role: "MAIN",
          full_name: "System Master Administrator (Offline)",
          login_time: loginTime,
        };
        recordLocalAuditLog({
          session_id: currentAdminSession.session_id,
          token: currentAdminSession.token,
          username: currentAdminSession.username,
          role: currentAdminSession.role,
          login_time: loginTime,
          logout_time: null,
          status: "ACTIVE",
          computed_duration: 1,
        });
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentAdminSession));
        } catch {}
        return { success: true, session: currentAdminSession, backend: false };
      }

      // Offline fallback for cached crew members
      if (cachedUser) {
        const loginTime = new Date().toISOString().replace("T", " ").slice(0, 19);
        currentAdminSession = {
          token: "impactframe2026",
          session_id: "IF-CREW-" + Date.now().toString().slice(-6),
          username: cachedUser.username,
          role: cachedUser.role || "CREW",
          full_name: cachedUser.full_name || cachedUser.username,
          login_time: loginTime,
        };
        recordLocalAuditLog({
          session_id: currentAdminSession.session_id,
          token: currentAdminSession.token,
          username: currentAdminSession.username,
          role: currentAdminSession.role,
          login_time: loginTime,
          logout_time: null,
          status: "ACTIVE",
          computed_duration: 1,
        });
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentAdminSession));
        } catch {}
        return { success: true, session: currentAdminSession, backend: false };
      }

      return { success: false, error: "Unable to verify credentials. Please ensure backend server is running." };
    }
  }

  // Backward compatibility wrapper
  async function verifyAdminPassword(password) {
    return loginAdmin("ADMIN_MAIN", password);
  }

  async function logoutAdmin(sessionId) {
    const session = getCurrentSession();
    const sid = sessionId || session?.session_id;
    const token = session?.token;
    const uname = session?.username;
    const role = session?.role;
    const loginTime = session?.login_time;

    recordLocalAuditLogout(sid);
    clearAdminAuth();
    if (!sid && !token) return { success: true };
    const base = getApiBase();
    try {
      await fetch(`${base}/api/admin/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, token, username: uname, role, login_time: loginTime }),
      });
    } catch {}
    return { success: true };
  }

  function logoutAdminBeacon(sessionId) {
    const session = getCurrentSession();
    const sid = sessionId || session?.session_id;
    const token = session?.token;
    const uname = session?.username;
    const role = session?.role;
    const loginTime = session?.login_time;

    recordLocalAuditLogout(sid);
    clearAdminAuth();
    if (!sid && !token) return;

    const base = getApiBase();
    const payload = JSON.stringify({
      session_id: sid,
      token,
      username: uname,
      role,
      login_time: loginTime,
    });

    try {
      // 1. fetch with keepalive: true (W3C standard for tab/browser close)
      fetch(`${base}/api/admin/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {}

    try {
      // 2. Fallback to navigator.sendBeacon
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${base}/api/admin/logout`, new Blob([payload], { type: "text/plain" }));
      }
    } catch {}
  }

  function sendHeartbeat() {
    const session = getCurrentSession();
    if (!session || !session.token) return;
    const base = getApiBase();
    fetch(`${base}/api/admin/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": session.token,
        "x-session-id": session.session_id || "",
      },
      body: JSON.stringify({
        token: session.token,
        session_id: session.session_id,
      }),
    }).catch(() => {});
  }

  function getSavedAdminPassword() {
    if (!currentAdminSession) {
      currentAdminSession = getStoredAdminSession();
    }
    return currentAdminSession?.token || "impactframe2026";
  }

  function getCurrentSession() {
    if (!currentAdminSession) {
      currentAdminSession = getStoredAdminSession();
    }
    return currentAdminSession;
  }

  function clearAdminAuth() {
    currentAdminSession = null;
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  }

  // Returns true if currently authenticated in this admin tab
  function isCrewAuthenticated() {
    if (!currentAdminSession) {
      currentAdminSession = getStoredAdminSession();
    }
    return Boolean(currentAdminSession && currentAdminSession.token);
  }

  // ==========================================
  // Films CRUD
  // ==========================================
  async function getFilms(category) {
    const base = getApiBase();
    const endpoint = `${base}/api/films` + (category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "");

    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const films = await res.json();
        if (!category || category === "All") {
          saveLocalFilms(films);
        }
        return films;
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      let films = getLocalFilms();
      if (category && category !== "All") {
        films = films.filter((f) => f.category === category);
      }
      return films;
    }
  }

  async function getFilm(id) {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/films/${id}`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) return await res.json();
    } catch {}
    const local = getLocalFilms();
    return local.find((f) => String(f.id) === String(id)) || null;
  }

  async function createFilm(filmData, adminKey) {
    const base = getApiBase();
    const formattedData = {
      ...filmData,
      video_url: formatEmbedUrl(filmData.video_url),
      duration_minutes: parseInt(filmData.duration_minutes, 10),
      release_year: parseInt(filmData.release_year, 10),
    };

    try {
      const token = adminKey || getSavedAdminPassword();
      const res = await fetch(`${base}/api/films`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": token,
          "x-session-token": token,
        },
        body: JSON.stringify(formattedData),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const created = await res.json();
        const local = getLocalFilms();
        local.unshift(created);
        saveLocalFilms(local);
        return { success: true, film: created, backend: true };
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || (errorData.errors ? errorData.errors.join("; ") : `Error ${res.status}`));
      }
    } catch (err) {
      if (err.message && (err.message.includes("admin key") || err.message.includes("Server misconfigured"))) {
        throw err;
      }
      const local = getLocalFilms();
      const newId = local.length ? Math.max(...local.map((f) => Number(f.id) || 0)) + 1 : 1;
      const newFilm = { id: newId, ...formattedData, created_at: new Date().toISOString() };
      local.unshift(newFilm);
      saveLocalFilms(local);
      return { success: true, film: newFilm, backend: false };
    }
  }

  async function updateFilm(id, filmData, adminKey) {
    const base = getApiBase();
    const formattedData = {
      ...filmData,
      video_url: formatEmbedUrl(filmData.video_url),
      duration_minutes: parseInt(filmData.duration_minutes, 10),
      release_year: parseInt(filmData.release_year, 10),
    };

    try {
      const token = adminKey || getSavedAdminPassword();
      const res = await fetch(`${base}/api/films/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": token,
          "x-session-token": token,
        },
        body: JSON.stringify(formattedData),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const updated = await res.json();
        const local = getLocalFilms().map((f) => (String(f.id) === String(id) ? updated : f));
        saveLocalFilms(local);
        return { success: true, film: updated, backend: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || (errData.errors ? errData.errors.join("; ") : `Error ${res.status}`));
      }
    } catch (err) {
      if (err.message && (err.message.includes("admin key") || err.message.includes("Server misconfigured"))) {
        throw err;
      }
      const local = getLocalFilms().map((f) => (String(f.id) === String(id) ? { ...f, ...formattedData } : f));
      saveLocalFilms(local);
      return { success: true, film: { id, ...formattedData }, backend: false };
    }
  }

  async function deleteFilm(id, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    try {
      const res = await fetch(`${base}/api/films/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": token,
          "x-session-token": token,
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.status === 204 || res.ok) {
        const local = getLocalFilms().filter((f) => String(f.id) !== String(id));
        saveLocalFilms(local);
        return { success: true, backend: true };
      }
    } catch {}
    const local = getLocalFilms().filter((f) => String(f.id) !== String(id));
    saveLocalFilms(local);
    return { success: true, backend: false };
  }

  // ==========================================
  // Form Settings & Multi-Form Builder Controls
  // ==========================================
  const DEFAULT_FORM_CONFIGS = {
    auditions: {
      id: 1,
      form_type: "auditions",
      form_title: "IMPACTFRAME 2026 Auditions & Roles Application",
      form_description: "Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.",
      is_accepting_responses: true,
      closed_message: "This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!",
      confirmation_message: "Thank you! Your response has been recorded. Our production directors will review your application and contact you soon via WhatsApp/Email.",
      header_banner_url: "",
      qr_code_image: "",
      qr_code_title: "",
      qr_code_instruction: "",
    },
    join_crew: {
      id: 2,
      form_type: "join_crew",
      form_title: "IMPACTFRAME Crew Application & Project Pitch",
      form_description: "Apply to join our camera, sound, AI lab, screenwriting, editing tracks or pitch a campus conservation project.",
      is_accepting_responses: true,
      closed_message: "Crew applications are currently closed. Follow our Instagram @impactframe.ee for the next recruitment cycle!",
      confirmation_message: "Application received! We'll review your note and message you on Instagram/Email for the next studio screening session.",
      header_banner_url: "",
      qr_code_image: "",
      qr_code_title: "",
      qr_code_instruction: "",
    },
    events: {
      id: 3,
      form_type: "events",
      form_title: "Screenings & Workshops — Seat Reservation",
      form_description: "Reserve your seat for upcoming campus film showcases, hands-on production workshops, and AI colloquiums.",
      is_accepting_responses: true,
      closed_message: "Registrations for upcoming events are currently closed or at full capacity. Check back soon!",
      confirmation_message: "Seat reserved successfully! Your booking confirmation code has been generated. Show this at the entrance.",
      header_banner_url: "",
      qr_code_image: "",
      qr_code_title: "",
      qr_code_instruction: "",
    }
  };

  const DEFAULT_FORM_SETTINGS = DEFAULT_FORM_CONFIGS.auditions;

  function getFormSettingsCacheKey(formType = "auditions") {
    return `${FORM_SETTINGS_STORAGE_KEY}_${String(formType).toLowerCase().trim()}`;
  }

  function getFormFieldsCacheKey(formType = "auditions") {
    return `${FORMS_STORAGE_KEY}_${String(formType).toLowerCase().trim()}`;
  }

  async function getFormSettings(formType = "auditions") {
    const cleanType = String(formType).toLowerCase().trim() || "auditions";
    const base = getApiBase();
    const cacheKey = getFormSettingsCacheKey(cleanType);
    const defaultCfg = DEFAULT_FORM_CONFIGS[cleanType] || DEFAULT_FORM_CONFIGS.auditions;

    let cached = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetch(`${base}/api/form-settings?form_type=${encodeURIComponent(cleanType)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const serverSettings = await res.json();
        if (cached && cached.is_custom) {
          const isServerDefault =
            serverSettings.form_title === defaultCfg.form_title &&
            serverSettings.is_accepting_responses === defaultCfg.is_accepting_responses &&
            serverSettings.form_description === defaultCfg.form_description &&
            serverSettings.closed_message === defaultCfg.closed_message;

          if (isServerDefault) {
            updateFormSettings(cached, cleanType).catch(() => {});
            return cached;
          }
        }

        const merged = { ...defaultCfg, ...cached, ...serverSettings };
        if (cached?.is_custom) merged.is_custom = true;
        localStorage.setItem(cacheKey, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn("Notice loading form-settings, using cached settings:", e);
    }

    if (cached) return { ...defaultCfg, ...cached };
    return defaultCfg;
  }

  async function updateFormSettings(settingsData, formType = "auditions", adminKey) {
    const cleanType = String(formType || settingsData.form_type || "auditions").toLowerCase().trim();
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const cacheKey = getFormSettingsCacheKey(cleanType);
    const defaultCfg = DEFAULT_FORM_CONFIGS[cleanType] || DEFAULT_FORM_CONFIGS.auditions;

    let current = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) current = JSON.parse(raw);
    } catch {}

    const payload = {
      ...defaultCfg,
      ...current,
      ...settingsData,
      form_type: cleanType,
      is_custom: true,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(payload));

    try {
      const res = await fetch(`${base}/api/form-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": token,
          "x-admin-key": token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const updated = await res.json();
        const merged = { ...payload, ...updated, is_custom: true };
        localStorage.setItem(cacheKey, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn("Notice updating server form-settings, persisted in local cache:", err);
    }

    return payload;
  }

  // ==========================================
  // Dynamic Form Fields & Form Builder
  // ==========================================
  async function getFormFields(formType = "auditions") {
    const cleanType = String(formType).toLowerCase().trim() || "auditions";
    const base = getApiBase();
    const cacheKey = getFormFieldsCacheKey(cleanType);
    try {
      const res = await fetch(`${base}/api/form-fields?form_type=${encodeURIComponent(cleanType)}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const fields = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify(fields));
        return fields;
      }
    } catch {}
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_FORM_FIELDS;
  }

  async function getAllFormFields(formType = "auditions", adminKey) {
    const cleanType = String(formType).toLowerCase().trim() || "auditions";
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    try {
      const res = await fetch(`${base}/api/form-fields/all?form_type=${encodeURIComponent(cleanType)}`, {
        headers: { "x-session-token": token, "x-admin-key": token },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return await res.json();
    } catch {}
    return getFormFields(cleanType);
  }

  async function createFormField(fieldData, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-fields`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(fieldData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  }

  async function updateFormField(id, fieldData, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-fields/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(fieldData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  }

  async function reorderFormFields(orderedIds, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-fields/reorder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Reorder failed (${res.status})`);
    }
    return res.json();
  }

  async function duplicateFormField(id, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-fields/${id}/duplicate`, {
      method: "POST",
      headers: {
        "x-session-token": token,
        "x-admin-key": token,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Duplicate failed (${res.status})`);
    }
    return res.json();
  }

  async function deleteFormField(id, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-fields/${id}`, {
      method: "DELETE",
      headers: {
        "x-session-token": token,
        "x-admin-key": token,
      },
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete field (${res.status})`);
    }
    return true;
  }

  // ==========================================
  // Submissions / Datasheet
  // ==========================================
  async function submitApplication(formData, formType = "auditions") {
    const cleanType = String(formType || formData.form_type || "auditions").toLowerCase().trim();
    const payload = { ...formData, form_type: cleanType };
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      if (res.status === 403 && err.closed) {
        throw new Error(err.error || "This form is currently closed to new responses.");
      }
      throw new Error(err.error || `Submission failed (${res.status})`);
    } catch (e) {
      if (e.message && e.message.includes("closed")) {
        throw e;
      }
      // Offline fallback: store locally
      let subs = [];
      try {
        subs = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
      } catch {}
      const fallbackId = subs.length + 1;
      const submission = {
        id: fallbackId,
        form_type: cleanType,
        applicant_name: formData.full_name || formData.name || "Applicant",
        applicant_email: formData.email || "",
        applicant_phone: formData.phone || formData.whatsapp || "",
        role_interest: formData.role_interest || formData.track_interest || formData.event_selected || "General",
        data: formData,
        status: "New",
        created_at: new Date().toISOString(),
      };
      subs.unshift(submission);
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(subs));
      const prefix = cleanType === "join_crew" ? "IF-CREW" : (cleanType === "events" ? "IF-EVT" : "IF-AUD");
      return {
        success: true,
        reference_id: `${prefix}-OFFLINE-${fallbackId}`,
        confirmation_message: "Thank you! Your response has been recorded.",
        submission,
      };
    }
  }

  async function getSubmissions(filters = {}, adminKey) {
    const base = getApiBase();
    const params = new URLSearchParams();
    if (filters.form_type && filters.form_type !== "All") params.set("form_type", filters.form_type);
    if (filters.role && filters.role !== "All") params.set("role", filters.role);
    if (filters.status && filters.status !== "All") params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);

    try {
      const res = await fetch(`${base}/api/submissions?${params.toString()}`, {
        headers: { "x-admin-key": adminKey || getSavedAdminPassword() },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {}

    // Fallback to local storage
    try {
      let list = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
      if (filters.form_type && filters.form_type !== "All") {
        list = list.filter((s) => (s.form_type || "auditions") === filters.form_type.toLowerCase());
      }
      if (filters.role && filters.role !== "All") {
        list = list.filter((s) => s.role_interest && s.role_interest.includes(filters.role));
      }
      if (filters.status && filters.status !== "All") {
        list = list.filter((s) => s.status === filters.status);
      }
      return list;
    } catch {
      return [];
    }
  }

  async function updateSubmissionStatus(id, status, adminKey) {
    const base = getApiBase();
    const res = await fetch(`${base}/api/submissions/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey || getSavedAdminPassword(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return res.json();
  }

  async function deleteSubmission(id, adminKey) {
    const base = getApiBase();
    const res = await fetch(`${base}/api/submissions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey || getSavedAdminPassword() },
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete submission");
    return true;
  }

  // 1-Click CSV Export Generator
  function exportSubmissionsCsv(submissions) {
    if (!submissions || !submissions.length) {
      alert("No submissions available to export.");
      return;
    }

    const headers = ["ID", "Form Type", "Date", "Name", "Email", "Phone", "Role / Event", "Status", "Full Details"];
    const rows = submissions.map((s) => [
      s.id,
      `"${s.form_type || "auditions"}"`,
      `"${s.created_at || ""}"`,
      `"${(s.applicant_name || "").replace(/"/g, '""')}"`,
      `"${(s.applicant_email || "").replace(/"/g, '""')}"`,
      `"${(s.applicant_phone || "").replace(/"/g, '""')}"`,
      `"${(s.role_interest || "").replace(/"/g, '""')}"`,
      `"${s.status || ""}"`,
      `"${JSON.stringify(s.data || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `impactframe_datasheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // Events & Workshops Calendar API
  // ==========================================
  async function getEvents() {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/events`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Notice loading events:", e);
    }
    return [
      {
        id: 1,
        title: "Annual IMPACTFRAME Showcase & Production Kickoff",
        category: "CLUB SHOWCASE & ORIENTATION",
        date_day: "18",
        date_month: "OCTOBER",
        location: "Central Campus Amphitheater",
        time_info: "7:00 PM",
        entry_fee: "Free Entry",
        description: "Open-air screening of upcoming student productions, introduction to club departments, and interactive Q&A for aspiring student filmmakers, actors, and editors.",
        registration_open: 1,
        sort_order: 1,
      },
      {
        id: 2,
        title: "Field Audio in Extreme Environments: Hydrophones & Foley",
        category: "HANDS-ON WORKSHOP",
        date_day: "04",
        date_month: "NOVEMBER",
        location: "Media Studio Lab B",
        time_info: "3:00 PM",
        entry_fee: "Equipment provided",
        description: "Learn how to capture the sounds people normally ignore: subterranean water flow, wind resonance across solar farms, and wet clay acoustic mapping.",
        registration_open: 1,
        sort_order: 2,
      },
      {
        id: 3,
        title: "Prompt to Picture: Generative AI for Eco-Storytellers",
        category: "AI LAB COLLOQUIUM",
        date_day: "22",
        date_month: "NOVEMBER",
        location: "Auditorium Hall 2",
        time_info: "5:00 PM",
        entry_fee: "Open to all branches",
        description: "How our AI Film department crafts speculative climate futures without relying on plastic clichés. Includes ComfyUI workflow walkthroughs.",
        registration_open: 1,
        sort_order: 3,
      }
    ];
  }

  async function createEvent(eventData, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create event");
    }
    return res.json();
  }

  async function updateEvent(id, eventData, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/events/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update event");
    }
    return res.json();
  }

  async function deleteEvent(id, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/events/${id}`, {
      method: "DELETE",
      headers: {
        "x-session-token": token,
        "x-admin-key": token,
      },
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete event");
    return true;
  }

  // File to Base64 with automatic client compression helper
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        if (file.size <= 1.5 * 1024 * 1024 || !file.type.startsWith("image/")) {
          return resolve(result);
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1400;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // ==========================================
  // Audit Logs & Access Datasheet
  // ==========================================
  async function getAuditLogs(filters = {}) {
    const base = getApiBase();
    const params = new URLSearchParams();
    if (filters.username && filters.username !== "All") params.set("username", filters.username);
    if (filters.status && filters.status !== "All") params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);

    const token = getSavedAdminPassword();
    let backendLogs = null;
    try {
      const res = await fetch(`${base}/api/admin/audit-logs?${params.toString()}`, {
        headers: { "x-session-token": token, "x-admin-key": token },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        backendLogs = await res.json();
      }
    } catch (e) {
      console.warn("Notice loading audit logs from server, using local access logs:", e);
    }

    const localLogs = getLocalAuditLogs();

    // If backend succeeded, merge with localLogs
    let combinedLogs = [];
    if (Array.isArray(backendLogs)) {
      const map = new Map();
      backendLogs.forEach((l) => map.set(l.session_id, l));

      const missingOnBackend = [];
      localLogs.forEach((l) => {
        if (!map.has(l.session_id)) {
          map.set(l.session_id, l);
          missingOnBackend.push(l);
        } else {
          // If local log was marked LOGGED_OUT on tab close, but backend container missed it
          const bLog = map.get(l.session_id);
          if (l.status === "LOGGED_OUT" && bLog.status === "ACTIVE") {
            map.set(l.session_id, { ...bLog, ...l });
          }
        }
      });

      combinedLogs = Array.from(map.values()).sort(
        (a, b) => new Date(b.login_time || 0) - new Date(a.login_time || 0)
      );
      saveLocalAuditLogs(combinedLogs);

      // Hydrate serverless container with local logs if missing
      if (missingOnBackend.length > 0) {
        fetch(`${base}/api/admin/audit-logs/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-token": token,
            "x-admin-key": token,
          },
          body: JSON.stringify({ logs: missingOnBackend }),
        }).catch(() => {});
      }
    } else {
      combinedLogs = localLogs;
    }

    // Apply filters to combined logs
    let filtered = combinedLogs;
    if (filters.username && filters.username !== "All") {
      filtered = filtered.filter((l) => l.username === filters.username);
    }
    if (filters.status && filters.status !== "All") {
      filtered = filtered.filter((l) => l.status === filters.status);
    }
    if (filters.q && filters.q.trim()) {
      const qLower = filters.q.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.username && l.username.toLowerCase().includes(qLower)) ||
          (l.session_id && l.session_id.toLowerCase().includes(qLower))
      );
    }

    return filtered;
  }

  function exportAuditLogsCsv(logs) {
    if (!logs || !logs.length) {
      alert("No access logs available to export.");
      return;
    }

    const headers = ["Session ID", "Username", "Role", "Login Time", "Logout Time", "Duration (Secs)", "IP Address", "Status"];
    const rows = logs.map((l) => [
      `"${l.session_id || ""}"`,
      `"${l.username || ""}"`,
      `"${l.role || ""}"`,
      `"${l.login_time || ""}"`,
      `"${l.logout_time || ""}"`,
      l.computed_duration ?? l.duration_seconds ?? 0,
      `"${l.ip_address || ""}"`,
      `"${l.status || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `impactframe_access_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // Crew Users Management (ADMIN_MAIN)
  // ==========================================
  const CREW_USERS_STORAGE_KEY = "impactframe_crew_users_cache";

  const DEFAULT_CREW_USERS = [
    {
      id: 1,
      username: "ADMIN_MAIN",
      role: "MAIN",
      full_name: "System Master Administrator",
      created_by: "SYSTEM",
      created_at: "2026-01-01 00:00:00",
      is_active: 1
    }
  ];

  function getLocalCrewUsers() {
    try {
      const stored = localStorage.getItem(CREW_USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(CREW_USERS_STORAGE_KEY, JSON.stringify(DEFAULT_CREW_USERS));
      return DEFAULT_CREW_USERS;
    } catch {
      return DEFAULT_CREW_USERS;
    }
  }

  function saveLocalCrewUsers(users) {
    try {
      localStorage.setItem(CREW_USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {}
  }

  async function getCrewUsers() {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    try {
      const res = await fetch(`${base}/api/admin/users`, {
        headers: { "x-session-token": token, "x-admin-key": token },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const backendUsers = await res.json();
        if (Array.isArray(backendUsers)) {
          const localUsers = getLocalCrewUsers();
          const userMap = new Map();
          const localMap = new Map();
          localUsers.forEach((u) => localMap.set(u.username, u));

          backendUsers.forEach((bu) => {
            const loc = localMap.get(bu.username);
            userMap.set(bu.username, {
              ...bu,
              password_hash: loc?.password_hash,
              salt: loc?.salt,
            });
          });

          // Also keep any local accounts not yet present in this container
          const missingOnBackend = [];
          localUsers.forEach((u) => {
            if (!userMap.has(u.username) && u.username !== "ADMIN_MAIN") {
              userMap.set(u.username, u);
              if (u.password_hash && u.salt) {
                missingOnBackend.push(u);
              }
            }
          });

          const merged = Array.from(userMap.values());
          saveLocalCrewUsers(merged);

          // If container lacks these crew accounts, hydrate it
          if (missingOnBackend.length > 0) {
            fetch(`${base}/api/admin/sync-users`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-session-token": token,
                "x-admin-key": token,
              },
              body: JSON.stringify({ users: missingOnBackend }),
            }).catch(() => {});
          }

          return merged;
        }
      }
    } catch (e) {
      console.warn("Backend getCrewUsers notice, falling back to cached accounts:", e);
    }
    return getLocalCrewUsers();
  }

  async function createCrewUser(userData) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const fullName = (userData && (userData.name || userData.full_name)) ? String(userData.name || userData.full_name).trim() : "";
    const password = userData && userData.password ? String(userData.password) : "";

    if (!fullName) throw new Error("Crew member name is required.");
    if (!password || password.length < 4) throw new Error("Password must be at least 4 characters.");

    const res = await fetch(`${base}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify({ full_name: fullName, password }),
      signal: AbortSignal.timeout(6000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Server error (${res.status}): Failed to provision user.`);
    }

    const newUser = data.user;
    const syncData = data.sync_data || {};

    const local = getLocalCrewUsers();
    const idx = local.findIndex((u) => u.username === newUser.username);
    const storedUser = {
      ...newUser,
      ...syncData,
    };
    if (idx >= 0) {
      local[idx] = storedUser;
    } else {
      local.push(storedUser);
    }
    saveLocalCrewUsers(local);

    return {
      ok: true,
      message: data.message || `Crew login ${newUser.username} created successfully!`,
      user: newUser,
    };
  }

  async function deleteCrewUser(id) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    try {
      await fetch(`${base}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "x-session-token": token, "x-admin-key": token },
        signal: AbortSignal.timeout(3000),
      });
    } catch (e) {
      console.warn("Backend delete user notice:", e);
    }

    const local = getLocalCrewUsers().filter((u) => String(u.id) !== String(id));
    saveLocalCrewUsers(local);
    return { ok: true, message: "Account removed." };
  }

  // ==========================================
  // Password Management
  // ==========================================
  async function changeAdminPassword(currentPassword, newPassword) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to change password");

    if (data.sync_data) {
      const local = getLocalCrewUsers();
      const idx = local.findIndex((u) => u.username === data.sync_data.username);
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...data.sync_data };
        saveLocalCrewUsers(local);
      }
    }

    return data;
  }

  async function resetCrewPassword(userId, newPassword) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify({ new_password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to reset password");

    if (data.sync_data) {
      const local = getLocalCrewUsers();
      const idx = local.findIndex((u) => String(u.id) === String(userId) || u.username === data.sync_data.username);
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...data.sync_data };
        saveLocalCrewUsers(local);
      }
    }

    return data;
  }

  window.impactframeApi = {
    getApiBase,
    checkBackendOnline,
    formatEmbedUrl,
    loginAdmin,
    verifyAdminPassword,
    logoutAdmin,
    logoutAdminBeacon,
    getCurrentSession,
    getSavedAdminPassword,
    clearAdminAuth,
    isCrewAuthenticated,
    getFilms,
    getFilm,
    createFilm,
    updateFilm,
    deleteFilm,
    // Dynamic Forms & Submissions
    getFormSettings,
    updateFormSettings,
    getFormFields,
    getAllFormFields,
    createFormField,
    updateFormField,
    reorderFormFields,
    duplicateFormField,
    deleteFormField,
    submitApplication,
    getSubmissions,
    updateSubmissionStatus,
    deleteSubmission,
    exportSubmissionsCsv,
    // Audit Logs & Crew Users
    getAuditLogs,
    exportAuditLogsCsv,
    sendHeartbeat,
    getCrewUsers,
    createCrewUser,
    deleteCrewUser,
    // Password Management
    // Events & Workshops
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    // File & Photo Helper
    fileToDataUrl,
    DEFAULT_FORM_CONFIGS,
    // Constants
    socialLinks: SOCIAL_LINKS,
    featuredReels: FEATURED_REELS,
  };
})();

