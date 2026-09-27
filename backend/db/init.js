// Sets up the SQLite database file, creates films, form_fields, and submissions
// tables, and seeds sample data so the site is ready to use immediately.
// Supports native Node.js 22+ built-in node:sqlite as well as better-sqlite3.

const fs = require("node:fs");
const path = require("path");
const crypto = require("node:crypto");

let DatabaseSync;
let isNativeSqlite = false;

try {
  const sqlite = require("node:sqlite");
  DatabaseSync = sqlite.DatabaseSync;
  isNativeSqlite = true;
} catch {
  DatabaseSync = require("better-sqlite3");
}

// Store SQLite database in external data folder outside the Live Server watched folder
// (or in /tmp when running in Vercel serverless environment)
const DATA_DIR = process.env.IMPACTFRAME_DATA_DIR || 
  (process.env.VERCEL ? path.join("/tmp", ".impactframe_data") : path.join(process.env.USERPROFILE || process.env.HOME || __dirname, ".impactframe_data"));
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

const LOCAL_DB_PATH = path.join(__dirname, "impactframe.db");
const TARGET_DB_PATH = path.join(DATA_DIR, "impactframe.db");

// Migrate existing database file to external data directory if needed
if (!fs.existsSync(TARGET_DB_PATH) && fs.existsSync(LOCAL_DB_PATH)) {
  try {
    fs.copyFileSync(LOCAL_DB_PATH, TARGET_DB_PATH);
  } catch (err) {
    console.error("Could not copy local DB to data dir:", err);
  }
}

const DB_PATH = process.env.DB_PATH || (fs.existsSync(DATA_DIR) ? TARGET_DB_PATH : LOCAL_DB_PATH);
const db = new DatabaseSync(DB_PATH);

if (isNativeSqlite) {
  db.exec("PRAGMA journal_mode = WAL;");
} else {
  db.pragma("journal_mode = WAL");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHash, "hex"));
  } catch {
    return false;
  }
}

// 1. Films Table
db.exec(`
  CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Short Film', 'AI Film', 'Documentary')),
    synopsis TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    release_year INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// 2. Dynamic Form Fields Configuration Table (Google Forms Compatible)
db.exec(`
  CREATE TABLE IF NOT EXISTS form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type TEXT NOT NULL DEFAULT 'auditions',
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 1,
    placeholder TEXT DEFAULT '',
    options_json TEXT DEFAULT '[]',
    allow_other INTEGER DEFAULT 0,
    scale_min INTEGER DEFAULT 1,
    scale_max INTEGER DEFAULT 5,
    scale_min_label TEXT DEFAULT '',
    scale_max_label TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    image_url TEXT DEFAULT '',
    UNIQUE(form_type, field_key)
  );
`);

// Auto-migrate from older restrictive schema if present (e.g. global field_key UNIQUE)
try {
  const tableSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='form_fields'").get();
  if (tableSqlRow && tableSqlRow.sql && (tableSqlRow.sql.includes("field_key TEXT UNIQUE") || tableSqlRow.sql.includes("CHECK (type IN"))) {
    db.exec(`
      CREATE TABLE form_fields_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_type TEXT NOT NULL DEFAULT 'auditions',
        field_key TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL,
        required INTEGER NOT NULL DEFAULT 1,
        placeholder TEXT DEFAULT '',
        options_json TEXT DEFAULT '[]',
        allow_other INTEGER DEFAULT 0,
        scale_min INTEGER DEFAULT 1,
        scale_max INTEGER DEFAULT 5,
        scale_min_label TEXT DEFAULT '',
        scale_max_label TEXT DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        image_url TEXT DEFAULT '',
        UNIQUE(form_type, field_key)
      );
      INSERT OR IGNORE INTO form_fields_migrated (
        id, form_type, field_key, label, description, type, required,
        placeholder, options_json, allow_other, scale_min, scale_max,
        scale_min_label, scale_max_label, sort_order, active, image_url
      )
      SELECT
        id,
        COALESCE(form_type, 'auditions'),
        field_key, label,
        COALESCE(description, ''),
        type, required,
        COALESCE(placeholder, ''),
        COALESCE(options_json, '[]'),
        COALESCE(allow_other, 0),
        COALESCE(scale_min, 1),
        COALESCE(scale_max, 5),
        COALESCE(scale_min_label, ''),
        COALESCE(scale_max_label, ''),
        COALESCE(sort_order, 0),
        COALESCE(active, 1),
        COALESCE(image_url, '')
      FROM form_fields;
      DROP TABLE form_fields;
      ALTER TABLE form_fields_migrated RENAME TO form_fields;
    `);
  } else {
    // Add columns if table already exists without them
    const existingCols = db.prepare("PRAGMA table_info(form_fields)").all().map(c => c.name);
    if (!existingCols.includes("description")) db.exec("ALTER TABLE form_fields ADD COLUMN description TEXT DEFAULT ''");
    if (!existingCols.includes("placeholder")) db.exec("ALTER TABLE form_fields ADD COLUMN placeholder TEXT DEFAULT ''");
    if (!existingCols.includes("allow_other")) db.exec("ALTER TABLE form_fields ADD COLUMN allow_other INTEGER DEFAULT 0");
    if (!existingCols.includes("scale_min")) db.exec("ALTER TABLE form_fields ADD COLUMN scale_min INTEGER DEFAULT 1");
    if (!existingCols.includes("scale_max")) db.exec("ALTER TABLE form_fields ADD COLUMN scale_max INTEGER DEFAULT 5");
    if (!existingCols.includes("scale_min_label")) db.exec("ALTER TABLE form_fields ADD COLUMN scale_min_label TEXT DEFAULT ''");
    if (!existingCols.includes("scale_max_label")) db.exec("ALTER TABLE form_fields ADD COLUMN scale_max_label TEXT DEFAULT ''");
    if (!existingCols.includes("form_type")) {
      db.exec("ALTER TABLE form_fields ADD COLUMN form_type TEXT DEFAULT 'auditions';");
      db.exec("UPDATE form_fields SET form_type = 'auditions' WHERE form_type IS NULL OR form_type = '';");
    }
    if (!existingCols.includes("image_url")) db.exec("ALTER TABLE form_fields ADD COLUMN image_url TEXT DEFAULT '';");
  }
} catch (e) {
  console.warn("[DB] form_fields migration check:", e.message);
}

// 2b. Form Header, Behavior & QR Code Settings Table (Google Forms Controls for all forms)
db.exec(`
  CREATE TABLE IF NOT EXISTS form_settings (
    id INTEGER PRIMARY KEY,
    form_type TEXT NOT NULL DEFAULT 'auditions',
    form_title TEXT NOT NULL,
    form_description TEXT NOT NULL,
    is_accepting_responses INTEGER NOT NULL DEFAULT 1,
    closed_message TEXT NOT NULL,
    confirmation_message TEXT NOT NULL,
    header_banner_url TEXT DEFAULT '',
    qr_code_image TEXT DEFAULT '',
    qr_code_title TEXT DEFAULT '',
    qr_code_instruction TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Auto-migrate form_settings if columns are missing
try {
  const formSettingsCols = db.prepare("PRAGMA table_info(form_settings)").all().map(c => c.name);
  if (!formSettingsCols.includes("form_type")) {
    db.exec("ALTER TABLE form_settings ADD COLUMN form_type TEXT DEFAULT 'auditions';");
    db.exec("UPDATE form_settings SET form_type = 'auditions' WHERE id = 1;");
  }
  if (!formSettingsCols.includes("qr_code_image")) db.exec("ALTER TABLE form_settings ADD COLUMN qr_code_image TEXT DEFAULT '';");
  if (!formSettingsCols.includes("qr_code_title")) db.exec("ALTER TABLE form_settings ADD COLUMN qr_code_title TEXT DEFAULT '';");
  if (!formSettingsCols.includes("qr_code_instruction")) db.exec("ALTER TABLE form_settings ADD COLUMN qr_code_instruction TEXT DEFAULT '';");
} catch (e) {
  console.warn("[DB] form_settings migration check:", e.message);
}

// Seed default settings rows for all forms (Auditions, Join Crew, Events)
try {
  const defaultFormConfigs = [
    {
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
    {
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
    {
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
  ];

  const SEED_STATE_PATH = path.join(__dirname, "seed_state.json");
  let seedData = {};
  if (fs.existsSync(SEED_STATE_PATH)) {
    try {
      seedData = JSON.parse(fs.readFileSync(SEED_STATE_PATH, "utf8"));
    } catch {}
  }

  for (const cfg of defaultFormConfigs) {
    const existing = db.prepare("SELECT * FROM form_settings WHERE id = ? OR form_type = ?").get(cfg.id, cfg.form_type);
    let finalCfg = { ...cfg };
    if (seedData && seedData.forms && seedData.forms[cfg.form_type]) {
      finalCfg = { ...finalCfg, ...seedData.forms[cfg.form_type] };
    } else if (cfg.id === 1 && seedData && seedData.form_settings) {
      finalCfg = { ...finalCfg, ...seedData.form_settings };
    }

    if (!existing) {
      db.prepare(`
        INSERT INTO form_settings (id, form_type, form_title, form_description, is_accepting_responses, closed_message, confirmation_message, header_banner_url, qr_code_image, qr_code_title, qr_code_instruction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalCfg.id,
        finalCfg.form_type,
        finalCfg.form_title,
        finalCfg.form_description,
        finalCfg.is_accepting_responses ? 1 : 0,
        finalCfg.closed_message,
        finalCfg.confirmation_message,
        finalCfg.header_banner_url || "",
        finalCfg.qr_code_image || "",
        finalCfg.qr_code_title || "",
        finalCfg.qr_code_instruction || ""
      );
    }
  }
} catch (err) {
  console.warn("Form settings seed notice:", err.message);
}

// 3. Form Submissions / Audition & Crew Datasheet Table
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type TEXT NOT NULL DEFAULT 'auditions',
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    role_interest TEXT NOT NULL,
    data_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Shortlisted', 'Audition Scheduled', 'Accepted', 'Rejected', 'Archived', 'Reviewing')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Auto-migrate submissions if form_type missing
try {
  const subCols = db.prepare("PRAGMA table_info(submissions)").all().map(c => c.name);
  if (!subCols.includes("form_type")) {
    db.exec("ALTER TABLE submissions ADD COLUMN form_type TEXT DEFAULT 'auditions';");
    db.exec("UPDATE submissions SET form_type = 'auditions' WHERE form_type IS NULL OR form_type = '';");
  }
} catch (e) {
  console.warn("[DB] submissions migration check:", e.message);
}

// 3b. Events & Workshops Calendar Table
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'WORKSHOP',
    date_day TEXT NOT NULL,
    date_month TEXT NOT NULL,
    location TEXT NOT NULL,
    time_info TEXT DEFAULT '',
    entry_fee TEXT DEFAULT 'Free Entry',
    description TEXT NOT NULL,
    registration_open INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default events if empty
try {
  const eventsCount = db.prepare("SELECT COUNT(*) as n FROM events").get()?.n || 0;
  if (eventsCount === 0) {
    const insertEvent = db.prepare(`
      INSERT INTO events (title, category, date_day, date_month, location, time_info, entry_fee, description, registration_open, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEvent.run(
      "Annual IMPACTFRAME Showcase & Production Kickoff",
      "CLUB SHOWCASE & ORIENTATION",
      "18",
      "OCTOBER",
      "Central Campus Amphitheater",
      "7:00 PM",
      "Free Entry",
      "Open-air screening of upcoming student productions, introduction to club departments, and interactive Q&A for aspiring student filmmakers, actors, and editors.",
      1,
      1
    );
    insertEvent.run(
      "Field Audio in Extreme Environments: Hydrophones & Foley",
      "HANDS-ON WORKSHOP",
      "04",
      "NOVEMBER",
      "Media Studio Lab B",
      "3:00 PM",
      "Equipment provided",
      "Learn how to capture the sounds people normally ignore: subterranean water flow, wind resonance across solar farms, and wet clay acoustic mapping.",
      1,
      2
    );
    insertEvent.run(
      "Prompt to Picture: Generative AI for Eco-Storytellers",
      "AI LAB COLLOQUIUM",
      "22",
      "NOVEMBER",
      "Auditorium Hall 2",
      "5:00 PM",
      "Open to all branches",
      "How our AI Film department crafts speculative climate futures without relying on plastic clichés. Includes ComfyUI workflow walkthroughs.",
      1,
      3
    );
  }
} catch (e) {
  console.warn("[DB] events seed check:", e.message);
}

// 4. Admin Users Table (Multi-User Hierarchy)
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('MAIN', 'CREW')),
    full_name TEXT,
    created_by TEXT DEFAULT 'SYSTEM',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1
  );
`);

// 5. Admin Audit & Access Logs Datasheet Table
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    token TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    login_time TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    logout_time TEXT,
    duration_seconds INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOGGED_OUT', 'PAGE_EXIT', 'EXPIRED'))
  );
`);

// Migration for existing tables without last_seen
try {
  const auditCols = db.prepare("PRAGMA table_info(admin_audit_logs)").all().map((c) => c.name);
  if (!auditCols.includes("last_seen")) {
    db.exec("ALTER TABLE admin_audit_logs ADD COLUMN last_seen TEXT;");
    db.exec("UPDATE admin_audit_logs SET last_seen = login_time WHERE last_seen IS NULL;");
  }
} catch (e) {
  console.warn("Audit log schema update notice:", e.message);
}

function seed() {
  // Purge any legacy demo films that were seeded previously
  try {
    db.exec("DELETE FROM films WHERE video_url LIKE '%dQw4w9WgXcQ%' OR title IN ('Groundwater', 'Ash & After', 'What the River Remembers');");
  } catch (err) {
    console.warn("Notice cleaning legacy demo films:", err.message);
  }

  // Seed default form questions for all forms if empty
  const insertField = db.prepare(`
    INSERT INTO form_fields (form_type, field_key, label, type, required, options_json, sort_order, active, placeholder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Auditions Form Fields
  const auditionCount = db.prepare("SELECT COUNT(*) AS n FROM form_fields WHERE form_type = 'auditions'").get()?.n || 0;
  if (auditionCount === 0) {
    const defaultAuditionQuestions = [
      { key: "full_name", label: "Full Name", type: "text", required: 1, options: "[]", order: 1, placeholder: "e.g. Maya Rao" },
      { key: "email", label: "Email Address (CHARUSAT / Personal)", type: "email", required: 1, options: "[]", order: 2, placeholder: "student@charusat.ac.in" },
      { key: "phone", label: "WhatsApp / Contact Number", type: "tel", required: 1, options: "[]", order: 3, placeholder: "+91 98765 43210" },
      { key: "department_sem", label: "Department & Current Semester", type: "text", required: 1, options: "[]", order: 4, placeholder: "e.g. Electrical Engg, 4th Sem" },
      {
        key: "role_interest",
        label: "Role of Interest (Acting or Crew)",
        type: "select",
        required: 1,
        options: JSON.stringify([
          "Actor / On-Screen Performer",
          "Voiceover Artist / Narrator",
          "Director & Screenwriter",
          "Cinematographer / Camera Operator",
          "Drone Pilot & Aerial Mapper",
          "Sound Recordist & Foley Designer",
          "Video Editor & Colorist",
          "Generative AI Visual Artist",
          "Field Ecological Researcher / Producer"
        ]),
        order: 5,
        placeholder: ""
      },
      { key: "experience_portfolio", label: "Audition Reel, Instagram, or Portfolio Link", type: "url", required: 0, options: "[]", order: 6, placeholder: "https://..." },
      { key: "applicant_photo", label: "Headshot / Audition Still (Photo Upload)", type: "photo", required: 0, options: "[]", order: 7, placeholder: "Upload headshot or photo..." },
      { key: "motivation", label: "Why do you want to perform or work with IMPACTFRAME?", type: "textarea", required: 1, options: "[]", order: 8, placeholder: "Tell us about your background, passion for cinema, or conservation story..." },
    ];

    db.exec("BEGIN TRANSACTION;");
    try {
      for (const q of defaultAuditionQuestions) {
        insertField.run("auditions", q.key, q.label, q.type, q.required, q.options, q.order, 1, q.placeholder);
      }
      db.exec("COMMIT;");
      console.log(`Seeded ${defaultAuditionQuestions.length} default audition questions.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.warn("Notice seeding audition questions:", err.message);
    }
  }

  // 2. Join Crew Form Fields
  const crewCount = db.prepare("SELECT COUNT(*) AS n FROM form_fields WHERE form_type = 'join_crew'").get()?.n || 0;
  if (crewCount === 0) {
    const defaultCrewQuestions = [
      { key: "full_name", label: "Your Full Name", type: "text", required: 1, options: "[]", order: 1, placeholder: "e.g. Aryan Patel" },
      { key: "email", label: "Email Address", type: "email", required: 1, options: "[]", order: 2, placeholder: "student@charusat.ac.in" },
      { key: "phone", label: "WhatsApp / Contact Number", type: "tel", required: 1, options: "[]", order: 3, placeholder: "+91 98765 43210" },
      { key: "department_sem", label: "Department / Semester", type: "text", required: 1, options: "[]", order: 4, placeholder: "e.g. Mechanical Engg, 3rd Sem" },
      {
        key: "track_interest",
        label: "Which Track are you applying for?",
        type: "select",
        required: 1,
        options: JSON.stringify([
          "TRACK A: Field Cinematography & Drones",
          "TRACK B: Foley & Spatial Audio",
          "TRACK C: AI Generative Visuals",
          "TRACK D: Screenwriting & Investigation",
          "TRACK E: Editing & Color Grading",
          "TRACK F: Story Pitch Contributor"
        ]),
        order: 5,
        placeholder: ""
      },
      { key: "portfolio_social", label: "Instagram / Portfolio Handle (Optional)", type: "text", required: 0, options: "[]", order: 6, placeholder: "@yourhandle or link" },
      { key: "conservation_pitch", label: "What conservation story or image makes you want to pick up a camera?", type: "textarea", required: 1, options: "[]", order: 7, placeholder: "Tell us about a local creek, a wasted resource on campus, or why you want to tell conservation stories..." },
      { key: "applicant_photo", label: "Photo / Resume / Sample Work (Upload Photo)", type: "photo", required: 0, options: "[]", order: 8, placeholder: "Upload image (PNG/JPG)..." }
    ];

    db.exec("BEGIN TRANSACTION;");
    try {
      for (const q of defaultCrewQuestions) {
        insertField.run("join_crew", q.key, q.label, q.type, q.required, q.options, q.order, 1, q.placeholder);
      }
      db.exec("COMMIT;");
      console.log(`Seeded ${defaultCrewQuestions.length} default join crew questions.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.warn("Notice seeding crew questions:", err.message);
    }
  }

  // 3. Events & Workshops Seat Reservation Fields
  const eventFieldCount = db.prepare("SELECT COUNT(*) AS n FROM form_fields WHERE form_type = 'events'").get()?.n || 0;
  if (eventFieldCount === 0) {
    const defaultEventQuestions = [
      { key: "full_name", label: "Your Full Name", type: "text", required: 1, options: "[]", order: 1, placeholder: "e.g. Diya Shah" },
      { key: "email", label: "Email Address", type: "email", required: 1, options: "[]", order: 2, placeholder: "diya@charusat.ac.in" },
      { key: "phone", label: "WhatsApp / Mobile Number", type: "tel", required: 1, options: "[]", order: 3, placeholder: "+91 98765 43210" },
      {
        key: "event_selected",
        label: "Select Event / Workshop to Attend",
        type: "select",
        required: 1,
        options: JSON.stringify([
          "Annual Showcase & Kickoff (Oct 18, Amphitheater)",
          "Field Audio: Hydrophones & Foley (Nov 04, Studio Lab B)",
          "Prompt to Picture: Generative AI (Nov 22, Auditorium 2)"
        ]),
        order: 4,
        placeholder: ""
      },
      {
        key: "seats_count",
        label: "Number of Seats to Reserve",
        type: "select",
        required: 1,
        options: JSON.stringify(["1 Seat (Individual)", "2 Seats (Bring a friend)", "3 Seats (Small group)"]),
        order: 5,
        placeholder: ""
      },
      { key: "college_dept", label: "College / Department / Affiliation", type: "text", required: 1, options: "[]", order: 6, placeholder: "e.g. CSPIT, DEPSTAR, or External Guest" },
      { key: "payment_screenshot", label: "Payment Screenshot / Student ID (Photo Upload)", type: "photo", required: 0, options: "[]", order: 7, placeholder: "Upload QR payment receipt or student pass..." },
      { key: "special_notes", label: "Questions for Filmmakers or Accessibility Requests", type: "textarea", required: 0, options: "[]", order: 8, placeholder: "Any questions or special accommodation requirements..." }
    ];

    db.exec("BEGIN TRANSACTION;");
    try {
      for (const q of defaultEventQuestions) {
        insertField.run("events", q.key, q.label, q.type, q.required, q.options, q.order, 1, q.placeholder);
      }
      db.exec("COMMIT;");
      console.log(`Seeded ${defaultEventQuestions.length} default event registration questions.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.warn("Notice seeding event questions:", err.message);
    }
  }

  // Seed default ADMIN_MAIN user if not exists
  const mainUserRow = db.prepare("SELECT * FROM admin_users WHERE username = 'ADMIN_MAIN'").get();
  if (!mainUserRow) {
    const { hash, salt } = hashPassword("impactframe2026");
    db.prepare(`
      INSERT INTO admin_users (username, password_hash, salt, role, full_name, created_by)
      VALUES (?, ?, ?, 'MAIN', 'System Master Administrator', 'SYSTEM')
    `).run("ADMIN_MAIN", hash, salt);
    console.log("Seeded default ADMIN_MAIN master account successfully.");
  }
}

// Auto-seed on startup
seed();

if (require.main === module && process.argv.includes("--seed")) {
  if (typeof db.close === "function") db.close();
}

module.exports = { db, seed, hashPassword, verifyPassword };
