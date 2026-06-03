@echo off
echo Starting AI Attendance Assistant Pro...
    
echo Starting Backend API...
start cmd /k "cd /d "%~dp0" && .\venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001"
    
echo Starting Frontend Server...
start cmd /k "cd /d "%~dp0frontend" && npm run dev"
    
echo Both servers are starting up!
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:8001
