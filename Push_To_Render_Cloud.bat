@echo off
chcp 65001 >nul
title Đẩy code lên Render Cloud (GitHub)...
cd /d "%~dp0"

echo ===================================================
echo     PUSHING UPDATES TO GITHUB (RENDER CLOUD)
echo ===================================================
echo.

:: Hỏi người dùng nhập nội dung thay đổi
set /p commit_msg="Nhap noi dung thay doi (Commit message) [Mac dinh: Update code]: "
if "%commit_msg%"=="" set commit_msg=Update code

echo.
echo 1/3: Dang them cac file moi (git add)...
git add .

echo 2/3: Dang dong goi thay doi (git commit)...
git commit -m "%commit_msg%"

echo 3/3: Dang day len Cloud (git push)...
git push

echo.
echo ===================================================
echo     HOAN TAT! Render se tu dong cap nhat trong it phut.
echo ===================================================
echo.
pause
