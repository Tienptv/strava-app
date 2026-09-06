@echo off
chcp 65001 >nul
title Strava Tracker - Quy Trinh Phat Hanh Ban Moi Cho Sub-Admin
color 0A
cd /d "%~dp0"

echo ================================================================
echo    [1-CLICK] STRAVA TRACKER - DONG GOI PHAT HANH BAN MOI
echo ================================================================
node tools\bump_version.cjs
if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Da dung qua trinh phat hanh.
    exit /b 0
)

echo.
echo Dang tu dong build ma nguon va tao cac goi cap nhat...
echo.

call npm run release-update
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Dong goi that bai. Vui long kiem tra loi o tren.
    pause
    exit /b %errorlevel%
)

:MENU
echo.
echo ================================================================
echo    [HOAN TAT] DA DONG GOI PHAT HANH BAN CAP NHAT MOI!
echo ================================================================
echo.
echo Vui long chon buoc tiep theo:
echo.
echo   [1] DAY LEN RENDER CLOUD (Tu dong chay: git add, commit, push)
echo       - Phia Sub-Admin chi can mo App va bam "Update Now" o Sidebar.
echo.
echo   [2] GUI FILE QUA MESSAGE / ZALO / EMAIL...
echo       - Mo thu muc chua file Zip, thong bao hoan tat va dong cua so.
echo.
echo   [0] Thoat
echo.
choice /c 120 /n /m "-> Nhap lua chon cua ban (bam phim 1 hoac 2, hoac 0 de thoat): "

if errorlevel 3 goto :DO_EXIT
if errorlevel 2 goto :DO_SEND_FILE
if errorlevel 1 goto :DO_GIT_PUSH

:DO_GIT_PUSH
echo.
echo ================================================================
echo    [GIT PUSH] DANG TU DONG DAY MA NGUON LEN RENDER CLOUD...
echo ================================================================
echo.
git add .

set "VER_TAG=new version"
for /f "delims=" %%v in ('node -p "require('./version.json').version" 2^>nul') do set "VER_TAG=v%%v"

echo  - Dang commit: "release: %VER_TAG%"...
git commit -m "release: %VER_TAG%" >nul 2>&1
echo  - Dang gui ma nguon len GitHub (git push)...
git push

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo    [THANH CONG] DA DAY MA NGUON LEN RENDER CLOUD!
    echo ================================================================
    echo  - Render Cloud dang tu dong build va trien khai ban moi (~1-2 phut).
    echo  - Phia Sub-Admin chi can mo App -> bam "Check Update" -> "Update Now".
    echo ================================================================
) else (
    echo.
    echo [!] Co loi xay ra khi git push, vui long kiem tra lai mang hoac tai khoan git.
)
echo.
pause
exit /b 0

:DO_SEND_FILE
set "VER_TAG=new version"
for /f "delims=" %%v in ('node -p "require('./version.json').version" 2^>nul') do set "VER_TAG=v%%v"
set "ZIP_NAME=Strava_App_Update_%VER_TAG%.zip"
if not exist "%~dp0desktop_release\%ZIP_NAME%" (
    for /f "delims=" %%f in ('dir /b /o-d "%~dp0desktop_release\Strava_App_Update_*.zip" 2^>nul') do (
        set "ZIP_NAME=%%f"
    )
)

echo.
echo ================================================================
echo    [HOAN TAT] DANG MO THU MUC VA GUI THONG BAO...
echo ================================================================
echo  - File cap nhat: desktop_release\%ZIP_NAME%
echo ================================================================

:: 1. Mo File Explorer va highlight truc tiep file Zip
explorer /select,"%~dp0desktop_release\%ZIP_NAME%"

:: 2. Bat Popup Windows thong bao hoan thanh phat hanh ban update moi
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show([string]::Concat('DA DONG GOI HOAN TAT BAN CAP NHAT MOI!', [Environment]::NewLine, [Environment]::NewLine, 'File cap nhat: desktop_release\%ZIP_NAME%', [Environment]::NewLine, [Environment]::NewLine, 'Thu muc da duoc mo san. Ban chi can keo tha gui file nay qua Zalo / Messenger / Email cho Sub-Admin.'), 'Strava Tracker - Phat Hanh Ban Moi', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)"

:: 3. Dong cua so bat theo dung yeu cau cua ban
exit /b 0

:DO_EXIT
exit /b 0
