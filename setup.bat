@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==========================================
echo   VirtualBrain - First-Time Setup
echo ==========================================
echo.

set SETUP_OK=1
set WARNINGS=0
set PYTHON_CMD=

:: ----------------------------------------
:: 1. Detect Python 3.10+
:: ----------------------------------------
echo [1/6] Checking Python...

:: Try py launcher first (most reliable on Windows)
py -3 --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2 delims= " %%v in ('py -3 --version 2^>^&1') do set PYVER=%%v
    set PYTHON_CMD=py -3
    goto :python_found
)

:: Try python
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
    :: Check it's actually Python 3 (not the MS Store stub)
    echo !PYVER! | findstr /b "3." >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_CMD=python
        goto :python_found
    )
)

:: Try python3
python3 --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2 delims= " %%v in ('python3 --version 2^>^&1') do set PYVER=%%v
    set PYTHON_CMD=python3
    goto :python_found
)

echo   [ERROR] Python 3.10+ not found.
echo.
echo   Install it with:
echo     winget install Python.Python.3.12
echo.
echo   Or download from: https://www.python.org/downloads/
echo   Make sure to check "Add Python to PATH" during installation.
echo.
set SETUP_OK=0
goto :check_node

:python_found
echo   Found Python %PYVER% (%PYTHON_CMD%)

:: ----------------------------------------
:: 2. Detect Node.js 18+
:: ----------------------------------------
:check_node
echo [2/6] Checking Node.js...

node --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js not found.
    echo.
    echo   Install it with:
    echo     winget install OpenJS.NodeJS.LTS
    echo.
    echo   Or download from: https://nodejs.org/
    echo.
    set SETUP_OK=0
    goto :check_ffmpeg
)

for /f "tokens=1 delims=" %%v in ('node --version 2^>^&1') do set NODEVER=%%v
echo   Found Node.js %NODEVER%

npm --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] npm not found. Reinstall Node.js from https://nodejs.org/
    set SETUP_OK=0
    goto :check_ffmpeg
)

:: ----------------------------------------
:: 3. Detect ffmpeg
:: ----------------------------------------
:check_ffmpeg
echo [3/6] Checking ffmpeg...

ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] ffmpeg not found on PATH.
    echo   It's needed for audio processing.
    echo.
    echo   Install it with:
    echo     winget install Gyan.FFmpeg
    echo.
    echo   Or download from: https://www.gyan.dev/ffmpeg/builds/
    echo   Extract and add the bin folder to your PATH.
    echo.
    set WARNINGS=1
) else (
    echo   Found ffmpeg
)

:: ----------------------------------------
:: 4. Detect Ollama (optional)
:: ----------------------------------------
echo [4/6] Checking Ollama...

ollama --version >nul 2>&1
if errorlevel 1 (
    echo   [NOTE] Ollama not found. It's needed for the AI chat feature.
    echo   Transcription will still work without it.
    echo.
    echo   Install it with:
    echo     winget install Ollama.Ollama
    echo.
    echo   Or download from: https://ollama.com/
    echo.
    set WARNINGS=1
    set OLLAMA_FOUND=0
) else (
    echo   Found Ollama
    set OLLAMA_FOUND=1
)

:: ----------------------------------------
:: Stop if critical deps are missing
:: ----------------------------------------
if %SETUP_OK%==0 (
    echo.
    echo ==========================================
    echo   Setup cannot continue.
    echo   Install the missing dependencies above
    echo   and run setup.bat again.
    echo ==========================================
    pause
    exit /b 1
)

:: ----------------------------------------
:: 5. Create Python virtual environment
:: ----------------------------------------
echo [5/6] Setting up Python environment...

if exist "services\python\.venv\Scripts\activate.bat" (
    echo   Virtual environment already exists, skipping.
) else (
    if exist "services\python\.venv" (
        echo   Existing venv appears broken, recreating...
        rmdir /s /q "services\python\.venv"
    )
    echo   Creating virtual environment...
    %PYTHON_CMD% -m venv "services\python\.venv"
    if errorlevel 1 (
        echo   [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo   Installing Python dependencies...
call "services\python\.venv\Scripts\activate.bat"
pip install -r "services\python\requirements.txt"
if errorlevel 1 (
    echo   [ERROR] Failed to install Python dependencies.
    call deactivate
    pause
    exit /b 1
)
call deactivate

:: ----------------------------------------
:: 6. Install npm dependencies
:: ----------------------------------------
echo [6/6] Installing Node.js dependencies...

echo   Installing root dependencies...
call npm install
if errorlevel 1 (
    echo   [ERROR] Failed to install root npm dependencies.
    pause
    exit /b 1
)

echo   Installing Node service dependencies...
cd /d "%~dp0services\node"
call npm install
if errorlevel 1 (
    echo   [ERROR] Failed to install Node service dependencies.
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo   Installing React client dependencies...
cd /d "%~dp0client"
call npm install
if errorlevel 1 (
    echo   [ERROR] Failed to install React client dependencies.
    cd /d "%~dp0"
    pause
    exit /b 1
)

cd /d "%~dp0"

:: ----------------------------------------
:: Pull Ollama model (if available)
:: ----------------------------------------
if %OLLAMA_FOUND%==1 (
    echo.
    echo Pulling Ollama model...

    :: Read model name from .env if it exists, otherwise default to mistral
    set OLLAMA_MODEL=mistral
    if exist ".env" (
        for /f "tokens=1,2 delims==" %%a in (.env) do (
            if "%%a"=="VB_OLLAMA_MODEL" set OLLAMA_MODEL=%%b
        )
    )

    :: Check if Ollama is running
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if errorlevel 1 (
        echo   Starting Ollama service...
        start "" /b ollama serve >nul 2>&1
        timeout /t 5 /nobreak >nul
    )

    echo   Pulling model: !OLLAMA_MODEL!
    ollama pull !OLLAMA_MODEL!
)

:: ----------------------------------------
:: Summary
:: ----------------------------------------
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo   Python venv:  services\python\.venv
echo   Node deps:    installed
if %OLLAMA_FOUND%==1 (
    echo   Ollama:       ready
) else (
    echo   Ollama:       not installed (optional)
)
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo   ffmpeg:       not found (install before using)
) else (
    echo   ffmpeg:       found
)
echo.
if %WARNINGS%==1 (
    echo   Some warnings above - review them when needed.
    echo.
)
echo   Next step: run start.bat
echo ==========================================
echo.
pause
