@echo off
echo ==========================================
echo Starting Strava Tracker App...
echo ==========================================
echo.

:: Start the backend server
start "Strava Backend" cmd /c "npm run server"

:: Start the frontend server (Vite)
start "Strava Frontend" cmd /c "npm run dev"

:: Wait for a few seconds to let the servers start
echo Waiting for servers to initialize...
timeout /t 6 /nobreak > nul

:: Open Google Chrome directly to the app URL
start chrome http://localhost:5173

echo.
echo App is running! You can close this terminal window.
