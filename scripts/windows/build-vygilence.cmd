@echo off
cd /d C:\Vigilen
if not exist logs mkdir logs

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
echo Building Vygilence for Production... >> C:\Vigilen\logs\vygilence-build.log
echo Time: %DATE% %TIME% >> C:\Vigilen\logs\vygilence-build.log
call %NPM_CMD% run build >> C:\Vigilen\logs\vygilence-build.log 2>&1

if %ERRORLEVEL% neq 0 (
    echo Build failed, exit code %ERRORLEVEL% >> C:\Vigilen\logs\vygilence-build.log
    exit /b %ERRORLEVEL%
)
