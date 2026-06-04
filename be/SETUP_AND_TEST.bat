@echo off
REM Concert Ticket Booking API - Quick Setup Script for Windows
REM This script automates the setup and testing process

setlocal enabledelayedexpansion

echo.
echo ====================================================================
echo   CONCERT TICKET BOOKING SYSTEM - WINDOWS SETUP SCRIPT
echo ====================================================================
echo.

REM Color codes
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "RESET=[0m"

REM Step 1: Check Python
echo [Step 1] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [91m✗ Python not found! Please install Python first[0m
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set "PYTHON_VERSION=%%i"
echo [92m✓ Python found: %PYTHON_VERSION%[0m
echo.

REM Step 2: Check virtual environment
echo [Step 2] Checking virtual environment...
if exist venv\ (
    echo [92m✓ Virtual environment exists[0m
) else (
    echo [93m⚠ Virtual environment not found. Creating...[0m
    python -m venv venv
    echo [92m✓ Created virtual environment[0m
)
echo.

REM Step 3: Activate virtual environment
echo [Step 3] Activating virtual environment...
call venv\Scripts\activate.bat
echo [92m✓ Virtual environment activated[0m
echo.

REM Step 4: Install dependencies
echo [Step 4] Installing dependencies...
pip install -q -r requirements.txt 2>nul
if errorlevel 1 (
    echo [93m⚠ Installing with full output:[0m
    pip install -r requirements.txt
)
echo [92m✓ Dependencies installed[0m
echo.

REM Step 5: Run migrations
echo [Step 5] Running Django migrations...
python manage.py migrate >nul 2>&1
if errorlevel 1 (
    echo [91m✗ Migrations failed[0m
    python manage.py migrate
    exit /b 1
)
echo [92m✓ Migrations completed[0m
echo.

REM Step 6: Load sample data
echo [Step 6] Loading sample data...
echo Which data loading method do you prefer?
echo [1] Django ORM (safe, validates data) - RECOMMENDED
echo [2] SQL file (faster, needs PostgreSQL)
echo [3] Skip for now
set /p method="Enter choice (1-3): "

if "%method%"=="1" (
    echo Loading via Django ORM...
    python manage.py shell < load_sample_data.py
    if errorlevel 1 (
        echo [91m✗ Data loading failed[0m
        exit /b 1
    )
    echo [92m✓ Sample data loaded successfully[0m
) else if "%method%"=="2" (
    echo [93m⚠ SQL file loading requires PostgreSQL to be configured[0m
    echo psql -U postgres -d concert_db -f sample_data.sql
) else (
    echo [93m⚠ Data loading skipped[0m
)
echo.

REM Step 7: Verify data
echo [Step 7] Verifying database...
python manage.py shell -c "from django.apps import apps; print('\n'.join([f'{m.__name__}: {m.objects.count()}' for app in apps.get_app_configs() for m in app.get_models()]))" >nul 2>&1
if errorlevel 1 (
    echo [91m✗ Verification failed - database might be empty[0m
) else (
    echo [92m✓ Database verified[0m
)
echo.

REM Step 8: Ask to run server
echo [Step 8] Ready to test!
echo.
echo Select an option:
echo [1] Start server and run tests
echo [2] Start server only
echo [3] Run tests only (if server already running)
echo [4] Show API documentation endpoints
echo [5] Exit
set /p action="Enter choice (1-5): "

if "%action%"=="1" (
    echo.
    echo [92m✓ Starting Django server in new window...[0m
    start cmd /k "python manage.py runserver"
    timeout /t 3 /nobreak
    echo.
    echo [92m✓ Running API tests...[0m
    python test_apis.py
    pause
) else if "%action%"=="2" (
    echo.
    echo [92m✓ Starting Django server...[0m
    echo Visit: http://localhost:8000/api/docs/
    echo.
    python manage.py runserver
) else if "%action%"=="3" (
    echo.
    echo [92m✓ Running API tests...[0m
    python test_apis.py
    pause
) else if "%action%"=="4" (
    echo.
    echo ====================================================================
    echo   API DOCUMENTATION ENDPOINTS
    echo ====================================================================
    echo.
    echo Web UI (Interactive):
    echo   http://localhost:8000/api/docs/
    echo.
    echo Direct Endpoints:
    echo   GET  /api/artists/artists/
    echo   GET  /api/venues/venues/
    echo   GET  /api/concerts/concerts/
    echo   GET  /api/concerts/{id}/seatmap/
    echo   POST /api/users/auth/login/
    echo   POST /api/orders/orders/
    echo.
    echo Start server first: python manage.py runserver
    echo.
    pause
) else (
    echo Exiting...
    exit /b 0
)

echo.
echo ====================================================================
echo   Setup complete!
echo ====================================================================
echo.
echo Next steps:
echo   1. Start server:  python manage.py runserver
echo   2. Test APIs:     python test_apis.py
echo   3. View docs:     http://localhost:8000/api/docs/
echo.

endlocal
