@echo off
chcp 65001 >nul
title Strava Tracker Pro - Che Do Kiem Tra Loi (Debug)
cd /d "%~dp0"
echo ======================================================================
echo    KHOI DONG MAY CHU STRAVA TRACKER O CHE DO KIEM TRA LOI (DEBUG)
echo ======================================================================
echo Neu co bat cu loi gi ve file hoac cong ket noi, se hien thi o duoi day:
echo.
bin\node.exe server\index.js
echo.
echo ======================================================================
echo May chu da dung lai.
pause
