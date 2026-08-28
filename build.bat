@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "NODETERM_SILENT=0"
if /I "%~1"=="/s" set "NODETERM_SILENT=1"
if /I "%~1"=="--silent" set "NODETERM_SILENT=1"
if /I "%SILENT%"=="1" set "NODETERM_SILENT=1"
echo === nodeterm Windows build ===
if "%NODETERM_SILENT%"=="1" (
  call "%ROOT%\download-dependencies.bat" /s
) else (
  call "%ROOT%\download-dependencies.bat"
)
if errorlevel 1 exit /b %ERRORLEVEL%
if exist "%ROOT%\out" rd /s /q "%ROOT%\out" >nul 2>nul
pushd "%ROOT%"
call npm run build
set "BUILD_EXIT=%ERRORLEVEL%"
popd
if not "%BUILD_EXIT%"=="0" (
  echo [FAILED] npm run build exited with code %BUILD_EXIT%.
  exit /b %BUILD_EXIT%
)
for %%F in ("%ROOT%\out\main\index.js" "%ROOT%\out\preload\index.js" "%ROOT%\out\renderer\index.html" "%ROOT%\out\session-host\host.cjs") do if not exist "%%~fF" (
  echo [FAILED] Required build output is missing: %%~fF
  exit /b 1
)
echo [DONE] Built output is in "%ROOT%\out".
if "%NODETERM_SILENT%"=="1" exit /b 0
choice /C YN /N /M "Run nodeterm now? [Y/N]: "
if errorlevel 2 exit /b 0
pushd "%ROOT%"
call npm start
set "START_EXIT=%ERRORLEVEL%"
popd
exit /b %START_EXIT%
