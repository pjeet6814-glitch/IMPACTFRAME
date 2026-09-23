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
  return `<button class="chip" data-category="${category}" aria-pressed="${active}">${category}</button>`;
}

function renderFilters(active) {
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
  return `
    <article class="film-card sprocket-frame" data-id="${film.id}">
      <div class="video-slot">
        <iframe src="${film.video_url}" title="${escapeHtml(film.title)}" loading="lazy" allowfullscreen></iframe>
      </div>
      <h3>${escapeHtml(film.title)}</h3>
      <div class="meta">${film.category} · ${film.duration_minutes} min · ${film.release_year}</div>
      <p class="synopsis">${escapeHtml(film.synopsis)}</p>
      <div style="margin-top: 14px;">
        <button type="button" class="btn btn-ghost btn-sm open-theater-btn" data-id="${film.id}">
          &#9654; Open in Theater Mode
        </button>
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
    grid.innerHTML = `<p class="state-msg">No films match your search. Try changing the category or clearing the search box.</p>`;
    return;
  }

  grid.innerHTML = list.map(filmCardHtml).join("");

  grid.querySelectorAll(".open-theater-btn").forEach((btn) => {
    btn.addEventListener("click", () => openTheater(btn.dataset.id));
  });
}

function openTheater(filmId) {
  const film = cachedFilms.find((f) => String(f.id) === String(filmId));
  if (!film || !theaterModal) return;

  theaterTitle.textContent = film.title;
  theaterMeta.textContent = `${film.category} • ${film.duration_minutes} Minutes • Released ${film.release_year}`;
  theaterSynopsis.textContent = film.synopsis;
  theaterIframe.src = film.video_url;
  theaterModal.style.display = "flex";
}

function closeTheater() {
  if (!theaterModal) return;
  theaterModal.style.display = "none";
  theaterIframe.src = "";
}

if (theaterCloseBtn) {
  theaterCloseBtn.addEventListener("click", closeTheater);
}
if (theaterModal) {
  theaterModal.addEventListener("click", (e) => {
    if (e.target === theaterModal) closeTheater();
  });
}

async function loadFilms() {
  renderFilters(currentCategory);
  grid.innerHTML = `<p class="state-msg">Loading films…</p>`;
  try {
    cachedFilms = await window.impactframeApi.getFilms("All");
    renderGrid();
  } catch (err) {
    grid.innerHTML = `<p class="state-msg">Couldn't load the gallery. (${err.message})</p>`;
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });
}

loadFilms();
