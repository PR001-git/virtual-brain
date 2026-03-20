@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==========================================
echo   VirtualBrain - Starting Services
echo ==========================================
echo.

:: ----------------------------------------
:: Pre-flight checks
:: ----------------------------------------
if not exist "services\python\.venv\Scripts\activate.bat" (
    echo [ERROR] Python venv not found.
    echo Run setup.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [ERROR] Node dependencies not installed.
    echo Run setup.bat first.
    echo.
    pause
    exit /b 1
)

:: ----------------------------------------
:: Start Ollama if installed but not running
:: ----------------------------------------
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    where ollama >nul 2>&1
    if not errorlevel 1 (
        echo Starting Ollama...
        start "" /b ollama serve >nul 2>&1
        timeout /t 3 /nobreak >nul
        echo   Ollama started.
    ) else (
        echo [NOTE] Ollama not found. AI chat features will be unavailable.
    )
) else (
    echo Ollama already running.
)

:: ----------------------------------------
:: Prepend venv to PATH so "python" resolves
:: to the venv interpreter automatically
:: ----------------------------------------
set PATH=%~dp0services\python\.venv\Scripts;%PATH%

:: ----------------------------------------
:: Launch all services
:: ----------------------------------------
echo.
echo Starting VirtualBrain services...
echo   Python backend:  http://localhost:8100
echo   Node bridge:     http://localhost:8200
echo   React frontend:  http://localhost:3000
echo.
echo Press Ctrl+C to stop all services.
echo.

call npm run dev

echo.
echo VirtualBrain stopped.
pause
