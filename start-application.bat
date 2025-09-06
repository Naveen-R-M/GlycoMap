@echo off
echo Starting SimBioSys Lab Web Application...

echo Starting backend server...
start cmd /k "cd \"%~dp0backend\" && python web_service.py"

echo Waiting for backend to initialize (5 seconds)...
timeout /t 5 /nobreak > nul

echo Starting frontend development server...
start cmd /k "cd \"%~dp0frontend\" && npm run dev"

echo.
echo =================================================
echo SimBioSys Lab Web Application started!
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo =================================================
echo.
echo Press any key to close this window. The servers will continue running.
pause > nul
