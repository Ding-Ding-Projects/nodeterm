@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "NODETERM_SILENT=0"
if /I "%~1"=="/s" set "NODETERM_SILENT=1"
if /I "%~1"=="--silent" set "NODETERM_SILENT=1"
if /I "%SILENT%"=="1" set "NODETERM_SILENT=1"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS%" (
  echo [FAILED] Windows PowerShell 5.1 is unavailable.
  exit /b 1
)
"%PS%" -NoProfile -NonInteractive -Command "$p=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){exit 0}; exit 1" >nul 2>nul
if not errorlevel 1 goto :elevation_ready
if "%NODETERM_SILENT%"=="1" goto :elevation_ready
set "NODETERM_ELEVATE_SCRIPT=%~f0"
echo [ADMIN] Requesting administrator approval before any installer or toolchain work begins.
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command "try { $p=Start-Process -FilePath $env:NODETERM_ELEVATE_SCRIPT -Verb RunAs -Wait -PassThru; exit $p.ExitCode } catch { Write-Error 'Administrator approval was declined or unavailable.'; exit 1223 }"
exit /b %ERRORLEVEL%

:elevation_ready
echo === nodeterm one-click Windows installer build ===
echo Fresh-install path: ZIP, extract, double-click this file. No manual tool installation is required.
if "%NODETERM_SILENT%"=="1" (
  call "%ROOT%\download-dependencies.bat" /s
) else (
  call "%ROOT%\download-dependencies.bat"
)
if errorlevel 1 exit /b %ERRORLEVEL%

set "PINNED_NODE=%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64"
if exist "%PINNED_NODE%\node.exe" set "PATH=%PINNED_NODE%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Node.js is not resolvable after the dependency bootstrap.
  exit /b 1
)

set "NODETERM_SAFE_ROOT=%ROOT%"
set "NODETERM_SAFE_TARGET=%ROOT%\dist"
if exist "%ROOT%\dist" (
  "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$sep=[IO.Path]::DirectorySeparatorChar; $root=[IO.Path]::GetFullPath($env:NODETERM_SAFE_ROOT).TrimEnd($sep)+$sep; $target=[IO.Path]::GetFullPath($env:NODETERM_SAFE_TARGET); if(-not $target.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe output path'}; Remove-Item -LiteralPath $target -Recurse -Force"
  if errorlevel 1 exit /b 1
)
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
for %%F in ("%SQUIRREL%\*-Setup-*.exe") do if exist "%%~fF" set "SETUP=%%~fF"
for %%F in ("%SQUIRREL%\*-full.nupkg") do if exist "%%~fF" set "NUPKG=%%~fF"
if not defined SETUP (
  echo [FAILED] Squirrel.Windows Setup.exe was not produced.
  exit /b 1
)
if not exist "%SQUIRREL%\RELEASES" (
  echo [FAILED] Squirrel.Windows RELEASES was not produced.
  exit /b 1
)
if not defined NUPKG (
  echo [FAILED] Squirrel.Windows full nupkg was not produced.
  exit /b 1
)
findstr /I /C:"-full.nupkg" "%SQUIRREL%\RELEASES" >nul
if errorlevel 1 (
  echo [FAILED] Squirrel.Windows RELEASES does not reference the full nupkg.
  exit /b 1
)

set "NODETERM_SETUP=%SETUP%"
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\verify-unsigned.ps1" -InputPath "%SETUP%" >"%TEMP%\nodeterm-sign-status.txt"
if errorlevel 1 (
  del /f /q "%TEMP%\nodeterm-sign-status.txt" >nul 2>nul
  echo [FAILED] Signing is prohibited, but the generated setup contains an Authenticode certificate or could not be classified.
  exit /b 1
)
set "SIGN_STATUS="
set /p "SIGN_STATUS="<"%TEMP%\nodeterm-sign-status.txt"
del /f /q "%TEMP%\nodeterm-sign-status.txt" >nul 2>nul
if /I not "%SIGN_STATUS%"=="NotSigned" (
  echo [FAILED] Unsigned status verification returned an unexpected result: %SIGN_STATUS%.
  exit /b 1
)
for /f "delims=" %%H in ('%PS% -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\get-sha256.ps1" -InputPath "%SETUP%"') do set "SETUP_SHA=%%H"
for /f "delims=" %%B in ('%PS% -NoProfile -NonInteractive -Command "(Get-Item -LiteralPath $env:NODETERM_SETUP).Length"') do set "SETUP_BYTES=%%B"
if not defined SETUP_SHA (
  echo [FAILED] Could not calculate the setup SHA-256.
  exit /b 1
)

echo [DONE] Unsigned installer: "%SETUP%"
echo [INFO] Setup bytes: %SETUP_BYTES%
echo [INFO] Setup SHA-256: %SETUP_SHA%
echo [INFO] RELEASES: "%SQUIRREL%\RELEASES"
echo [INFO] Full package: "%NUPKG%"
echo [NOTE] This installer is unsigned and may show an unknown-publisher warning.
exit /b 0
