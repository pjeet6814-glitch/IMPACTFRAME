const express = require("express");
const fs = require("node:fs");
const path = require("path");
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
  "file",       // File / Drive link / Image
  "photo",      // Dedicated Photo / Image upload
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
    form_type: f.form_type || "auditions",
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
    image_url: f.image_url || "",
  };
}

// Fallback defaults for each form type
const DEFAULT_FORM_CONFIGS = {
  auditions: {
    id: 1,
    form_type: "auditions",
    form_title: "IMPACTFRAME 2026 Auditions & Roles Application",
    form_description: "Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.",
    is_accepting_responses: 1,
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
    is_accepting_responses: 1,
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
    is_accepting_responses: 1,
    closed_message: "Registrations for upcoming events are currently closed or at full capacity. Check back soon!",
    confirmation_message: "Seat reserved successfully! Your booking confirmation code has been generated. Show this at the entrance.",
    header_banner_url: "",
    qr_code_image: "",
    qr_code_title: "",
    qr_code_instruction: "",
  }
};

// ==========================================
// 1. Form Settings Management (Multi-Form Support)
// ==========================================

// GET /api/form-settings — Public: fetch settings for a specific form (or default to auditions)
router.get("/form-settings", (req, res) => {
  try {
    const formType = (req.query.form_type || req.query.type || "auditions").toLowerCase().trim();
    let settings = db.prepare("SELECT * FROM form_settings WHERE form_type = ?").get(formType);
    if (!settings && formType === "auditions") {
      settings = db.prepare("SELECT * FROM form_settings WHERE id = 1").get();
    }
    if (!settings) {
      settings = DEFAULT_FORM_CONFIGS[formType] || DEFAULT_FORM_CONFIGS.auditions;
    }

    res.json({
      id: settings.id,
      form_type: settings.form_type || formType,
      form_title: settings.form_title,
      form_description: settings.form_description,
      is_accepting_responses: Boolean(settings.is_accepting_responses),
      closed_message: settings.closed_message,
      confirmation_message: settings.confirmation_message,
      header_banner_url: settings.header_banner_url || "",
      qr_code_image: settings.qr_code_image || "",
      qr_code_title: settings.qr_code_title || "",
      qr_code_instruction: settings.qr_code_instruction || "",
      updated_at: settings.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load form settings: " + err.message });
  }
});

// PUT /api/form-settings — Admin: Update form settings (Title, Description, Accepting status, QR Code, Closed msg)
router.put("/form-settings", adminAuth, (req, res) => {
  try {
    const {
      form_type = "auditions",
      form_title,
      form_description,
      is_accepting_responses,
      closed_message,
      confirmation_message,
      header_banner_url,
      qr_code_image,
      qr_code_title,
      qr_code_instruction,
    } = req.body || {};

    const cleanFormType = String(form_type).toLowerCase().trim() || "auditions";
    let existing = db.prepare("SELECT * FROM form_settings WHERE form_type = ?").get(cleanFormType);
    if (!existing && cleanFormType === "auditions") {
      existing = db.prepare("SELECT * FROM form_settings WHERE id = 1").get();
    }

    const fallbackCfg = DEFAULT_FORM_CONFIGS[cleanFormType] || DEFAULT_FORM_CONFIGS.auditions;
    const newTitle = form_title !== undefined ? String(form_title).trim() : (existing?.form_title || fallbackCfg.form_title);
    const newDesc = form_description !== undefined ? String(form_description).trim() : (existing?.form_description || fallbackCfg.form_description);
    const newAccepting = is_accepting_responses !== undefined ? (is_accepting_responses ? 1 : 0) : (existing?.is_accepting_responses ?? 1);
    const newClosedMsg = closed_message !== undefined ? String(closed_message).trim() : (existing?.closed_message || fallbackCfg.closed_message);
    const newConfirmMsg = confirmation_message !== undefined ? String(confirmation_message).trim() : (existing?.confirmation_message || fallbackCfg.confirmation_message);
    const newBanner = header_banner_url !== undefined ? String(header_banner_url).trim() : (existing?.header_banner_url || "");
    const newQrImg = qr_code_image !== undefined ? String(qr_code_image).trim() : (existing?.qr_code_image || "");
    const newQrTitle = qr_code_title !== undefined ? String(qr_code_title).trim() : (existing?.qr_code_title || "");
    const newQrInst = qr_code_instruction !== undefined ? String(qr_code_instruction).trim() : (existing?.qr_code_instruction || "");

    if (existing) {
      db.prepare(`
        UPDATE form_settings
        SET form_title = ?, form_description = ?, is_accepting_responses = ?, closed_message = ?,
            confirmation_message = ?, header_banner_url = ?, qr_code_image = ?, qr_code_title = ?,
            qr_code_instruction = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newTitle, newDesc, newAccepting, newClosedMsg, newConfirmMsg, newBanner, newQrImg, newQrTitle, newQrInst, existing.id);
    } else {
      const idMap = { auditions: 1, join_crew: 2, events: 3 };
      const newId = idMap[cleanFormType] || undefined;
      if (newId) {
        db.prepare(`
          INSERT INTO form_settings (id, form_type, form_title, form_description, is_accepting_responses, closed_message, confirmation_message, header_banner_url, qr_code_image, qr_code_title, qr_code_instruction, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(newId, cleanFormType, newTitle, newDesc, newAccepting, newClosedMsg, newConfirmMsg, newBanner, newQrImg, newQrTitle, newQrInst);
      } else {
        db.prepare(`
          INSERT INTO form_settings (form_type, form_title, form_description, is_accepting_responses, closed_message, confirmation_message, header_banner_url, qr_code_image, qr_code_title, qr_code_instruction, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(cleanFormType, newTitle, newDesc, newAccepting, newClosedMsg, newConfirmMsg, newBanner, newQrImg, newQrTitle, newQrInst);
      }
    }

    const updated = db.prepare("SELECT * FROM form_settings WHERE form_type = ?").get(cleanFormType);

    // Persist to seed_state.json for serverless redeployments
    try {
      const SEED_PATH = path.join(__dirname, "..", "db", "seed_state.json");
      let seedObj = {};
      if (fs.existsSync(SEED_PATH)) {
        seedObj = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
      }
      if (!seedObj.forms) seedObj.forms = {};
      seedObj.forms[cleanFormType] = {
        form_type: cleanFormType,
        form_title: updated.form_title,
        form_description: updated.form_description,
        is_accepting_responses: updated.is_accepting_responses,
        closed_message: updated.closed_message,
        confirmation_message: updated.confirmation_message,
        header_banner_url: updated.header_banner_url || "",
        qr_code_image: updated.qr_code_image || "",
        qr_code_title: updated.qr_code_title || "",
        qr_code_instruction: updated.qr_code_instruction || "",
      };
      if (cleanFormType === "auditions") {
        seedObj.form_settings = { ...seedObj.forms[cleanFormType] };
      }
      fs.writeFileSync(SEED_PATH, JSON.stringify(seedObj, null, 2), "utf8");
    } catch (e) {
      console.warn("Notice updating seed_state.json:", e.message);
    }

    res.json({
      id: updated.id,
      form_type: updated.form_type,
      form_title: updated.form_title,
      form_description: updated.form_description,
      is_accepting_responses: Boolean(updated.is_accepting_responses),
      closed_message: updated.closed_message,
      confirmation_message: updated.confirmation_message,
      header_banner_url: updated.header_banner_url || "",
      qr_code_image: updated.qr_code_image || "",
      qr_code_title: updated.qr_code_title || "",
      qr_code_instruction: updated.qr_code_instruction || "",
      updated_at: updated.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update form settings: " + err.message });
  }
});

// ==========================================
// 2. Dynamic Form Fields Management (Google Forms Questions)
// ==========================================

// GET /api/form-fields — Public: fetch all active fields for specified form_type
router.get("/form-fields", (req, res) => {
  try {
    const formType = (req.query.form_type || req.query.type || "auditions").toLowerCase().trim();
    const fields = db
      .prepare("SELECT * FROM form_fields WHERE active = 1 AND (form_type = ? OR (form_type IS NULL AND ? = 'auditions')) ORDER BY sort_order ASC, id ASC")
      .all(formType, formType);
    res.json(fields.map(parseFormField));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch form fields: " + err.message });
  }
});

// GET /api/form-fields/all — Admin: fetch all fields for specified form_type
router.get("/form-fields/all", adminAuth, (req, res) => {
  try {
    const formType = (req.query.form_type || req.query.type || "auditions").toLowerCase().trim();
    const fields = db
      .prepare("SELECT * FROM form_fields WHERE (form_type = ? OR (form_type IS NULL AND ? = 'auditions')) ORDER BY sort_order ASC, id ASC")
      .all(formType, formType);
    res.json(fields.map(parseFormField));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all form fields: " + err.message });
  }
});

// POST /api/form-fields — Admin: Add a new custom field to a form
router.post("/form-fields", adminAuth, (req, res) => {
  try {
    const {
      form_type = "auditions",
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
      image_url = "",
    } = req.body;

    const cleanFormType = String(form_type).toLowerCase().trim() || "auditions";

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

    // Ensure key uniqueness within the same form_type
    const existingKey = db.prepare("SELECT id FROM form_fields WHERE field_key = ? AND form_type = ?").get(finalKey, cleanFormType);
    if (existingKey) {
      finalKey = `${finalKey}_${Math.floor(Math.random() * 1000)}`;
    }

    const maxOrderRow = db.prepare("SELECT MAX(sort_order) as m FROM form_fields WHERE form_type = ?").get(cleanFormType);
    const nextOrder = sort_order !== undefined ? Number(sort_order) : ((maxOrderRow ? maxOrderRow.m : 0) || 0) + 1;

    const result = db.prepare(`
      INSERT INTO form_fields (
        form_type, field_key, label, description, type, required, placeholder,
        options_json, allow_other, scale_min, scale_max, scale_min_label,
        scale_max_label, sort_order, active, image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      cleanFormType,
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
      nextOrder,
      (image_url || "").trim()
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
      form_type,
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
      image_url,
    } = req.body;

    const updatedFormType = form_type !== undefined ? String(form_type).toLowerCase().trim() : existing.form_type;
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
    const updatedImg = image_url !== undefined ? String(image_url).trim() : (existing.image_url || "");

    db.prepare(`
      UPDATE form_fields
      SET form_type = ?, label = ?, description = ?, type = ?, required = ?, placeholder = ?,
          options_json = ?, allow_other = ?, scale_min = ?, scale_max = ?,
          scale_min_label = ?, scale_max_label = ?, sort_order = ?, active = ?, image_url = ?
      WHERE id = ?
    `).run(
      updatedFormType,
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
      updatedImg,
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

    res.json({ success: true, count: ordered_ids.length });
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
        form_type, field_key, label, description, type, required, placeholder,
        options_json, allow_other, scale_min, scale_max, scale_min_label,
        scale_max_label, sort_order, active, image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      existing.form_type || "auditions",
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
      newSortOrder,
      existing.image_url || ""
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

// POST /api/submissions — Public: Submit an audition / crew application / event reservation form
router.post("/submissions", (req, res) => {
  try {
    const formData = req.body || {};
    const form_type = (formData.form_type || req.query.form_type || "auditions").toLowerCase().trim();

    // Check if form is currently accepting responses
    let settings = db.prepare("SELECT is_accepting_responses, closed_message, confirmation_message FROM form_settings WHERE form_type = ?").get(form_type);
    if (!settings && form_type === "auditions") {
      settings = db.prepare("SELECT is_accepting_responses, closed_message, confirmation_message FROM form_settings WHERE id = 1").get();
    }
    if (settings && settings.is_accepting_responses === 0) {
      return res.status(403).json({
        error: settings.closed_message || "This form is currently closed to new responses.",
        closed: true,
      });
    }

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
      formData.track_interest ||
      formData.event_selected ||
      formData.role ||
      formData.preferred_role ||
      (form_type === "events" ? "Event Attendee" : (form_type === "join_crew" ? "Crew Applicant" : "General Audition / Crew"))
    ).toString().trim();

    if (!applicant_name || !applicant_email) {
      return res.status(400).json({ error: "Name and Email are required to submit." });
    }

    const result = db.prepare(`
      INSERT INTO submissions (form_type, applicant_name, applicant_email, applicant_phone, role_interest, data_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'New')
    `).run(form_type, applicant_name, applicant_email, applicant_phone, role_interest, JSON.stringify(formData));

    const created = db.prepare("SELECT * FROM submissions WHERE id = ?").get(result.lastInsertRowid);
    const prefixMap = {
      join_crew: "IF-CREW",
      events: "IF-EVT",
      auditions: "IF-AUD"
    };
    const prefix = prefixMap[form_type] || "IF-SUB";

    res.status(201).json({
      success: true,
      reference_id: `${prefix}-${created.id.toString().padStart(4, "0")}`,
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
    const { form_type, role, status, q } = req.query;

    let query = "SELECT * FROM submissions WHERE 1=1";
    const params = [];

    if (form_type && form_type !== "All") {
      query += " AND form_type = ?";
      params.push(form_type.toLowerCase().trim());
    }

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
    const valid = ["New", "Reviewing", "Shortlisted", "Accepted", "Rejected", "Archived", "Audition Scheduled"];
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

// ==========================================
// 4. Events & Workshops Calendar Management
// ==========================================

// GET /api/events — Public: Get all upcoming events (ordered with upcoming first)
router.get("/events", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM events ORDER BY is_past ASC, sort_order ASC, id ASC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load events: " + err.message });
  }
});

// POST /api/events — Admin: Create new event
router.post("/events", adminAuth, (req, res) => {
  try {
    const {
      title,
      category = "WORKSHOP",
      date_day = "01",
      date_month = "JANUARY",
      location = "Campus",
      time_info = "",
      entry_fee = "Free Entry",
      description = "",
      registration_open = 1,
      is_past = 0,
      sort_order = 0,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Event title is required." });
    }

    const result = db.prepare(`
      INSERT INTO events (title, category, date_day, date_month, location, time_info, entry_fee, description, registration_open, is_past, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      category.trim(),
      date_day.trim(),
      date_month.trim().toUpperCase(),
      location.trim(),
      time_info.trim(),
      entry_fee.trim(),
      description.trim(),
      registration_open ? 1 : 0,
      is_past ? 1 : 0,
      Number(sort_order) || 0
    );

    const created = db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create event: " + err.message });
  }
});

// PUT /api/events/:id — Admin: Update event details
router.put("/events/:id", adminAuth, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Event not found." });

    const {
      title,
      category,
      date_day,
      date_month,
      location,
      time_info,
      entry_fee,
      description,
      registration_open,
      is_past,
      sort_order,
    } = req.body;

    db.prepare(`
      UPDATE events
      SET title = ?, category = ?, date_day = ?, date_month = ?, location = ?, time_info = ?, entry_fee = ?, description = ?, registration_open = ?, is_past = ?, sort_order = ?
      WHERE id = ?
    `).run(
      title !== undefined ? title.trim() : existing.title,
      category !== undefined ? category.trim() : existing.category,
      date_day !== undefined ? date_day.trim() : existing.date_day,
      date_month !== undefined ? date_month.trim().toUpperCase() : existing.date_month,
      location !== undefined ? location.trim() : existing.location,
      time_info !== undefined ? time_info.trim() : existing.time_info,
      entry_fee !== undefined ? entry_fee.trim() : existing.entry_fee,
      description !== undefined ? description.trim() : existing.description,
      registration_open !== undefined ? (registration_open ? 1 : 0) : existing.registration_open,
      is_past !== undefined ? (is_past ? 1 : 0) : (existing.is_past || 0),
      sort_order !== undefined ? Number(sort_order) : existing.sort_order,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update event: " + err.message });
  }
});

// DELETE /api/events/:id — Admin: Delete event
router.delete("/events/:id", adminAuth, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Event not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event: " + err.message });
  }
});

module.exports = router;
