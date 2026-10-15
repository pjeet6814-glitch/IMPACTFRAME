// IMPACTFRAME Film Archive & Cinema Player Gallery
const CATEGORIES = ["All", "Short Film", "AI Film", "Documentary"];

const grid = document.getElementById("film-grid");
const filterBar = document.getElementById("filters");
const searchInput = document.getElementById("film-search");

// Theater Modal Elements
const theaterModal = document.getElementById("theater-modal");
const theaterCloseBtn = document.getElementById("theater-close-btn");
const theaterIframe = document.getElementById("theater-iframe");
const theaterTitle = document.getElementById("theater-title");
const theaterMeta = document.getElementById("theater-meta");
const theaterSynopsis = document.getElementById("theater-synopsis");

let currentCategory = "All";
let searchQuery = "";
let cachedFilms = [];

function chipHtml(category, active) {
  return `<button class="chip ${active ? "active" : ""}" data-category="${category}" aria-pressed="${active}">${category}</button>`;
}

function renderFilters(active) {
  if (!filterBar) return;
  filterBar.innerHTML = CATEGORIES.map((c) => chipHtml(c, c === active)).join("");
  filterBar.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentCategory = chip.dataset.category;
      renderFilters(currentCategory);
      renderGrid();
    });
  });
}

function filmCardHtml(film) {
  const thumb = film.thumbnail_url || "assets/hero-cinema-bg.jpg";
  return `
    <article class="film-card" data-id="${film.id}">
      <div class="film-thumb-wrap" data-id="${film.id}">
        <img class="film-thumb-img" src="${escapeHtml(thumb)}" alt="${escapeHtml(film.title)}" loading="lazy" />
        <div class="film-resolution-tag">4K UHD</div>
        <div class="film-category-chip">${escapeHtml(film.category)}</div>
        <div class="film-play-overlay">
          <div class="film-play-btn" title="Watch in Cinema Theater Mode">
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
          <button type="button" class="btn btn-primary btn-sm open-theater-btn" data-id="${film.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play Film
          </button>
          <span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">
            2.39:1 RAW
          </span>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function renderGrid() {
  if (!grid) return;
  let list = cachedFilms;
  if (currentCategory !== "All") {
    list = list.filter((f) => f.category === currentCategory);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (f) =>
        (f.title && f.title.toLowerCase().includes(q)) ||
        (f.synopsis && f.synopsis.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 56px 20px; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius);">
        <p style="color: var(--text-primary); font-size: 1.15rem; font-weight: 600; margin: 0 0 8px;">No films match your search filter.</p>
        <p style="color: var(--text-muted); font-size: 0.92rem; margin: 0 0 20px;">Try switching categories or clearing search keywords.</p>
        <button type="button" class="btn btn-ghost btn-sm" id="reset-filter-btn">Reset All Filters</button>
      </div>
    `;
    const resetBtn = document.getElementById("reset-filter-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        currentCategory = "All";
        searchQuery = "";
        if (searchInput) searchInput.value = "";
        renderFilters("All");
        renderGrid();
      });
    }
    return;
  }

  grid.innerHTML = list.map(filmCardHtml).join("");

  grid.querySelectorAll(".open-theater-btn, .film-thumb-wrap").forEach((el) => {
    el.addEventListener("click", () => {
      const filmId = el.dataset.id || el.closest("[data-id]")?.dataset.id;
      openTheater(filmId);
    });
  });
}

function openTheater(filmId) {
  const film = cachedFilms.find((f) => String(f.id) === String(filmId));
  if (!film || !theaterModal || !theaterIframe) return;

  if (theaterTitle) theaterTitle.textContent = film.title;
  if (theaterMeta) theaterMeta.textContent = `${film.category} • ${film.duration_minutes} Minutes • Released ${film.release_year} • 4K UHD Master`;
  if (theaterSynopsis) theaterSynopsis.textContent = film.synopsis;

  let url = film.video_url;
  if (url.includes("youtube.com/embed/") && !url.includes("autoplay=1")) {
    url += (url.includes("?") ? "&" : "?") + "autoplay=1";
  }
  theaterIframe.src = url;
  theaterModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeTheater() {
  if (!theaterModal) return;
  theaterModal.style.display = "none";
  if (theaterIframe) theaterIframe.src = "";
  document.body.style.overflow = "";
}

if (theaterCloseBtn) {
  theaterCloseBtn.addEventListener("click", closeTheater);
}
if (theaterModal) {
  theaterModal.addEventListener("click", (e) => {
    if (e.target === theaterModal) closeTheater();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && theaterModal.style.display === "flex") {
      closeTheater();
    }
  });
}

async function loadFilms() {
  renderFilters(currentCategory);
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">
        <span class="hud-pill"><span class="rec-dot"></span> LOADING MASTER ARCHIVE…</span>
      </div>
    `;
  }
  try {
    cachedFilms = await window.impactframeApi.getFilms("All");
    renderGrid();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `<p class="state-msg" style="grid-column: 1/-1; text-align: center; color: var(--red-rec);">Couldn't load the gallery. (${err.message})</p>`;
    }
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });
}

loadFilms();
