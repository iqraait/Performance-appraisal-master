@echo off
title Employee Performance Appraisal System Launcher
echo ===================================================
echo   Employee Performance Appraisal System Launcher
echo ===================================================
echo.
echo [1/2] Starting Django Backend Server on port 8000...
start "Backend Server (Django)" cmd /k "cd /d "C:\Users\his\Desktop\Employee Performance Appraisal System\Employee Performance Appraisal System" && .venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000"

echo [2/2] Starting Vite Frontend Server on port 5173...
start "Frontend Server (Vite)" cmd /k "cd /d "C:\Users\his\Desktop\Employee Performance Appraisal System\Employee Performance Appraisal System\frontend" && cmd.exe /c npm run dev"

echo.
echo ===================================================
echo Servers are running!
echo Access Frontend at: http://172.16.21.161:5173
echo Access Backend at:  http://172.16.21.161:8000
echo ===================================================
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://172.16.21.161:5173
