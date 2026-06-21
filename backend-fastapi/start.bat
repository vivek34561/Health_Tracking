@echo off
echo.
echo  ==========================================
echo   HealthAI - FastAPI AI Service
echo   Running on http://localhost:8000
echo  ==========================================
echo.
cd /d "%~dp0"
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
