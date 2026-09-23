const express = require("express");
const { db } = require("../db/init");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

const CATEGORIES = ["Short Film", "AI Film", "Documentary"];

function validateFilm(body, { partial = false } = {}) {
  const errors = [];
  const required = ["title", "category", "synopsis", "duration_minutes", "video_url", "release_year"];

  for (const field of required) {
    if (!partial && (body[field] === undefined || body[field] === "")) {
      errors.push(`"${field}" is required.`);
    }
  }
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    errors.push(`"category" must be one of: ${CATEGORIES.join(", ")}.`);
  }
  if (body.duration_minutes !== undefined && !Number.isInteger(Number(body.duration_minutes))) {
    errors.push(`"duration_minutes" must be a whole number.`);
  }
  if (body.release_year !== undefined && !Number.isInteger(Number(body.release_year))) {
    errors.push(`"release_year" must be a whole number.`);
  }
  return errors;
}

// GET /api/films?category=Short+Film — list films, newest first, optional category filter
router.get("/", (req, res) => {
  const { category } = req.query;

  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Unknown category "${category}".` });
  }

  const rows = category
    ? db.prepare("SELECT * FROM films WHERE category = ? ORDER BY release_year DESC, id DESC").all(category)
    : db.prepare("SELECT * FROM films ORDER BY release_year DESC, id DESC").all();

  res.json(rows);
});

// GET /api/films/:id — a single film
router.get("/:id", (req, res) => {
  const film = db.prepare("SELECT * FROM films WHERE id = ?").get(req.params.id);
  if (!film) return res.status(404).json({ error: "Film not found." });
  res.json(film);
});

// POST /api/films — add a film (admin only)
router.post("/", adminAuth, (req, res) => {
  const errors = validateFilm(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { title, category, synopsis, duration_minutes, video_url, thumbnail_url = "", release_year } = req.body;

  const result = db
    .prepare(
      `INSERT INTO films (title, category, synopsis, duration_minutes, video_url, thumbnail_url, release_year)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title, category, synopsis, duration_minutes, video_url, thumbnail_url, release_year);

  const created = db.prepare("SELECT * FROM films WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/films/:id — update a film (admin only)
router.put("/:id", adminAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM films WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Film not found." });

  const errors = validateFilm(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE films SET title = ?, category = ?, synopsis = ?, duration_minutes = ?,
     video_url = ?, thumbnail_url = ?, release_year = ? WHERE id = ?`
  ).run(
    merged.title,
    merged.category,
    merged.synopsis,
    merged.duration_minutes,
    merged.video_url,
    merged.thumbnail_url,
    merged.release_year,
    req.params.id
  );

  res.json(db.prepare("SELECT * FROM films WHERE id = ?").get(req.params.id));
});

// DELETE /api/films/:id — remove a film (admin only)
router.delete("/:id", adminAuth, (req, res) => {
  const result = db.prepare("DELETE FROM films WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Film not found." });
  res.status(204).send();
});

module.exports = router;
