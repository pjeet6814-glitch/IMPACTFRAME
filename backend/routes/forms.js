const express = require("express");
const { db } = require("../db/init");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

const VALID_QUESTION_TYPES = [
  "text",       // Short answer
  "textarea",   // Paragraph
  "radio",      // Multiple choice (single select)
  "checkbox",   // Checkboxes (multi select)
  "select",     // Dropdown
  "scale",      // Linear scale / Rating (1-5, 1-10)
  "date",       // Date picker
  "time",       // Time picker
  "number",     // Number
  "email",      // Email address
  "tel",        // Phone / WhatsApp
  "url",        // Website / Portfolio link
  "file",       // File / Drive link
  "section",    // Section header & divider
];

// Helper to parse a form_field row
function parseFormField(f) {
  let options = [];
  try {
    options = JSON.parse(f.options_json || "[]");
  } catch {
    options = [];
  }
  return {
    id: f.id,
    field_key: f.field_key,
    label: f.label,
    description: f.description || "",
    type: f.type || "text",
    required: Boolean(f.required),
    placeholder: f.placeholder || "",
    options: Array.isArray(options) ? options : [],
    allow_other: Boolean(f.allow_other),
    scale_min: Number(f.scale_min ?? 1),
    scale_max: Number(f.scale_max ?? 5),
    scale_min_label: f.scale_min_label || "",
    scale_max_label: f.scale_max_label || "",
    sort_order: Number(f.sort_order || 0),
    active: Boolean(f.active),
    is_active: Boolean(f.active),
  };
}

// ==========================================
// 1. Form Settings Management (Google Forms Header Controls)
// ==========================================

// GET /api/form-settings — Public: fetch form title, description, accepting status, and confirmation text
router.get("/form-settings", (req, res) => {
  try {
    let settings = db.prepare("SELECT * FROM form_settings WHERE id = 1").get();
    if (!settings) {
      settings = {
        id: 1,
        form_title: "IMPACTFRAME 2026 Auditions & Roles Application",
        form_description: "Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.",
        is_accepting_responses: 1,
        closed_message: "This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!",
        confirmation_message: "Thank you! Your response has been recorded. Our production directors will review your application and contact you soon via WhatsApp/Email.",
        header_banner_url: "",
      };
    }
    res.json({
      form_title: settings.form_title,
      form_description: settings.form_description,
      is_accepting_responses: Boolean(settings.is_accepting_responses),
      closed_message: settings.closed_message,
      confirmation_message: settings.confirmation_message,
      header_banner_url: settings.header_banner_url || "",
      updated_at: settings.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load form settings: " + err.message });
  }
});

// PUT /api/form-settings — Admin: Update form settings (Title, Description, Accepting status, Closed msg)
router.put("/form-settings", adminAuth, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM form_settings WHERE id = 1").get();
    const {
      form_title,
      form_description,
      is_accepting_responses,
      closed_message,
      confirmation_message,
      header_banner_url,
    } = req.body;

    const newTitle = form_title !== undefined ? String(form_title).trim() : (existing?.form_title || "IMPACTFRAME Application");
    const newDesc = form_description !== undefined ? String(form_description).trim() : (existing?.form_description || "");
    const newAccepting = is_accepting_responses !== undefined ? (is_accepting_responses ? 1 : 0) : (existing?.is_accepting_responses ?? 1);
    const newClosedMsg = closed_message !== undefined ? String(closed_message).trim() : (existing?.closed_message || "This form is currently closed to new responses.");
    const newConfirmMsg = confirmation_message !== undefined ? String(confirmation_message).trim() : (existing?.confirmation_message || "Thank you! Your response has been recorded.");
    const newBanner = header_banner_url !== undefined ? String(header_banner_url).trim() : (existing?.header_banner_url || "");

    if (existing) {
      db.prepare(`
        UPDATE form_settings
        SET form_title = ?, form_description = ?, is_accepting_responses = ?, closed_message = ?, confirmation_message = ?, header_banner_url = ?, updated_at = datetime('now')
        WHERE id = 1
      `).run(newTitle, newDesc, newAccepting, newClosedMsg, newConfirmMsg, newBanner);
    } else {
      db.prepare(`
        INSERT INTO form_settings (id, form_title, form_description, is_accepting_responses, closed_message, confirmation_message, header_banner_url, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(newTitle, newDesc, newAccepting, newClosedMsg, newConfirmMsg, newBanner);
    }

    const updated = db.prepare("SELECT * FROM form_settings WHERE id = 1").get();
    res.json({
      form_title: updated.form_title,
      form_description: updated.form_description,
      is_accepting_responses: Boolean(updated.is_accepting_responses),
      closed_message: updated.closed_message,
      confirmation_message: updated.confirmation_message,
      header_banner_url: updated.header_banner_url || "",
      updated_at: updated.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update form settings: " + err.message });
  }
});

// ==========================================
// 2. Dynamic Form Fields Management (Google Forms Questions)
// ==========================================

// GET /api/form-fields — Public: fetch all active fields for the application form
router.get("/form-fields", (req, res) => {
  try {
    const fields = db
      .prepare("SELECT * FROM form_fields WHERE active = 1 ORDER BY sort_order ASC, id ASC")
      .all();
    res.json(fields.map(parseFormField));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch form fields: " + err.message });
  }
});

// GET /api/form-fields/all — Admin: fetch all fields including inactive
router.get("/form-fields/all", adminAuth, (req, res) => {
  try {
    const fields = db.prepare("SELECT * FROM form_fields ORDER BY sort_order ASC, id ASC").all();
    res.json(fields.map(parseFormField));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all form fields: " + err.message });
  }
});

// POST /api/form-fields — Admin: Add a new custom field
router.post("/form-fields", adminAuth, (req, res) => {
  try {
    const {
      label,
      field_key,
      description = "",
      type = "text",
      required = 1,
      placeholder = "",
      options = [],
      allow_other = 0,
      scale_min = 1,
      scale_max = 5,
      scale_min_label = "",
      scale_max_label = "",
      sort_order,
    } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ error: "Question title / label is required." });
    }

    if (!VALID_QUESTION_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Question type must be one of: ${VALID_QUESTION_TYPES.join(", ")}`,
      });
    }

    // Auto-generate or sanitize field_key
    let finalKey = field_key ? String(field_key).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40) : "";
    if (!finalKey) {
      const baseKey = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24);
      finalKey = `${baseKey || "q"}_${Date.now().toString(36)}`;
    }

    // Ensure key uniqueness
    const existingKey = db.prepare("SELECT id FROM form_fields WHERE field_key = ?").get(finalKey);
    if (existingKey) {
      finalKey = `${finalKey}_${Math.floor(Math.random() * 1000)}`;
    }

    const maxOrderRow = db.prepare("SELECT MAX(sort_order) as m FROM form_fields").get();
    const nextOrder = sort_order !== undefined ? Number(sort_order) : ((maxOrderRow ? maxOrderRow.m : 0) || 0) + 1;

    const result = db.prepare(`
      INSERT INTO form_fields (
        field_key, label, description, type, required, placeholder,
        options_json, allow_other, scale_min, scale_max, scale_min_label,
        scale_max_label, sort_order, active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      finalKey,
      label.trim(),
      (description || "").trim(),
      type,
      type === "section" ? 0 : (required ? 1 : 0),
      (placeholder || "").trim(),
      JSON.stringify(Array.isArray(options) ? options : []),
      allow_other ? 1 : 0,
      Number(scale_min || 1),
      Number(scale_max || 5),
      (scale_min_label || "").trim(),
      (scale_max_label || "").trim(),
      nextOrder
    );

    const created = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(parseFormField(created));
  } catch (err) {
    res.status(500).json({ error: "Failed to create form question: " + err.message });
  }
});

// PUT /api/form-fields/:id — Admin: Edit/customize a form field
router.put("/form-fields/:id", adminAuth, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Form field not found." });

    const {
      label,
      description,
      type,
      required,
      placeholder,
      options,
      allow_other,
      scale_min,
      scale_max,
      scale_min_label,
      scale_max_label,
      sort_order,
      active,
      is_active,
    } = req.body;

    const updatedLabel = label !== undefined ? label.trim() : existing.label;
    const updatedDesc = description !== undefined ? description.trim() : (existing.description || "");
    const updatedType = type !== undefined ? type : existing.type;
    const updatedRequired = updatedType === "section" ? 0 : (required !== undefined ? (required ? 1 : 0) : existing.required);
    const updatedPlaceholder = placeholder !== undefined ? placeholder.trim() : (existing.placeholder || "");
    const updatedOptions = options !== undefined ? JSON.stringify(Array.isArray(options) ? options : []) : existing.options_json;
    const updatedAllowOther = allow_other !== undefined ? (allow_other ? 1 : 0) : (existing.allow_other || 0);
    const updatedScaleMin = scale_min !== undefined ? Number(scale_min) : (existing.scale_min ?? 1);
    const updatedScaleMax = scale_max !== undefined ? Number(scale_max) : (existing.scale_max ?? 5);
    const updatedScaleMinLabel = scale_min_label !== undefined ? scale_min_label.trim() : (existing.scale_min_label || "");
    const updatedScaleMaxLabel = scale_max_label !== undefined ? scale_max_label.trim() : (existing.scale_max_label || "");
    const updatedOrder = sort_order !== undefined ? Number(sort_order) : existing.sort_order;
    const rawActive = active !== undefined ? active : is_active;
    const updatedActive = rawActive !== undefined ? (rawActive ? 1 : 0) : existing.active;

    db.prepare(`
      UPDATE form_fields
      SET label = ?, description = ?, type = ?, required = ?, placeholder = ?,
          options_json = ?, allow_other = ?, scale_min = ?, scale_max = ?,
          scale_min_label = ?, scale_max_label = ?, sort_order = ?, active = ?
      WHERE id = ?
    `).run(
      updatedLabel,
      updatedDesc,
      updatedType,
      updatedRequired,
      updatedPlaceholder,
      updatedOptions,
      updatedAllowOther,
      updatedScaleMin,
      updatedScaleMax,
      updatedScaleMinLabel,
      updatedScaleMaxLabel,
      updatedOrder,
      updatedActive,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(req.params.id);
    res.json(parseFormField(updated));
  } catch (err) {
    res.status(500).json({ error: "Failed to update form field: " + err.message });
  }
});

// POST /api/form-fields/reorder — Admin: Batch reorder question fields
router.post("/form-fields/reorder", adminAuth, (req, res) => {
  try {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({ error: "ordered_ids must be an array of question IDs." });
    }

    const updateStmt = db.prepare("UPDATE form_fields SET sort_order = ? WHERE id = ?");
    ordered_ids.forEach((id, index) => {
      updateStmt.run((index + 1) * 2, id);
    });

    const fields = db.prepare("SELECT * FROM form_fields ORDER BY sort_order ASC, id ASC").all();
    res.json(fields.map(parseFormField));
  } catch (err) {
    res.status(500).json({ error: "Failed to reorder fields: " + err.message });
  }
});

// POST /api/form-fields/:id/duplicate — Admin: 1-click duplicate a question (Google Forms feature)
router.post("/form-fields/:id/duplicate", adminAuth, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Original question not found." });

    const newKey = `${existing.field_key}_copy_${Date.now().toString(36).slice(-4)}`;
    const newLabel = `${existing.label} (Copy)`;
    const newSortOrder = (existing.sort_order || 0) + 1;

    const result = db.prepare(`
      INSERT INTO form_fields (
        field_key, label, description, type, required, placeholder,
        options_json, allow_other, scale_min, scale_max, scale_min_label,
        scale_max_label, sort_order, active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      newKey,
      newLabel,
      existing.description || "",
      existing.type,
      existing.required,
      existing.placeholder || "",
      existing.options_json || "[]",
      existing.allow_other || 0,
      existing.scale_min ?? 1,
      existing.scale_max ?? 5,
      existing.scale_min_label || "",
      existing.scale_max_label || "",
      newSortOrder
    );

    const duplicated = db.prepare("SELECT * FROM form_fields WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(parseFormField(duplicated));
  } catch (err) {
    res.status(500).json({ error: "Failed to duplicate question: " + err.message });
  }
});

// DELETE /api/form-fields/:id — Admin: Remove a question from the form
router.delete("/form-fields/:id", adminAuth, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM form_fields WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Form field not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete question: " + err.message });
  }
});

// ==========================================
// 3. Submissions / Datasheet Management
// ==========================================

// POST /api/submissions — Public: Submit an audition / application form
router.post("/submissions", (req, res) => {
  try {
    // Check if form is currently accepting responses
    const settings = db.prepare("SELECT is_accepting_responses, closed_message, confirmation_message FROM form_settings WHERE id = 1").get();
    if (settings && settings.is_accepting_responses === 0) {
      return res.status(403).json({
        error: settings.closed_message || "This audition form is currently closed to new responses.",
        closed: true,
      });
    }

    const formData = req.body || {};

    // Find candidate identifying fields
    const applicant_name = (
      formData.full_name ||
      formData.name ||
      formData.applicant_name ||
      formData.your_name ||
      "Anonymous Applicant"
    ).toString().trim();

    const applicant_email = (
      formData.email ||
      formData.applicant_email ||
      formData.email_address ||
      ""
    ).toString().trim();

    const applicant_phone = (
      formData.phone ||
      formData.whatsapp ||
      formData.contact_number ||
      formData.applicant_phone ||
      ""
    ).toString().trim();

    const role_interest = (
      formData.role_interest ||
      formData.role ||
      formData.preferred_role ||
      "General Audition / Crew"
    ).toString().trim();

    if (!applicant_name || !applicant_email) {
      return res.status(400).json({ error: "Name and Email are required to submit." });
    }

    const result = db.prepare(`
      INSERT INTO submissions (applicant_name, applicant_email, applicant_phone, role_interest, data_json, status)
      VALUES (?, ?, ?, ?, ?, 'New')
    `).run(applicant_name, applicant_email, applicant_phone, role_interest, JSON.stringify(formData));

    const created = db.prepare("SELECT * FROM submissions WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({
      success: true,
      reference_id: `IF-${created.id.toString().padStart(4, "0")}`,
      confirmation_message: settings?.confirmation_message || "Thank you! Your response has been recorded.",
      submission: {
        ...created,
        data: JSON.parse(created.data_json || "{}"),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Submission processing failed: " + err.message });
  }
});

// GET /api/submissions — Admin: Retrieve all submissions for the datasheet table
router.get("/submissions", adminAuth, (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to load submissions: " + err.message });
  }
});

// PUT /api/submissions/:id/status — Admin: Update candidate status
router.put("/submissions/:id/status", adminAuth, (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["New", "Reviewing", "Shortlisted", "Accepted", "Rejected", "Archived"];
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
  } catch (err) {
    res.status(500).json({ error: "Failed to update submission status: " + err.message });
  }
});

// DELETE /api/submissions/:id — Admin: Remove candidate response
router.delete("/submissions/:id", adminAuth, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM submissions WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Submission not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete submission: " + err.message });
  }
});

module.exports = router;
