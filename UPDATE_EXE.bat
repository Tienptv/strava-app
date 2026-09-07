@echo off
chcp 65001 >nul
title Updating Source Code to EXE...
cd /d "%~dp0"

echo ===================================================
echo     BUILDING LATEST CODE FOR EXE FILE
echo ===================================================
echo.
echo Building Frontend interface. Please wait a moment...
call npm run build
echo.
echo ===================================================
echo     BUILD COMPLETED! 
echo ===================================================
echo.
echo You can now launch START_APP.bat (or Strava_Tracker.exe) 
echo to use the latest version.
echo.
pause
