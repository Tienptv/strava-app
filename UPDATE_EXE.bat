@echo off
chcp 65001 >nul
title Updating Source Code to EXE...
cd /d "%~dp0"

echo ===================================================
echo     BUILDING LATEST CODE FOR EXE FILE
echo ===================================================
echo.
rem Lay phien ban hien tai tu version.json hoac package.json
set "CURRENT_VERSION=1.2.4"
for /f "usebackq delims=" %%v in (`node -e "console.log(JSON.parse(require('fs').readFileSync('version.json')).version)" 2^>nul`) do set "CURRENT_VERSION=%%v"

echo Phien ban hien tai (Current version): v%CURRENT_VERSION%
echo.
set "NEW_VERSION="
set /p NEW_VERSION="Nhap so phien ban moi (VD: 1.2.5) hoac an Enter de giu nguyen [v%CURRENT_VERSION%]: "

if defined NEW_VERSION (
    set "NEW_VERSION=%NEW_VERSION: =%"
)

if not "%NEW_VERSION%"=="" (
    echo.
    echo Dang cap nhat phien ban tren toan bo he thong thanh v%NEW_VERSION%...
    set APP_VERSION=%NEW_VERSION%
    node -e "const fs=require('fs'); const v=process.env.APP_VERSION.trim(); fs.writeFileSync('./frontend/src/config/version.js', 'export const APP_VERSION = \'' + v + '\';\n'); const p1=require('./package.json'); p1.version=v; fs.writeFileSync('./package.json', JSON.stringify(p1, null, 2)+'\n'); const p2=require('./frontend/package.json'); p2.version=v; fs.writeFileSync('./frontend/package.json', JSON.stringify(p2, null, 2)+'\n'); const vJson=require('./version.json'); vJson.version=v; fs.writeFileSync('./version.json', JSON.stringify(vJson, null, 2)+'\n');"
    echo Cap nhat phien ban thanh cong: v%NEW_VERSION%
    echo.
) else (
    echo Giu nguyen phien ban: v%CURRENT_VERSION%
    echo.
)

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
