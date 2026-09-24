require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

require("./db/init"); // ensures the database tables and default accounts exist
const filmsRouter = require("./routes/films");
const formsRouter = require("./routes/forms");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
// Allow text payloads for navigator.sendBeacon during page exit
app.use(express.text({ type: ["text/plain", "application/octet-stream"] }));

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key", "x-session-token", "x-session-id", "Authorization"],
  })
);

// API routes (supports both direct Express server and Vercel serverless rewrites)
app.use(["/api/films", "/films"], filmsRouter);
app.use(["/api/admin", "/admin"], authRouter);
app.use(["/api", "/"], formsRouter);

app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", club: "IMPACTFRAME", time: new Date().toISOString() });
});

// Serve the static frontend directly from Express
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR, { extensions: ["html"] }));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`IMPACTFRAME server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
