@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "NODETERM_SILENT=0"
if /I "%~1"=="/s" set "NODETERM_SILENT=1"
if /I "%~1"=="--silent" set "NODETERM_SILENT=1"
if /I "%SILENT%"=="1" set "NODETERM_SILENT=1"
echo === nodeterm Windows installer build ===
if "%NODETERM_SILENT%"=="1" (
  call "%ROOT%\download-dependencies.bat" /s
) else (
  call "%ROOT%\download-dependencies.bat"
)
if errorlevel 1 exit /b %ERRORLEVEL%
if exist "%ROOT%\dist" rd /s /q "%ROOT%\dist" >nul 2>nul
pushd "%ROOT%"
call npm run dist:win
set "DIST_EXIT=%ERRORLEVEL%"
popd
if not "%DIST_EXIT%"=="0" (
  echo [FAILED] npm run dist:win exited with code %DIST_EXIT%.
  exit /b %DIST_EXIT%
)
set "SQUIRREL=%ROOT%\dist\squirrel-windows"
set "SETUP="
set "NUPKG="
for %%F in ("%SQUIRREL%\*-Setup.exe") do if exist "%%~fF" set "SETUP=%%~fF"
if not defined SETUP (
  echo [FAILED] Squirrel.Windows Setup.exe was not produced.
  exit /b 1
)
if not exist "%SQUIRREL%\RELEASES" (
  echo [FAILED] Squirrel.Windows RELEASES was not produced.
  exit /b 1
)
for %%F in ("%SQUIRREL%\*-full.nupkg") do if exist "%%~fF" set "NUPKG=%%~fF"
if not defined NUPKG (
  echo [FAILED] Squirrel.Windows full nupkg was not produced.
  exit /b 1
)
findstr /I /C:"-full.nupkg" "%SQUIRREL%\RELEASES" >nul
if errorlevel 1 (
  echo [FAILED] Squirrel.Windows RELEASES does not reference the full nupkg.
  exit /b 1
)
echo [DONE] Unsigned installer: "%SETUP%"
echo [INFO] RELEASES: "%SQUIRREL%\RELEASES"
echo [INFO] Full package: "%NUPKG%"
echo [NOTE] This installer is unsigned and may show an unknown-publisher warning.
if "%NODETERM_SILENT%"=="1" exit /b 0
exit /b 0
