@echo off
title HealthGuard – Phone App Server
echo.
echo  ============================================
echo   HealthGuard PWA Server Starting...
echo  ============================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo  ERROR: Python not found!
        echo  Please install Python from https://python.org
        pause
        exit /b 1
    )
    python3 serve.py
) else (
    python serve.py
)

pause
