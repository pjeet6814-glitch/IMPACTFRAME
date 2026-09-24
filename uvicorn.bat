@echo off
title IMPACTFRAME Backend Server
cd /d "%~dp0"
echo ===================================================
echo   [IMPACTFRAME Backend] Note: Project runs on Node.js / Express
echo   Starting server with auto-reload on http://localhost:4000...
echo ===================================================
node --watch backend/server.js
