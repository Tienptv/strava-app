@echo off
chcp 65001 > nul
echo ==========================================
echo    TIẾN TRÌNH SAO LƯU DỰ ÁN STRAVA APP
echo ==========================================
echo.
node backup.cjs
echo.
echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause > nul
