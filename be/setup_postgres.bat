@echo off
REM PostgreSQL Setup Script for Concert Ticket Booking System
REM This script sets up PostgreSQL environment variables and database

setlocal enabledelayedexpansion

echo.
echo ====================================================================
echo   POSTGRESQL SETUP FOR CONCERT TICKET BOOKING
echo ====================================================================
echo.

REM Step 1: Check PostgreSQL is installed
echo [Step 1] Checking PostgreSQL installation...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [91m✗ PostgreSQL not found![0m
    echo.
    echo Download and install PostgreSQL from:
    echo   https://www.postgresql.org/download/windows/
    echo.
    echo After installation, add PostgreSQL bin folder to PATH:
    echo   C:\Program Files\PostgreSQL\15\bin
    echo.
    pause
    exit /b 1
)
echo [92m✓ PostgreSQL found[0m
echo.

REM Step 2: Set environment variables
echo [Step 2] Setting environment variables...
set POSTGRES_DB=concert_db
set POSTGRES_USER=postgres
set POSTGRES_PASSWORD=1
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432

echo POSTGRES_DB=%POSTGRES_DB%
echo POSTGRES_USER=%POSTGRES_USER%
echo POSTGRES_HOST=%POSTGRES_HOST%
echo POSTGRES_PORT=%POSTGRES_PORT%
echo.

REM Step 3: Test connection
echo [Step 3] Testing PostgreSQL connection...
psql -U %POSTGRES_USER% -h %POSTGRES_HOST% -d postgres -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo [93m⚠ Connection failed![0m
    echo.
    echo Possible solutions:
    echo 1. Make sure PostgreSQL is running (Services or pgAdmin)
    echo 2. Check password is correct (default: postgres or 1)
    echo 3. Try connecting with correct password
    echo.
    set /p pwd="Enter PostgreSQL password (or press Enter for 'postgres'): "
    if "!pwd!"=="" (
        set "POSTGRES_PASSWORD=postgres"
    ) else (
        set "POSTGRES_PASSWORD=!pwd!"
    )
    echo.
    echo Testing connection with new password...
    psql -U %POSTGRES_USER% -h %POSTGRES_HOST% -d postgres -c "SELECT version();" >nul 2>&1
    if errorlevel 1 (
        echo [91m✗ Connection failed again![0m
        echo Please check:
        echo - PostgreSQL is running
        echo - Password is correct
        echo - User exists (default: postgres)
        pause
        exit /b 1
    )
)
echo [92m✓ Connection successful![0m
echo.

REM Step 4: Create database
echo [Step 4] Creating database '%POSTGRES_DB%'...
psql -U %POSTGRES_USER% -h %POSTGRES_HOST% -d postgres -c "CREATE DATABASE %POSTGRES_DB%;" >nul 2>&1
if not errorlevel 1 (
    echo [92m✓ Database created[0m
) else (
    echo [93m⚠ Database might already exist[0m
)
echo.

REM Step 5: Show connection info
echo ====================================================================
echo   CONNECTION READY
echo ====================================================================
echo.
echo Connection settings:
echo   Database: %POSTGRES_DB%
echo   User:     %POSTGRES_USER%
echo   Host:     %POSTGRES_HOST%
echo   Port:     %POSTGRES_PORT%
echo.

REM Step 6: Set environment variables for this session
setx POSTGRES_DB %POSTGRES_DB%
setx POSTGRES_USER %POSTGRES_USER%
setx POSTGRES_PASSWORD %POSTGRES_PASSWORD%
setx POSTGRES_HOST %POSTGRES_HOST%
setx POSTGRES_PORT %POSTGRES_PORT%

echo [92m✓ Environment variables set[0m
echo.
echo Ready to run Django commands!
echo.
pause
