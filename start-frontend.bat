@echo off
cd /d "%~dp0frontend"
if not exist "node_modules" "C:\Program Files\nodejs\npm.cmd" install
"C:\Program Files\nodejs\npm.cmd" run dev
pause
