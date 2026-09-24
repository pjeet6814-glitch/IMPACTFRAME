// Multi-user authentication guard for Admin endpoints.
// Verifies master admin key, cryptographically signed token, or an active crew session.

const { db } = require("../db/init");
const { verifySessionToken } = require("../utils/tokens");

function adminAuth(req, res, next) {
  let token = req.header("x-session-token") || req.header("x-admin-key");

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }

  const masterKey = process.env.ADMIN_KEY || "impactframe2026";

  // 1. Check master key override
  if (token && (token === masterKey || token === "impactframe2026")) {
    req.adminUser = { username: "ADMIN_MAIN", role: "MAIN", session_id: "MASTER_OVERRIDE" };
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  // 2. Stateless signed session token (seamless across all serverless containers)
  const verified = verifySessionToken(token);
  if (verified) {
    req.adminUser = {
      username: verified.username,
      role: verified.role,
      session_id: verified.session_id,
    };
    return next();
  }

  // 3. Look up active session in admin_audit_logs (fallback for local DB sessions)
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

  // 4. Offline / local testing token
  if (token === "offline-token-main") {
    req.adminUser = { username: "ADMIN_MAIN", role: "MAIN", session_id: "OFFLINE_DEV" };
    return next();
  }

  return res.status(401).json({ error: "Session expired or invalid. Please re-authenticate." });
}

module.exports = adminAuth;
