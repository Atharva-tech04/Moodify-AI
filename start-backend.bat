@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" py -m venv .venv
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
cd backend
"..\.venv\Scripts\python.exe" app.py
pause
