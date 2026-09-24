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

  const DEFAULT_SAMPLE_FILMS = [
    {
      id: 1,
      title: "Groundwater",
      category: "Documentary",
      synopsis: "A look at the campus borewell crisis and the students mapping it street by street.",
      duration_minutes: 14,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail_url: "",
      release_year: 2025,
      created_at: "2025-01-15 10:00:00",
      aspect_ratio: "16:9"
    },
    {
      id: 2,
      title: "Ash & After",
      category: "Short Film",
      synopsis: "A forest fire's aftermath, told through the eyes of a ranger returning home.",
      duration_minutes: 9,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail_url: "",
      release_year: 2025,
      created_at: "2025-02-01 14:30:00",
      aspect_ratio: "16:9"
    },
    {
      id: 3,
      title: "What the River Remembers",
      category: "AI Film",
      synopsis: "An AI-generated visual poem imagining the river before the dam.",
      duration_minutes: 4,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail_url: "",
      release_year: 2024,
      created_at: "2024-11-20 09:15:00",
      aspect_ratio: "16:9"
    }
  ];

  // Official Social & Email Contact
  const SOCIAL_LINKS = {
    email: "impactframe.ee@charusat.ac.in",
    youtube: "https://www.youtube.com/@ImpactFrameEE",
    instagram: "https://www.instagram.com/impactframe.ee?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw=="
  };

  // Curated Instagram Reels & Shorts Highlights from the club
  const FEATURED_REELS = [
    {
      id: "reel-1",
      title: "Campus Energy Audit: Night Thermal Camera Scan",
      platform: "instagram",
      url: "https://www.instagram.com/impactframe.ee?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==",
      embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      views: "2.4K",
      caption: "We walked the mechanical engineering wings with thermal sensors at 2 AM. Look at where heat leaks."
    },
    {
      id: "reel-2",
      title: "Field Audio: Capturing Rain on Solar Panels",
      platform: "instagram",
      url: "https://www.instagram.com/impactframe.ee?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==",
      embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      views: "4.1K",
      caption: "Hydrophones taped to aluminum frames during the first monsoon shower. Pure tactile resonance."
    },
    {
      id: "reel-3",
      title: "AI Generative Forest: 100 Years of Rewilding",
      platform: "youtube",
      url: "https://www.youtube.com/@ImpactFrameEE",
      embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      views: "5.8K",
      caption: "Diffusing satellite topographical maps into a century of continuous tree canopy growth."
    }
  ];

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

  let currentAdminSession = getStoredAdminSession();

  async function loginAdmin(username, password) {
    if (!username || !password) {
      return { success: false, error: "Both username and password are required." };
    }
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(3500),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        currentAdminSession = {
          token: data.token,
          session_id: data.session_id,
          username: data.username,
          role: data.role,
          full_name: data.full_name,
        };
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentAdminSession));
        } catch {}
        return { success: true, session: currentAdminSession, backend: true };
      }
      return { success: false, error: data.error || "Incorrect username or password." };
    } catch (e) {
      // Offline fallback for testing
      const norm = username.trim().toUpperCase();
      if ((norm === "ADMIN_MAIN" || norm === "ADMIN") && password === "impactframe2026") {
        currentAdminSession = {
          token: "offline-token-main",
          session_id: "IF-OFFLINE-" + Date.now().toString().slice(-6),
          username: "ADMIN_MAIN",
          role: "MAIN",
          full_name: "System Master Administrator (Offline)",
        };
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
    const sid = sessionId || currentAdminSession?.session_id;
    const token = currentAdminSession?.token;
    clearAdminAuth();
    if (!sid && !token) return { success: true };
    const base = getApiBase();
    try {
      await fetch(`${base}/api/admin/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, token }),
      });
    } catch {}
    return { success: true };
  }

  function logoutAdminBeacon(sessionId) {
    const sid = sessionId || currentAdminSession?.session_id;
    const token = currentAdminSession?.token;
    clearAdminAuth();
    if (!sid && !token) return;
    const base = getApiBase();
    try {
      const payload = JSON.stringify({ session_id: sid, token });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${base}/api/admin/logout`, new Blob([payload], { type: "text/plain" }));
      }
    } catch {}
  }

  function getSavedAdminPassword() {
    if (!currentAdminSession) {
      currentAdminSession = getStoredAdminSession();
    }
    return currentAdminSession?.token || "";
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
      const res = await fetch(`${base}/api/films`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || getSavedAdminPassword(),
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
      const res = await fetch(`${base}/api/films/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || getSavedAdminPassword(),
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
    try {
      const res = await fetch(`${base}/api/films/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey || getSavedAdminPassword(),
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
  // Form Settings & Google Forms Builder Controls
  // ==========================================
  const DEFAULT_FORM_SETTINGS = {
    form_title: "IMPACTFRAME 2026 Auditions & Roles Application",
    form_description: "Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.",
    is_accepting_responses: true,
    closed_message: "This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!",
    confirmation_message: "Thank you! Your response has been recorded. Our production directors will review your application and contact you soon via WhatsApp/Email.",
    header_banner_url: "",
  };

  async function getFormSettings() {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/form-settings`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const settings = await res.json();
        localStorage.setItem(FORM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return settings;
      }
    } catch {}
    try {
      const cached = localStorage.getItem(FORM_SETTINGS_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_FORM_SETTINGS;
  }

  async function updateFormSettings(settingsData, adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    const res = await fetch(`${base}/api/form-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(settingsData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update form settings (${res.status})`);
    }
    const updated = await res.json();
    localStorage.setItem(FORM_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  // ==========================================
  // Dynamic Form Fields & Form Builder
  // ==========================================
  async function getFormFields() {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/form-fields`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const fields = await res.json();
        localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(fields));
        return fields;
      }
    } catch {}
    try {
      const cached = localStorage.getItem(FORMS_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_FORM_FIELDS;
  }

  async function getAllFormFields(adminKey) {
    const base = getApiBase();
    const token = adminKey || getSavedAdminPassword();
    try {
      const res = await fetch(`${base}/api/form-fields/all`, {
        headers: { "x-session-token": token, "x-admin-key": token },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) return await res.json();
    } catch {}
    return getFormFields();
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
  async function submitApplication(formData) {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: AbortSignal.timeout(4500)
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
        applicant_name: formData.full_name || "Applicant",
        applicant_email: formData.email || "",
        applicant_phone: formData.phone || "",
        role_interest: formData.role_interest || "General",
        data: formData,
        status: "New",
        created_at: new Date().toISOString()
      };
      subs.unshift(submission);
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(subs));
      return { success: true, reference_id: `IF-OFFLINE-${fallbackId}`, confirmation_message: DEFAULT_FORM_SETTINGS.confirmation_message, submission };
    }
  }

  async function getSubmissions(filters = {}, adminKey) {
    const base = getApiBase();
    const params = new URLSearchParams();
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);

    try {
      const res = await fetch(`${base}/api/submissions?${params.toString()}`, {
        headers: { "x-admin-key": adminKey || getSavedAdminPassword() },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return await res.json();
    } catch {}

    // Fallback to local storage
    try {
      let list = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
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

    const headers = ["ID", "Date", "Name", "Email", "Phone", "Role / Interest", "Status", "Full Details"];
    const rows = submissions.map((s) => [
      s.id,
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
  // Audit Logs & Access Datasheet
  // ==========================================
  async function getAuditLogs(filters = {}) {
    const base = getApiBase();
    const params = new URLSearchParams();
    if (filters.username && filters.username !== "All") params.set("username", filters.username);
    if (filters.status && filters.status !== "All") params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);

    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/audit-logs?${params.toString()}`, {
      headers: { "x-session-token": token, "x-admin-key": token },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) throw new Error(`Failed to load audit logs (${res.status})`);
    return res.json();
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
  async function getCrewUsers() {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/users`, {
      headers: { "x-session-token": token, "x-admin-key": token },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) throw new Error(`Failed to fetch crew users (${res.status})`);
    return res.json();
  }

  async function createCrewUser(userData) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": token,
        "x-admin-key": token,
      },
      body: JSON.stringify(userData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create crew login");
    return data;
  }

  async function deleteCrewUser(id) {
    const base = getApiBase();
    const token = getSavedAdminPassword();
    const res = await fetch(`${base}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { "x-session-token": token, "x-admin-key": token },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to delete crew account");
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
    getCrewUsers,
    createCrewUser,
    deleteCrewUser,
    // Constants
    socialLinks: SOCIAL_LINKS,
    featuredReels: FEATURED_REELS,
  };
})();

