// Cryptographic stateless token signer and verifier for serverless compatibility
const crypto = require("node:crypto");

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || "impactframe_auth_secret_token_2026";

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
