@echo off
chcp 65001 >nul
title "Strava Tracker - Commit va Push to Main"
color 0B
cd /d "%~dp0"

echo ================================================================
echo    [GIT 1-CLICK] COMMIT TAT CA FILE VA PUSH LEN ORIGIN MAIN
echo ================================================================
echo.

rem 1. Kiem tra Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Khong tim thay lenh Git tren may tinh!
    echo Vui long kiem tra PATH hoac cai dat Git.
    echo.
    pause
    exit /b 1
)

rem 2. Kiem tra nhanh hien tai
set "CURRENT_BRANCH=main"
for /f "tokens=*" %%b in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%b"
echo [*] Nhanh hien tai: %CURRENT_BRANCH%

rem 3. Kiem tra thay doi file
set "HAS_CHANGES="
for /f "tokens=*" %%i in ('git status --porcelain 2^>nul') do set "HAS_CHANGES=1"

if not defined HAS_CHANGES (
    echo.
    echo [*] Khong co file nao thay doi moi.
    
    set "HAS_UNPUSHED="
    for /f "tokens=*" %%u in ('git log origin/main..HEAD --oneline 2^>nul') do set "HAS_UNPUSHED=1"

    if defined HAS_UNPUSHED (
        echo [*] Phat hien co commit chua duoc push len GitHub:
        git log origin/main..HEAD --oneline -n 5
        echo.
        echo Dang tien hanh push cac commit len origin %CURRENT_BRANCH%...
        goto :DO_PUSH
    ) else (
        color 0A
        echo [*] Du an da dong bo hoan toan voi origin/%CURRENT_BRANCH%.
        echo.
        goto :FINISH
    )
)

rem 4. Hien thi danh sach file thay doi
echo.
echo [*] Danh sach cac file co thay doi:
echo ----------------------------------------------------------------
git status -s
echo ----------------------------------------------------------------
echo.

rem 5. Lay commit message
set "COMMIT_MSG=%*"
if "%COMMIT_MSG%"=="" (
    set /p "COMMIT_MSG=-> Nhap noi dung commit (Enter de mac dinh la 'ok'): "
)

if "%COMMIT_MSG%"=="" set "COMMIT_MSG=ok"

echo.
echo [*] Dang them tat ca file: git add -A ...
git add -A

echo [*] Dang commit voi noi dung: "%COMMIT_MSG%" ...
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [CANH BAO] Khong co gi de commit hoac commit that bai.
    pause
    exit /b 0
)

:DO_PUSH
echo.
echo ================================================================
echo    DANG PUSH LEN ORIGIN MAIN (GITHUB)...
echo ================================================================
echo.

if /i not "%CURRENT_BRANCH%"=="main" (
    echo [*] Dang chuyen ve nhanh main...
    git checkout main
)

git push origin main
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ----------------------------------------------------------------
    echo [CANH BAO] Push truc tiep chua thanh cong!
    echo Dang thu lay cap nhat moi: git pull --rebase origin main ...
    echo ----------------------------------------------------------------
    git pull --rebase origin main
    if %errorlevel% neq 0 (
        echo [LOI] Pull rebase that bai do xung dot code.
        goto :FAILED_PUSH
    )
    echo [*] Dang thu push lai sau khi pull...
    git push origin main
    if %errorlevel% neq 0 goto :FAILED_PUSH
)

color 0A
echo.
echo ================================================================
echo    [THANH CONG] DA COMMIT VA PUSH HOAN TAT LEN ORIGIN MAIN!
echo ================================================================
echo.
echo Ma nguon tren GitHub da duoc cap nhat moi nhat.
goto :FINISH

:FAILED_PUSH
color 0C
echo.
echo [THAT BAI] Push khong thanh cong. Vui long kiem tra ket noi mang hoac tai khoan GitHub.
goto :FINISH

:FINISH
echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
