@echo off
cd /d C:\Users\USER\Downloads\TIMESHEET-GOOGLE1-main\TIMESHEET-GOOGLE1-main

REM start backend server.js
start "backend" cmd /k node server.js

REM start frontend (React/Vite)
cd /d C:\Users\USER\Downloads\TIMESHEET-GOOGLE1-main\TIMESHEET-GOOGLE1-main
start "frontend" cmd /k npm start

REM optional: open browser directly to app
timeout /t 10 >nul
start "" "https://10.53.14.50:3000"
