@echo off
setlocal

:: Lay ngay gio hien tai thong qua PowerShell (Chuan xac 100% tren moi he dieu hanh Windows)
for /f "usebackq tokens=*" %%I in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH\hmm\mss\s'"`) do set TIMESTAMP=%%I

set "BACKUP_DIR=backup"
set "BACKUP_FILE=%BACKUP_DIR%\Strava_Backup_%TIMESTAMP%.zip"

echo =======================================================
echo          CONG CU SAO LUU TOAN BO DU AN (BACKUP)
echo =======================================================
echo.

if not exist "%BACKUP_DIR%" (
    echo [1/3] Tao thu muc %BACKUP_DIR%...
    mkdir "%BACKUP_DIR%"
) else (
    echo [1/3] Thu muc %BACKUP_DIR% da ton tai.
)

echo [2/3] Dang nen toan bo du an vao file:
echo       %BACKUP_FILE%
echo.
echo       Vui long cho doi... (Co the mat vai phut)
echo.

:: Nen du an bang tar.exe. Loai tru thu muc backup de tranh lap vong.
:: Dong thoi loai tru node_modules va .git de file zip nhe nhat co the.
tar.exe -a -c -f "%BACKUP_FILE%" --exclude="%BACKUP_DIR%" --exclude="node_modules" --exclude=".git" *

echo [3/3] Nen xong! Hoan tat sao luu an toan.
echo.
pause
