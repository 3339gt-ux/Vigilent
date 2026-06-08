@echo off
cd /d C:\Vigilen
if not exist logs mkdir logs

set PORT=3000

:: Discover npm.cmd in Path, default to npm
set NPM_CMD=npm
where npm.cmd >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('where npm.cmd') do (
        set NPM_CMD="%%i"
        goto :run
    )
)

:run
echo Starting Vygilence Production Server on port %PORT%... >> C:\Vigilen\logs\vygilence-server.log
echo Time: %DATE% %TIME% >> C:\Vigilen\logs\vygilence-server.log
call %NPM_CMD% run start >> C:\Vigilen\logs\vygilence-server.log 2>&1

if %ERRORLEVEL% neq 0 (
    echo Error starting server, exit code %ERRORLEVEL% >> C:\Vigilen\logs\vygilence-server.log
    exit /b %ERRORLEVEL%
)
