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
echo [ADMIN] Requesting administrator approval before any build or toolchain work begins.
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command "try { $p=Start-Process -FilePath $env:NODETERM_ELEVATE_SCRIPT -Verb RunAs -Wait -PassThru; exit $p.ExitCode } catch { Write-Error 'Administrator approval was declined or unavailable.'; exit 1223 }"
exit /b %ERRORLEVEL%

:elevation_ready
echo === nodeterm one-click Windows build ===
echo Fresh-install path: ZIP, extract, double-click this file. No manual tool installation is required.
if "%NODETERM_SILENT%"=="1" (
  call "%ROOT%\download-dependencies.bat" /s
) else (
  call "%ROOT%\download-dependencies.bat"
)
set "BOOTSTRAP_EXIT=%ERRORLEVEL%"
if not "%BOOTSTRAP_EXIT%"=="0" exit /b %BOOTSTRAP_EXIT%

set "PINNED_NODE=%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64"
if exist "%PINNED_NODE%\node.exe" set "PATH=%PINNED_NODE%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Node.js is not resolvable after the dependency bootstrap.
  exit /b 1
)

set "NODETERM_SAFE_ROOT=%ROOT%"
set "NODETERM_SAFE_TARGET=%ROOT%\out"
if exist "%ROOT%\out" (
  "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$sep=[IO.Path]::DirectorySeparatorChar; $root=[IO.Path]::GetFullPath($env:NODETERM_SAFE_ROOT).TrimEnd($sep)+$sep; $target=[IO.Path]::GetFullPath($env:NODETERM_SAFE_TARGET); if(-not $target.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe output path'}; Remove-Item -LiteralPath $target -Recurse -Force"
  if errorlevel 1 exit /b 1
)
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
echo [DONE] Runnable Windows output is in "%ROOT%\out".
if "%NODETERM_SILENT%"=="1" exit /b 0
choice /C YN /N /M "Run nodeterm now? [Y/N]: "
if errorlevel 2 exit /b 0
pushd "%ROOT%"
call npm start
set "START_EXIT=%ERRORLEVEL%"
popd
exit /b %START_EXIT%
