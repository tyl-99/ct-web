@echo off
cd /d "%~dp0"
echo Current directory: %CD%
echo Checking npm installation...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not in PATH!
    echo Please ensure Node.js is installed and added to PATH.
    pause
    exit /b 1
)

echo Checking node_modules...
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting Next.js development server...
call npm run dev

