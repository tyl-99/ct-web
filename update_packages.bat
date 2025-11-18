@echo off
echo Updating packages to fix security vulnerabilities...
echo.

REM Change to project root directory
cd /d "%~dp0"

echo Step 1: Removing node_modules and package-lock.json...
if exist frontend\node_modules rmdir /s /q frontend\node_modules
if exist frontend\package-lock.json del frontend\package-lock.json

echo.
echo Step 2: Installing updated packages...
cd frontend
npm install
cd ..

echo.
echo Step 3: Running security audit...
npm audit

echo.
echo Package update completed!
pause
