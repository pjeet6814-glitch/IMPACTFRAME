// IMPACTFRAME Universal Main Script
// Handles active nav, mobile navigation drawer, hero animations,
// and high-impact featured works rendering with theater modal support.

document.addEventListener("DOMContentLoaded", async () => {
  const here = document.body.dataset.page;

  // 1. Mark active navigation item
  document.querySelectorAll("nav.primary-nav a").forEach((link) => {
    if (link.dataset.page === here) link.setAttribute("aria-current", "page");
  });

  // 2. Mobile Menu Toggle
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const primaryNav = document.querySelector("nav.primary-nav");
  if (mobileToggle && primaryNav) {
    mobileToggle.addEventListener("click", () => {
      const isOpen = primaryNav.classList.toggle("is-open");
      mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!primaryNav.contains(e.target) && !mobileToggle.contains(e.target)) {
        primaryNav.classList.remove("is-open");
        mobileToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // 3. Clean up admin session when on public pages
  if (here !== "admin") {
    if (window.impactframeApi && typeof window.impactframeApi.isCrewAuthenticated === "function") {
      if (window.impactframeApi.isCrewAuthenticated()) {
        window.impactframeApi.logoutAdminBeacon();
      }
      window.impactframeApi.clearAdminAuth();
    }
    try {
      sessionStorage.removeItem("impactframe_crew_auth");
    } catch {}
  }

  // 4. Hero entrance animation
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroContent = document.querySelector(".hero-content");
  if (heroContent && !prefersReducedMotion) {
    heroContent.style.opacity = "0";
    heroContent.style.transform = "translateY(16px)";
    requestAnimationFrame(() => {
      heroContent.style.transition = "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
      heroContent.style.opacity = "1";
      heroContent.style.transform = "translateY(0)";
    });
  }

  // 5. Featured Films Rendering on Home Page
  const featuredGrid = document.getElementById("featured-film-grid");
  if (featuredGrid && window.impactframeApi) {
    try {
      const films = await window.impactframeApi.getFilms("All");
      const top3 = films.slice(0, 3);
      if (top3.length === 0) {
        featuredGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius);">
            <p style="color: var(--text-primary); font-size: 1.1rem; margin: 0 0 6px;">New films currently in post-production.</p>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">Check back soon for the next premiere or explore upcoming festival screenings.</p>
          </div>
        `;
      } else {
        featuredGrid.innerHTML = top3
          .map((film) => renderFeaturedFilmCard(film))
          .join("");

        // Wire Theater Mode Triggers
        featuredGrid.querySelectorAll(".open-theater-btn, .film-thumb-wrap").forEach((el) => {
          el.addEventListener("click", (e) => {
            const filmId = el.dataset.id || el.closest("[data-id]")?.dataset.id;
            const targetFilm = top3.find((f) => String(f.id) === String(filmId));
            if (targetFilm) openTheaterModal(targetFilm);
          });
        });
      }
    } catch (e) {
      console.warn("Could not load featured films:", e);
      featuredGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 36px 20px; background: var(--bg-card); border-radius: var(--radius);">
          <p style="color: var(--text-secondary); margin: 0;">Featured archive currently offline. <a href="gallery.html" style="color: var(--emerald-mint); text-decoration: underline;">Browse complete catalog &rarr;</a></p>
        </div>
      `;
    }
  }

  function renderFeaturedFilmCard(film) {
    const thumb = film.thumbnail_url || "assets/hero-cinema-bg.jpg";
    return `
      <article class="film-card" data-id="${film.id}">
        <div class="film-thumb-wrap" data-id="${film.id}">
          <img class="film-thumb-img" src="${escapeHtml(thumb)}" alt="${escapeHtml(film.title)}" loading="lazy" />
          <div class="film-resolution-tag">4K RAW</div>
          <div class="film-category-chip">${escapeHtml(film.category)}</div>
          <div class="film-play-overlay">
            <div class="film-play-btn" title="Watch in Theater Mode">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="film-body">
          <h3>${escapeHtml(film.title)}</h3>
          <div class="meta">${escapeHtml(film.category)} • ${film.duration_minutes} MIN • ${film.release_year}</div>
          <p class="synopsis">${escapeHtml(film.synopsis)}</p>
          <div class="film-card-footer">
            <button type="button" class="btn btn-ghost btn-sm open-theater-btn" data-id="${film.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Film
            </button>
            <a href="gallery.html" class="btn btn-sm" style="color: var(--text-muted); font-size: 0.8rem; padding: 8px 12px;">
              Details &rarr;
            </a>
          </div>
        </div>
      </article>
    `;
  }

  // 6. Theater Lightbox Modal Handlers (Universal)
  const theaterModal = document.getElementById("theater-modal");
  const theaterCloseBtn = document.getElementById("theater-close-btn");
  const theaterIframe = document.getElementById("theater-iframe");
  const theaterTitle = document.getElementById("theater-title");
  const theaterMeta = document.getElementById("theater-meta");
  const theaterSynopsis = document.getElementById("theater-synopsis");

  function openTheaterModal(film) {
    if (!theaterModal || !theaterIframe) return;
    if (theaterTitle) theaterTitle.textContent = film.title;
    if (theaterMeta) theaterMeta.textContent = `${film.category} • ${film.duration_minutes} Minutes • Released ${film.release_year} • 4K UHD`;
    if (theaterSynopsis) theaterSynopsis.textContent = film.synopsis;
    
    // Auto-play embed if YouTube
    let url = film.video_url;
    if (url.includes("youtube.com/embed/") && !url.includes("autoplay=1")) {
      url += (url.includes("?") ? "&" : "?") + "autoplay=1";
    }
    theaterIframe.src = url;
    theaterModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeTheaterModal() {
    if (!theaterModal) return;
    theaterModal.style.display = "none";
    if (theaterIframe) theaterIframe.src = "";
    document.body.style.overflow = "";
  }

  if (theaterCloseBtn) {
    theaterCloseBtn.addEventListener("click", closeTheaterModal);
  }
  if (theaterModal) {
    theaterModal.addEventListener("click", (e) => {
      if (e.target === theaterModal) closeTheaterModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && theaterModal.style.display === "flex") {
        closeTheaterModal();
      }
    });
  }

  // Expose for external calls
  window.openImpactFrameTheater = openTheaterModal;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
});
