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
    field_key TEXT UNIQUE NOT NULL,
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
    active INTEGER NOT NULL DEFAULT 1
  );
`);

// Auto-migrate from older restrictive check constraint schema if present
try {
  const tableSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='form_fields'").get();
  if (tableSqlRow && tableSqlRow.sql && tableSqlRow.sql.includes("CHECK (type IN")) {
    db.exec(`
      CREATE TABLE form_fields_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_key TEXT UNIQUE NOT NULL,
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
        active INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO form_fields_migrated (id, field_key, label, type, required, options_json, sort_order, active)
      SELECT id, field_key, label, type, required, options_json, sort_order, active FROM form_fields;
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
  }
} catch (e) {
  console.warn("[DB] form_fields migration check:", e.message);
}

// 2b. Form Header & Behavior Settings Table (Google Forms Controls)
db.exec(`
  CREATE TABLE IF NOT EXISTS form_settings (
    id INTEGER PRIMARY KEY,
    form_title TEXT NOT NULL DEFAULT 'IMPACTFRAME 2026 Auditions & Roles Application',
    form_description TEXT NOT NULL DEFAULT 'Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.',
    is_accepting_responses INTEGER NOT NULL DEFAULT 1,
    closed_message TEXT NOT NULL DEFAULT 'This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!',
    confirmation_message TEXT NOT NULL DEFAULT 'Thank you! Your response has been recorded. Our production directors will review your application and contact you soon via WhatsApp/Email.',
    header_banner_url TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default settings row if not exists
try {
  const settingsRow = db.prepare("SELECT id FROM form_settings WHERE id = 1").get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO form_settings (id, form_title, form_description, is_accepting_responses, closed_message, confirmation_message)
      VALUES (1, 'IMPACTFRAME 2026 Auditions & Roles Application', 'Audition for on-screen performance or apply for director, cinematographer, AI artist, sound, and editor positions in upcoming short films.', 1, 'This audition form is currently closed to new responses. Thank you for your interest in IMPACTFRAME!', 'Thank you! Your response has been recorded. Our production directors will review your application and contact you soon via WhatsApp/Email.')
    `).run();
  }
} catch (err) {
  console.warn("Form settings seed notice:", err.message);
}

// 3. Form Submissions / Audition Datasheet Table
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    role_interest TEXT NOT NULL,
    data_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Shortlisted', 'Audition Scheduled', 'Accepted', 'Archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

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
    logout_time TEXT,
    duration_seconds INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOGGED_OUT', 'PAGE_EXIT', 'EXPIRED'))
  );
`);

function seed() {
  // Seed sample films if empty
  const countRow = db.prepare("SELECT COUNT(*) AS n FROM films").get();
  const count = countRow ? countRow.n : 0;
  if (count === 0) {
    const insertFilm = db.prepare(`
      INSERT INTO films (title, category, synopsis, duration_minutes, video_url, thumbnail_url, release_year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const samples = [
      {
        title: "Groundwater",
        category: "Documentary",
        synopsis: "A look at the campus borewell crisis and the students mapping it street by street.",
        duration_minutes: 14,
        video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnail_url: "",
        release_year: 2025,
      },
      {
        title: "Ash & After",
        category: "Short Film",
        synopsis: "A forest fire's aftermath, told through the eyes of a ranger returning home.",
        duration_minutes: 9,
        video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnail_url: "",
        release_year: 2025,
      },
      {
        title: "What the River Remembers",
        category: "AI Film",
        synopsis: "An AI-generated visual poem imagining the river before the dam.",
        duration_minutes: 4,
        video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnail_url: "",
        release_year: 2024,
      },
    ];

    db.exec("BEGIN TRANSACTION;");
    try {
      for (const row of samples) {
        insertFilm.run(row.title, row.category, row.synopsis, row.duration_minutes, row.video_url, row.thumbnail_url, row.release_year);
      }
      db.exec("COMMIT;");
      console.log(`Seeded ${samples.length} sample films successfully.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  }

  // Seed default form questions if empty
  const fieldsCountRow = db.prepare("SELECT COUNT(*) AS n FROM form_fields").get();
  const fieldsCount = fieldsCountRow ? fieldsCountRow.n : 0;
  if (fieldsCount === 0) {
    const insertField = db.prepare(`
      INSERT INTO form_fields (field_key, label, type, required, options_json, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultQuestions = [
      {
        key: "full_name",
        label: "Full Name",
        type: "text",
        required: 1,
        options: "[]",
        order: 1,
      },
      {
        key: "email",
        label: "Email Address (CHARUSAT / Personal)",
        type: "email",
        required: 1,
        options: "[]",
        order: 2,
      },
      {
        key: "phone",
        label: "WhatsApp / Contact Number",
        type: "tel",
        required: 1,
        options: "[]",
        order: 3,
      },
      {
        key: "department_sem",
        label: "Department & Current Semester",
        type: "text",
        required: 1,
        options: "[]",
        order: 4,
      },
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
      },
      {
        key: "experience_portfolio",
        label: "Audition Reel, Instagram, or Portfolio Link",
        type: "url",
        required: 0,
        options: "[]",
        order: 6,
      },
      {
        key: "motivation",
        label: "Why do you want to perform or work with IMPACTFRAME?",
        type: "textarea",
        required: 1,
        options: "[]",
        order: 7,
      },
    ];

    db.exec("BEGIN TRANSACTION;");
    try {
      for (const q of defaultQuestions) {
        insertField.run(q.key, q.label, q.type, q.required, q.options, q.order, 1);
      }
      db.exec("COMMIT;");
      console.log(`Seeded ${defaultQuestions.length} default form questions successfully.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
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
