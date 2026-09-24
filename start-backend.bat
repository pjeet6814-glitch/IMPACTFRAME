@echo off
title IMPACTFRAME Backend Server
cd /d "%~dp0"
echo ===================================================
echo   Starting IMPACTFRAME Backend on http://localhost:4000
echo   Auto-reload active (watching file changes)
echo ===================================================
node --watch backend/server.js
pause
