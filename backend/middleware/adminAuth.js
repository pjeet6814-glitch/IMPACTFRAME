// Multi-user authentication guard for Admin endpoints.
// Verifies either master admin key or an active crew session token.

const { db } = require("../db/init");

function adminAuth(req, res, next) {
  let token = req.header("x-session-token") || req.header("x-admin-key");

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }

  const masterKey = process.env.ADMIN_KEY || "impactframe2026";

  // Check master key override
  if (token && token === masterKey) {
    req.adminUser = { username: "ADMIN_MAIN", role: "MAIN", session_id: "MASTER_OVERRIDE" };
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  // Look up active session in admin_audit_logs
  const session = db
    .prepare(`
      SELECT session_id, username, role, status
      FROM admin_audit_logs
      WHERE (token = ? OR session_id = ?) AND status = 'ACTIVE'
    `)
    .get(token, token);

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid. Please re-authenticate." });
  }

  req.adminUser = {
    username: session.username,
    role: session.role,
    session_id: session.session_id,
  };

  next();
}

module.exports = adminAuth;
