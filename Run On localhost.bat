@echo off
title Strava App - Local Development
color 0B

echo ===================================================
echo     KHOI DONG SERVER VA FRONTEND (LOCAL DEV)
echo ===================================================
echo.

echo [1/2] Dang khoi dong Backend Server (Node.js)...
start "Strava Backend Server" cmd /k "node server/index.js"

echo [2/2] Dang khoi dong Frontend Dev Server (Vite)...
start "Strava Frontend Server" cmd /k "cd frontend && npm run dev -- --open"

echo.
echo ===================================================
echo     HOAN TAT!
echo ===================================================
echo - Backend chay tai: http://localhost:3001
echo - Frontend chay tai: http://localhost:5173 (se tu dong mo)
echo.
echo De tat server, hay dong cac cua so Terminal vua mo.
pause
