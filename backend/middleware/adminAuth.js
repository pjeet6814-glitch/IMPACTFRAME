const crypto = require("node:crypto");
const { db } = require("../db/init");
const { verifySessionToken } = require("../utils/tokens");

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function adminAuth(req, res, next) {
  let token = req.header("x-session-token") || req.header("x-admin-key");

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  // 1. Check environment ADMIN_KEY or default master secret (constant-time comparison)
  const masterKey = (process.env.ADMIN_KEY && process.env.ADMIN_KEY.trim()) || "impactframe2026";
  if (safeCompare(token, masterKey)) {
    req.adminUser = { username: "ADMIN_MAIN", role: "MAIN", session_id: "MASTER_OVERRIDE" };
    return next();
  }

  // 2. Stateless cryptographically signed session token
  const verified = verifySessionToken(token);
  if (verified) {
    req.adminUser = {
      username: verified.username,
      role: verified.role,
      session_id: verified.session_id,
    };
    return next();
  }

  // 3. Look up active session in admin_audit_logs (database sessions)
  try {
    const session = db
      .prepare(`
        SELECT session_id, username, role, status
        FROM admin_audit_logs
        WHERE (token = ? OR session_id = ?) AND status = 'ACTIVE'
      `)
      .get(token, token);

    if (session) {
      req.adminUser = {
        username: session.username,
        role: session.role,
        session_id: session.session_id,
      };
      return next();
    }
  } catch {}

  return res.status(401).json({ error: "Session expired or invalid. Please re-authenticate." });
}

module.exports = adminAuth;
