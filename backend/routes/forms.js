const express = require("express");
const { db } = require("../db/init");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// ==========================================
// 1. Dynamic Form Fields Management
// ==========================================

// GET /api/form-fields — Public: fetch all active fields for the application form
router.get("/form-fields", (req, res) => {
  const fields = db
    .prepare("SELECT * FROM form_fields WHERE active = 1 ORDER BY sort_order ASC, id ASC")
    .all();

  const parsed = fields.map((f) => ({
    ...f,
    required: Boolean(f.required),
    options: JSON.parse(f.options_json || "[]"),
  }));

  res.json(parsed);
});

// GET /api/form-fields/all — Admin: fetch all fields including inactive
router.get("/form-fields/all", adminAuth, (req, res) => {
  const fields = db.prepare("SELECT * FROM form_fields ORDER BY sort_order ASC, id ASC").all();
  const parsed = fields.map((f) => ({
    ...f,
    required: Boolean(f.required),
    active: Boolean(f.active),
    options: JSON.parse(f.options_json || "[]"),
  }));
  res.json(parsed);
});

// POST /api/form-fields — Admin: Add a new custom field
router.post("/form-fields", adminAuth, (req, res) => {
  const { label, field_key, type = "text", required = 1, options = [], sort_order } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: "Field label is required." });
  }

  const validTypes = ["text", "email", "tel", "select", "textarea", "url", "number", "date"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(", ")}` });
  }

  // Use provided field_key or generate unique field key
  let finalKey = field_key ? String(field_key).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40) : "";
  if (!finalKey) {
    const baseKey = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    finalKey = `${baseKey}_${Date.now()}`;
  }

  const maxOrderRow = db.prepare("SELECT MAX(sort_order) as m FROM form_fields").get();
  const nextOrder = sort_order !== undefined ? Number(sort_order) : ((maxOrderRow ? maxOrderRow.m : 0) || 0) + 1;

  const result = db.prepare(`
    INSERT INTO form_fields (field_key, label, type, required, options_json, sort_order, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    finalKey,
    label.trim(),
    type,
    required ? 1 : 0,
    JSON.stringify(Array.isArray(options) ? options : []),
    nextOrder
  );

  const created = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({
    ...created,
    required: Boolean(created.required),
    options: JSON.parse(created.options_json || "[]"),
  });
});

// PUT /api/form-fields/:id — Admin: Edit/customize a form field
router.put("/form-fields/:id", adminAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Form field not found." });

  const { label, type, required, options, sort_order, active, is_active } = req.body;

  const updatedLabel = label !== undefined ? label.trim() : existing.label;
  const updatedType = type !== undefined ? type : existing.type;
  const updatedRequired = required !== undefined ? (required ? 1 : 0) : existing.required;
  const updatedOptions = options !== undefined ? JSON.stringify(Array.isArray(options) ? options : []) : existing.options_json;
  const updatedOrder = sort_order !== undefined ? Number(sort_order) : existing.sort_order;
  const rawActive = active !== undefined ? active : is_active;
  const updatedActive = rawActive !== undefined ? (rawActive ? 1 : 0) : existing.active;

  db.prepare(`
    UPDATE form_fields
    SET label = ?, type = ?, required = ?, options_json = ?, sort_order = ?, active = ?
    WHERE id = ?
  `).run(updatedLabel, updatedType, updatedRequired, updatedOptions, updatedOrder, updatedActive, req.params.id);

  const updated = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(req.params.id);
  res.json({
    ...updated,
    required: Boolean(updated.required),
    active: Boolean(updated.active),
    options: JSON.parse(updated.options_json || "[]"),
  });
});

// DELETE /api/form-fields/:id — Admin: Remove a question from the form
router.delete("/form-fields/:id", adminAuth, (req, res) => {
  const result = db.prepare("DELETE FROM form_fields WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Form field not found." });
  res.status(204).send();
});

// ==========================================
// 2. Submissions / Datasheet Management
// ==========================================

// POST /api/submissions — Public: Submit an audition / crew application form
router.post("/submissions", (req, res) => {
  const formData = req.body || {};

  // Find candidate identifying fields
  const applicant_name = (formData.full_name || formData.name || formData.applicant_name || "Anonymous Applicant").trim();
  const applicant_email = (formData.email || formData.applicant_email || "").trim();
  const applicant_phone = (formData.phone || formData.whatsapp || formData.applicant_phone || "").trim();
  const role_interest = (formData.role_interest || formData.role || "General Audition / Crew").trim();

  if (!applicant_name || !applicant_email) {
    return res.status(400).json({ error: "Name and Email are required." });
  }

  const result = db.prepare(`
    INSERT INTO submissions (applicant_name, applicant_email, applicant_phone, role_interest, data_json, status)
    VALUES (?, ?, ?, ?, ?, 'New')
  `).run(applicant_name, applicant_email, applicant_phone, role_interest, JSON.stringify(formData));

  const created = db.prepare("SELECT * FROM submissions WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({
    success: true,
    reference_id: `IF-${created.id.toString().padStart(4, "0")}`,
    submission: {
      ...created,
      data: JSON.parse(created.data_json || "{}"),
    },
  });
});

// GET /api/submissions — Admin: Retrieve all submissions for the datasheet table
router.get("/submissions", adminAuth, (req, res) => {
  const { role, status, q } = req.query;

  let query = "SELECT * FROM submissions WHERE 1=1";
  const params = [];

  if (role && role !== "All") {
    query += " AND role_interest LIKE ?";
    params.push(`%${role}%`);
  }

  if (status && status !== "All") {
    query += " AND status = ?";
    params.push(status);
  }

  if (q && q.trim()) {
    query += " AND (applicant_name LIKE ? OR applicant_email LIKE ? OR applicant_phone LIKE ? OR data_json LIKE ?)";
    const wildcard = `%${q.trim()}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  query += " ORDER BY id DESC";

  const rows = db.prepare(query).all(...params);
  const parsed = rows.map((r) => ({
    ...r,
    data: JSON.parse(r.data_json || "{}"),
  }));

  res.json(parsed);
});

// PUT /api/submissions/:id/status — Admin: Update candidate status
router.put("/submissions/:id/status", adminAuth, (req, res) => {
  const { status } = req.body;
  const valid = ["New", "Shortlisted", "Audition Scheduled", "Accepted", "Archived"];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });
  }

  const result = db.prepare("UPDATE submissions SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Submission not found." });

  const updated = db.prepare("SELECT * FROM submissions WHERE id = ?").get(req.params.id);
  res.json({
    ...updated,
    data: JSON.parse(updated.data_json || "{}"),
  });
});

// DELETE /api/submissions/:id — Admin: Remove candidate response
router.delete("/submissions/:id", adminAuth, (req, res) => {
  const result = db.prepare("DELETE FROM submissions WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Submission not found." });
  res.status(204).send();
});

module.exports = router;
