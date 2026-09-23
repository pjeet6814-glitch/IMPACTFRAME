// Marks the current page's nav link, plays entrance for the hero on first load,
// and loads featured films on the home page.

document.addEventListener("DOMContentLoaded", async () => {
  const here = document.body.dataset.page;
  document.querySelectorAll("nav.primary-nav a").forEach((link) => {
    if (link.dataset.page === here) link.setAttribute("aria-current", "page");
  });

  // Whenever a user is on any public page (Home, Gallery, About, Events, etc.),
  // immediately terminate any leftover admin session so returning to admin.html strictly requires password.
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

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".hero");
  if (hero && !prefersReducedMotion) {
    hero.style.opacity = "0";
    hero.style.transform = "translateY(10px)";
    requestAnimationFrame(() => {
      hero.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      hero.style.opacity = "1";
      hero.style.transform = "translateY(0)";
    });
  }

  // Populate Featured Films on Home page if element exists
  const featuredGrid = document.getElementById("featured-film-grid");
  if (featuredGrid && window.impactframeApi) {
    try {
      const films = await window.impactframeApi.getFilms("All");
      const top3 = films.slice(0, 3);
      if (top3.length === 0) {
        featuredGrid.innerHTML = `<p class="state-msg">No films available yet.</p>`;
      } else {
        featuredGrid.innerHTML = top3
          .map(
            (film) => `
          <article class="film-card sprocket-frame">
            <div class="video-slot">
              <iframe src="${film.video_url}" title="${escapeHtml(film.title)}" loading="lazy" allowfullscreen></iframe>
            </div>
            <h3>${escapeHtml(film.title)}</h3>
            <div class="meta">${film.category} · ${film.duration_minutes} min · ${film.release_year}</div>
            <p class="synopsis">${escapeHtml(film.synopsis)}</p>
          </article>
        `
          )
          .join("");
      }
    } catch (e) {
      console.warn("Could not load featured films:", e);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
});
