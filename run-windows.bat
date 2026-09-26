@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
set "ITSM_EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %ITSM_EXIT_CODE%
