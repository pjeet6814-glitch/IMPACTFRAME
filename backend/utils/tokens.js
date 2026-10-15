const crypto = require("node:crypto");

// Cryptographic secret: prioritize environment variables, fallback to stable cluster secret for serverless
const SECRET = (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) || 
               (process.env.ADMIN_KEY && process.env.ADMIN_KEY.trim()) || 
               "impactframe-vault-sign-key-charusat-2026-prod";

function signSessionToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `IF-SIG.${data}.${hmac}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.startsWith("IF-SIG.")) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, data, hmac] = parts;
  try {
    const expectedHmac = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (hmac.length !== expectedHmac.length || !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = { signSessionToken, verifySessionToken };
