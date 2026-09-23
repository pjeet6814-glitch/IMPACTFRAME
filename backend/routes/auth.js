const express = require("express");
const crypto = require("node:crypto");
const { db, hashPassword, verifyPassword } = require("../db/init");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// ==========================================
// 1. Crew & Admin Authentication Endpoints
// ==========================================

// POST /api/admin/login — Authenticate crew member (ADMIN_MAIN or ADMIN_[NAME])
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Username and password are required." });
  }

  const normalizedUser = username.trim().toUpperCase();

  // Find user in database
  let user = db.prepare("SELECT * FROM admin_users WHERE username = ? AND is_active = 1").get(normalizedUser);

  // Fallback for default ADMIN_MAIN if not yet in database
  if (!user && normalizedUser === "ADMIN_MAIN") {
    const masterKey = process.env.ADMIN_KEY || "impactframe2026";
    if (password === masterKey) {
      const { hash, salt } = hashPassword(masterKey);
      db.prepare(`
        INSERT INTO admin_users (username, password_hash, salt, role, full_name, created_by)
        VALUES ('ADMIN_MAIN', ?, ?, 'MAIN', 'System Master Administrator', 'SYSTEM')
      `).run(hash, salt);
      user = db.prepare("SELECT * FROM admin_users WHERE username = 'ADMIN_MAIN'").get();
    }
  }

  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid username or account not found." });
  }

  // Verify password hash
  let isPasswordValid = false;
  if (user.password_hash && user.salt) {
    isPasswordValid = verifyPassword(password, user.password_hash, user.salt);
  }

  // Backup check against env master key for ADMIN_MAIN
  if (!isPasswordValid && normalizedUser === "ADMIN_MAIN" && password === (process.env.ADMIN_KEY || "impactframe2026")) {
    isPasswordValid = true;
  }

  if (!isPasswordValid) {
    return res.status(401).json({ ok: false, error: "Incorrect password. Access denied." });
  }

  // Generate session credentials
  const sessionId = "IF-SES-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  const token = crypto.randomBytes(32).toString("hex");
  const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] || "").slice(0, 150);

  // Record login event in admin_audit_logs
  db.prepare(`
    INSERT INTO admin_audit_logs (session_id, token, username, role, login_time, ip_address, user_agent, status)
    VALUES (?, ?, ?, ?, datetime('now'), ?, ?, 'ACTIVE')
  `).run(sessionId, token, user.username, user.role, ipAddress, userAgent);

  return res.json({
    ok: true,
    message: `Welcome back, ${user.username}`,
    token,
    session_id: sessionId,
    username: user.username,
    role: user.role,
    full_name: user.full_name || user.username,
  });
});

// POST /api/admin/logout — Terminate active session and record duration
// Supports JSON bodies and navigator.sendBeacon text payloads
router.post("/logout", (req, res) => {
  let sessionId = null;
  let token = null;

  if (typeof req.body === "string" && req.body.trim()) {
    try {
      const parsed = JSON.parse(req.body);
      sessionId = parsed.session_id || parsed.sessionId;
      token = parsed.token;
    } catch {
      sessionId = req.body.trim();
    }
  } else if (req.body && typeof req.body === "object") {
    sessionId = req.body.session_id || req.body.sessionId;
    token = req.body.token;
  }

  if (!sessionId) {
    sessionId = req.header("x-session-id") || req.query.session_id;
  }
  if (!token) {
    token = req.header("x-session-token");
  }

  if (sessionId || token) {
    db.prepare(`
      UPDATE admin_audit_logs
      SET logout_time = datetime('now'),
          duration_seconds = MAX(1, CAST((strftime('%s', 'now') - strftime('%s', login_time)) AS INTEGER)),
          status = 'LOGGED_OUT'
      WHERE (session_id = ? OR token = ?) AND status = 'ACTIVE'
    `).run(sessionId || null, token || null);
  }

  return res.json({ ok: true, message: "Session closed and audit record finalized." });
});

// Legacy backward-compatibility endpoint for verify
router.post("/verify", (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_KEY || "impactframe2026";
  if (password && password === expected) {
    return res.json({ ok: true, message: "Authorized" });
  }
  return res.status(401).json({ ok: false, error: "Incorrect admin password." });
});

// ==========================================
// 2. Audit & Access Logs Datasheet
// ==========================================

// GET /api/admin/audit-logs — Fetch all access records for the audit datasheet
router.get("/audit-logs", adminAuth, (req, res) => {
  const { username, status, q } = req.query;

  let query = `
    SELECT id, session_id, username, role, login_time, logout_time,
           duration_seconds, ip_address, status,
           CASE 
             WHEN status = 'ACTIVE' THEN CAST((strftime('%s', 'now') - strftime('%s', login_time)) AS INTEGER)
             ELSE duration_seconds
           END AS computed_duration
    FROM admin_audit_logs
    WHERE 1=1
  `;
  const params = [];

  if (username && username !== "All") {
    query += " AND username = ?";
    params.push(username);
  }

  if (status && status !== "All") {
    query += " AND status = ?";
    params.push(status);
  }

  if (q && q.trim()) {
    query += " AND (username LIKE ? OR session_id LIKE ?)";
    const term = `%${q.trim()}%`;
    params.push(term, term);
  }

  query += " ORDER BY id DESC LIMIT 200";

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// ==========================================
// 3. Sub-Crew Logins Management (ADMIN_MAIN Only)
// ==========================================

// GET /api/admin/users — List all admin and crew accounts
router.get("/users", adminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, full_name, created_by, created_at, is_active
    FROM admin_users
    ORDER BY role DESC, id ASC
  `).all();

  res.json(users);
});

// POST /api/admin/users — Create new sub crew login (ADMIN_[NAME])
router.post("/users", adminAuth, (req, res) => {
  // Only ADMIN_MAIN can provision new logins
  if (req.adminUser && req.adminUser.role !== "MAIN") {
    return res.status(403).json({ error: "Access denied. Only ADMIN_MAIN can provision new crew logins." });
  }

  const rawName = (req.body && (req.body.name || req.body.full_name)) ? String(req.body.name || req.body.full_name).trim() : "";
  const password = (req.body && req.body.password) ? String(req.body.password) : "";

  if (!rawName) {
    return res.status(400).json({ error: "Crew member name is required." });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters." });
  }

  // Clean and enforce prefix ADMIN_<NAME>
  const cleanName = rawName.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const username = cleanName.startsWith("ADMIN_") ? cleanName : `ADMIN_${cleanName}`;

  if (username === "ADMIN_MAIN") {
    return res.status(400).json({ error: "Cannot create duplicate ADMIN_MAIN account." });
  }

  // Check if username already exists
  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(username);
  if (existing) {
    return res.status(400).json({ error: `User login "${username}" already exists. Please choose another name.` });
  }

  const { hash, salt } = hashPassword(password);
  const createdBy = req.adminUser ? req.adminUser.username : "ADMIN_MAIN";

  const result = db.prepare(`
    INSERT INTO admin_users (username, password_hash, salt, role, full_name, created_by)
    VALUES (?, ?, ?, 'CREW', ?, ?)
  `).run(username, hash, salt, rawName, createdBy);

  const newUser = db.prepare(`
    SELECT id, username, role, full_name, created_by, created_at, is_active
    FROM admin_users WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    ok: true,
    message: `Crew login ${username} created successfully!`,
    user: newUser,
  });
});

// DELETE /api/admin/users/:id — Remove a sub crew login
router.delete("/users/:id", adminAuth, (req, res) => {
  if (req.adminUser && req.adminUser.role !== "MAIN") {
    return res.status(403).json({ error: "Only ADMIN_MAIN can remove crew accounts." });
  }

  const targetUser = db.prepare("SELECT * FROM admin_users WHERE id = ?").get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found." });
  }

  if (targetUser.username === "ADMIN_MAIN" || targetUser.role === "MAIN") {
    return res.status(400).json({ error: "The primary ADMIN_MAIN master account cannot be deleted." });
  }

  db.prepare("DELETE FROM admin_users WHERE id = ?").run(req.params.id);
  res.json({ ok: true, message: `Account ${targetUser.username} removed.` });
});

module.exports = router;
