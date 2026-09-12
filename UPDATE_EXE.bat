@echo off
chcp 65001 >nul
title Updating Source Code to EXE...
cd /d "%~dp0"

echo ===================================================
echo     BUILDING LATEST CODE FOR EXE FILE
echo ===================================================
echo.
echo Building Frontend interface. Please wait a moment...

set /p NEW_VERSION="Nhap so phien ban moi (VD: 1.2.3) hoac an Enter de giu nguyen: "
if not "%NEW_VERSION%"=="" (
    echo Dang cap nhat phien ban tren toan bo he thong thanh %NEW_VERSION%...
    set APP_VERSION=%NEW_VERSION%
    node -e "const fs=require('fs'); fs.writeFileSync('./frontend/src/config/version.js', 'export const APP_VERSION = \'' + process.env.APP_VERSION + '\';\n'); const p1=require('./package.json'); p1.version=process.env.APP_VERSION; fs.writeFileSync('./package.json', JSON.stringify(p1, null, 2)+'\n'); const p2=require('./frontend/package.json'); p2.version=process.env.APP_VERSION; fs.writeFileSync('./frontend/package.json', JSON.stringify(p2, null, 2)+'\n'); const v=require('./version.json'); v.version=process.env.APP_VERSION; fs.writeFileSync('./version.json', JSON.stringify(v, null, 2)+'\n');"
    echo Cap nhat phien ban thanh cong!
    echo.
)

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
