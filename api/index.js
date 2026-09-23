// Vercel Serverless Function entry point
// Routes all /api/* requests to the Express backend application
const app = require("../backend/server.js");

module.exports = app;
