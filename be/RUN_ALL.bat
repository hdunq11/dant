@echo off
REM ====================================================================
REM CONCERT TICKET BOOKING - COMPLETE AUTO SETUP & RUN
REM ====================================================================
REM Chạy toàn bộ: setup PostgreSQL -> migrate -> load data -> test
REM ====================================================================

setlocal enabledelayedexpansion

title Concert Booking System - Auto Setup

echo.
echo ====================================================================
echo   CONCERT TICKET BOOKING SYSTEM - AUTO SETUP
echo ====================================================================
echo.

cd /d d:\datn\be

REM ====================================================================
REM STEP 1: CHECK PYTHON
REM ====================================================================
echo [Step 1/8] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do (
    echo [OK] %%i
)
echo.

REM ====================================================================
REM STEP 2: CHECK POSTGRESQL
REM ====================================================================
echo [Step 2/8] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL not found!
    echo Download: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('psql --version') do (
    echo [OK] %%i
)
echo.

REM ====================================================================
REM STEP 3: SET ENVIRONMENT VARIABLES
REM ====================================================================
echo [Step 3/8] Setting PostgreSQL environment variables...
set POSTGRES_DB=concert_db
set POSTGRES_USER=postgres
set POSTGRES_PASSWORD=1
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432

setx POSTGRES_DB concert_db >nul 2>&1
setx POSTGRES_USER postgres >nul 2>&1
setx POSTGRES_PASSWORD 1 >nul 2>&1
setx POSTGRES_HOST localhost >nul 2>&1
setx POSTGRES_PORT 5432 >nul 2>&1

echo [OK] Environment variables set
echo.

REM ====================================================================
REM STEP 4: CREATE DATABASE
REM ====================================================================
echo [Step 4/8] Creating/Verifying PostgreSQL database...
psql -U %POSTGRES_USER% -h %POSTGRES_HOST% -d postgres -c "CREATE DATABASE %POSTGRES_DB%;" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Database might already exist (OK)
) else (
    echo [OK] Database created
)
echo.

REM ====================================================================
REM STEP 5: RUN MIGRATIONS
REM ====================================================================
echo [Step 5/8] Running Django migrations...
python manage.py migrate >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Migration failed!
    echo Running migration with output:
    python manage.py migrate
    pause
    exit /b 1
)
echo [OK] Migrations completed
echo.

REM ====================================================================
REM STEP 6: LOAD SAMPLE DATA
REM ====================================================================
echo [Step 6/8] Loading sample data (2.2 million records)...
echo This may take 2-5 minutes...
echo.

python manage.py shell < load_sample_data.py
if errorlevel 1 (
    echo [WARN] Data loading had issues, but may still be partial
) else (
    echo [OK] Data loaded successfully
)
echo.

REM ====================================================================
REM STEP 7: VERIFY DATA
REM ====================================================================
echo [Step 7/8] Verifying data...
python manage.py shell -c "from django.apps import apps; stats = [(m.__name__, m.objects.count()) for app in apps.get_app_configs() for m in app.get_models()]; [print(f'{name}: {count}') for name, count in sorted(stats) if count > 0]" 2>nul
echo.

REM ====================================================================
REM STEP 8: START SERVER
REM ====================================================================
echo [Step 8/8] Starting Django development server...
echo.
echo ====================================================================
echo   SERVER STARTING
echo ====================================================================
echo.
echo API Endpoints:
echo   - Swagger UI:     http://localhost:8000/api/docs/
echo   - Admin Panel:    http://localhost:8000/admin/
echo   - API Base:       http://localhost:8000/api/
echo.
echo Test Credentials:
echo   Email:    admin@example.com
echo   Password: admin123
echo.
echo To test APIs in another terminal, run:
echo   python test_apis.py
echo.
echo Press Ctrl+C to stop server
echo.
echo ====================================================================
echo.

python manage.py runserver

endlocal
