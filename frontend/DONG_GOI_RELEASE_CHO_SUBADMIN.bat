@echo off
chcp 65001 >nul
title "Strava Tracker - Dong Goi Ban Phat Hanh Cho Sub-Admin"
color 0A
cd /d "%~dp0"

echo ================================================================
echo    [1-CLICK] ĐÓNG GÓI BẢN PHÁT HÀNH DESKTOP CHO SUB-ADMIN
echo ================================================================
echo.
echo [*] Đang kiểm tra môi trường Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LỖI] Không tìm thấy lệnh 'node' trên máy tính!
    echo Vui lòng cài đặt Node.js để chạy tiến trình đóng gói.
    pause
    exit /b 1
)

echo [*] Đang tự động biên dịch và đóng gói toàn bộ ứng dụng...
echo     - Biên dịch giao diện React mới nhất (Vite Build)
echo     - Đồng bộ Backend server, Database Storage và Icon
echo     - Tích hợp Node.js Portable (Sub-Admin không cần cài đặt)
echo     - Tạo Launcher Strava_Tracker.exe có khay hệ thống (Tray icon)
echo     - Tự động dọn dẹp cache và nén thành file ZIP tối ưu
echo.
echo ----------------------------------------------------------------

node tools\build_desktop_app.cjs
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [LỖI] Tiến trình đóng gói gặp sự cố. Vui lòng kiểm tra lỗi ở trên.
    pause
    exit /b %errorlevel%
)

rem Lấy phiên bản từ version.json
set "VER_TAG=1.2.1"
for /f "delims=" %%v in ('node -p "require('./version.json').version" 2^>nul') do set "VER_TAG=%%v"

set "ZIP_NAME=Strava_App_SubAdmin_v%VER_TAG%.zip"
if not exist "%~dp0desktop_release\%ZIP_NAME%" (
    set "ZIP_NAME=Strava_Tracker_Portable.zip"
)

set "ZIP_FULL_PATH=%~dp0desktop_release\%ZIP_NAME%"

echo.
echo ================================================================
echo    [HOÀN TẤT] ĐÃ ĐÓNG GÓI THÀNH CÔNG BẢN RELEASE CHO SUB-ADMIN!
echo ================================================================
echo.
echo [*] Thư mục ứng dụng đã sẵn sàng:
echo     -> %~dp0desktop_release\Strava_App_Desktop
echo.
echo [*] File ZIP trọn gói để gửi cho Sub-Admin:
echo     -> %ZIP_FULL_PATH%
echo.
echo [*] Hướng dẫn dành cho Sub-Admin:
echo     1. Giải nén file ZIP ra thư mục bất kỳ trên PC.
echo     2. Bấm vào "Strava_Tracker.exe" (hoặc START_APP.bat) để mở App.
echo     3. Ứng dụng chạy độc lập, KHÔNG cần cài Node.js, KHÔNG cần quyền Admin PC.
echo ================================================================
echo.

rem Mở thư mục desktop_release và tự động chọn file ZIP vừa tạo
if exist "%ZIP_FULL_PATH%" (
    explorer.exe /select,"%ZIP_FULL_PATH%"
) else (
    explorer.exe "%~dp0desktop_release"
)

rem Hiển thị popup thông báo hoàn tất
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show([string]::Concat('ĐÃ ĐÓNG GÓI HOÀN TẤT BẢN RELEASE CHO SUB-ADMIN!', [Environment]::NewLine, [Environment]::NewLine, 'File ZIP: desktop_release\%ZIP_NAME%', [Environment]::NewLine, [Environment]::NewLine, 'Thư mục đã được tự động mở sẵn.', [Environment]::NewLine, 'Bạn chỉ cần gửi file ZIP này qua Zalo / Google Drive / USB cho Sub-Admin.', [Environment]::NewLine, 'Sub-Admin chỉ cần giải nén và bấm Strava_Tracker.exe là dùng được ngay trên PC!'), 'Strava Tracker - Đóng Gói Thành Công', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)"

echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause >nul
