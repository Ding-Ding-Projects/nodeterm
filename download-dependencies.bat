@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "NODETERM_SILENT=0"
if /I "%~1"=="/s" set "NODETERM_SILENT=1"
if /I "%~1"=="--silent" set "NODETERM_SILENT=1"
if /I "%SILENT%"=="1" set "NODETERM_SILENT=1"

echo === nodeterm dependency bootstrap ===
echo Repository: "%ROOT%"
echo This process obtains the complete build toolchain for a fresh Windows checkout.

set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo [FAILED] Windows PowerShell is unavailable.
  exit /b 1
)

rem The root process stays unelevated. Only the Visual Studio installer may request UAC.
"%PS%" -NoProfile -NonInteractive -Command "$p=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){exit 86}; exit 0" >nul 2>nul
if errorlevel 86 (
  echo [FAILED] Do not run the root bootstrap as Administrator. It elevates only the toolchain installer when needed.
  exit /b 5
)

call :ensure_node
if errorlevel 1 exit /b %ERRORLEVEL%
call :ensure_vs
if errorlevel 1 exit /b %ERRORLEVEL%
call :ensure_python
if errorlevel 1 exit /b %ERRORLEVEL%

pushd "%ROOT%"
call node scripts/check-dependencies-ready.mjs verify >nul 2>nul
if not errorlevel 1 (
  echo [OK] Project packages are already ready for this package-lock.json.
  popd
  echo [DONE] Toolchain and project packages are ready.
  exit /b 0
)
echo --- Installing project packages ---
call npm ci
set "NPM_EXIT=%ERRORLEVEL%"
popd
if not "%NPM_EXIT%"=="0" (
  echo [FAILED] npm ci exited with code %NPM_EXIT%.
  exit /b %NPM_EXIT%
)
call node scripts/check-dependencies-ready.mjs write
if errorlevel 1 (
  echo [FAILED] Could not write the dependency readiness marker.
  exit /b 1
)
echo [DONE] Toolchain and project packages are ready.
exit /b 0

:ensure_node
where node >nul 2>nul
if errorlevel 1 goto :node_install
set "NODE_VERSION="
node -v > "%TEMP%\nodeterm-node-version.txt" 2>nul
set /p "NODE_VERSION="<"%TEMP%\nodeterm-node-version.txt"
set "NODE_VERSION=%NODE_VERSION:v=%"
del /f /q "%TEMP%\nodeterm-node-version.txt" >nul 2>nul
if "%NODE_VERSION%"=="24.19.0" goto :node_ready
if exist "%LOCALAPPDATA%\Programs\node24\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node24;%PATH%"
set "NODE_VERSION="
node -v > "%TEMP%\nodeterm-node-version.txt" 2>nul
set /p "NODE_VERSION="<"%TEMP%\nodeterm-node-version.txt"
set "NODE_VERSION=%NODE_VERSION:v=%"
del /f /q "%TEMP%\nodeterm-node-version.txt" >nul 2>nul
if "%NODE_VERSION%"=="24.19.0" goto :node_ready
echo [INFO] Node.js %NODE_VERSION% is not the pinned 24.19.0 runtime.
if exist "%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64\node.exe" set "PATH=%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64;%PATH%"
set "NODE_VERSION="
node -v > "%TEMP%\nodeterm-node-version.txt" 2>nul
set /p "NODE_VERSION="<"%TEMP%\nodeterm-node-version.txt"
set "NODE_VERSION=%NODE_VERSION:v=%"
del /f /q "%TEMP%\nodeterm-node-version.txt" >nul 2>nul
if "%NODE_VERSION%"=="24.19.0" goto :node_ready
goto :node_install
:node_ready
echo [OK] Node.js %NODE_VERSION% is available.
exit /b 0
:node_install
where winget >nul 2>nul
if not errorlevel 1 (
  echo [INSTALL] Node.js LTS through winget.
  winget install --id OpenJS.NodeJS.LTS --source winget --scope user -e --accept-source-agreements --accept-package-agreements --disable-interactivity
  call :refresh_common_path
  set "NODE_VERSION="
  node -v > "%TEMP%\nodeterm-node-version.txt" 2>nul
  set /p "NODE_VERSION="<"%TEMP%\nodeterm-node-version.txt"
  set "NODE_VERSION=%NODE_VERSION:v=%"
  del /f /q "%TEMP%\nodeterm-node-version.txt" >nul 2>nul
  if "%NODE_VERSION%"=="24.19.0" goto :node_ready
)
echo [INSTALL] Portable Node.js fallback.
if not exist "%LOCALAPPDATA%\nodeterm\toolchain" mkdir "%LOCALAPPDATA%\nodeterm\toolchain" >nul 2>nul
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$m=Get-Content -Raw '%ROOT%\dependencies.manifest.json' | ConvertFrom-Json; $z=Join-Path $env:TEMP 'nodeterm-node.zip'; Invoke-WebRequest -UseBasicParsing -Uri $m.node.url -OutFile $z; Expand-Archive -LiteralPath $z -DestinationPath (Join-Path $env:LOCALAPPDATA 'nodeterm\toolchain') -Force; Remove-Item -LiteralPath $z -Force"
if errorlevel 1 (
  echo [FAILED] Portable Node.js download or extraction failed.
  exit /b 1
)
for /d %%D in ("%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64") do set "NODE_HOME=%%~fD"
if not defined NODE_HOME (
  echo [FAILED] Portable Node.js extraction produced no node directory.
  exit /b 1
)
set "PATH=%NODE_HOME%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Portable Node.js is not resolvable after PATH refresh.
  exit /b 1
)
set "NODE_VERSION="
node -v > "%TEMP%\nodeterm-node-version.txt" 2>nul
set /p "NODE_VERSION="<"%TEMP%\nodeterm-node-version.txt"
set "NODE_VERSION=%NODE_VERSION:v=%"
del /f /q "%TEMP%\nodeterm-node-version.txt" >nul 2>nul
if not "%NODE_VERSION%"=="24.19.0" (
  echo [FAILED] Portable Node.js version %NODE_VERSION% does not match 24.19.0.
  exit /b 1
)
exit /b 0

:ensure_vs
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VS_PATH="
if exist "%VSWHERE%" "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\find-windows-toolchain.ps1" -VsWhere "%VSWHERE%" >"%TEMP%\nodeterm-vs-path.txt" 2>nul
if exist "%TEMP%\nodeterm-vs-path.txt" set /p "VS_PATH="<"%TEMP%\nodeterm-vs-path.txt"
del /f /q "%TEMP%\nodeterm-vs-path.txt" >nul 2>nul
if defined VS_PATH (
  set "GYP_MSVS_VERSION=2022"
  set "npm_config_msvs_version=2022"
  set "GYP_MSVS_OVERRIDE_PATH=%VS_PATH%"
  call "%VS_PATH%\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 >nul
  if errorlevel 1 exit /b 1
  echo [OK] Visual Studio 2022 C++ Build Tools are available at "%VS_PATH%".
  exit /b 0
)
where winget >nul 2>nul
if errorlevel 1 (
  echo [FAILED] winget is required to obtain Visual Studio Build Tools on a fresh machine.
  exit /b 1
)
echo [INSTALL] Visual Studio 2022 Build Tools with the C++ workload. UAC may appear for this step.
if "%NODETERM_SILENT%"=="1" (
  winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget -e --accept-source-agreements --accept-package-agreements --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
) else (
  "%PS%" -NoProfile -ExecutionPolicy Bypass -Command "Start-Process winget -Verb RunAs -Wait -ArgumentList 'install --id Microsoft.VisualStudio.2022.BuildTools --source winget -e --accept-source-agreements --accept-package-agreements --override \"--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended\"'"
)
if errorlevel 1 (
  echo [FAILED] Visual Studio Build Tools installation failed.
  exit /b 1
)
set "VS_PATH="
if exist "%VSWHERE%" "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\find-windows-toolchain.ps1" -VsWhere "%VSWHERE%" >"%TEMP%\nodeterm-vs-path.txt" 2>nul
if exist "%TEMP%\nodeterm-vs-path.txt" set /p "VS_PATH="<"%TEMP%\nodeterm-vs-path.txt"
del /f /q "%TEMP%\nodeterm-vs-path.txt" >nul 2>nul
if not defined VS_PATH (
  echo [FAILED] Visual Studio C++ workload is still unavailable after installation.
  exit /b 1
)
set "GYP_MSVS_VERSION=2022"
set "npm_config_msvs_version=2022"
set "GYP_MSVS_OVERRIDE_PATH=%VS_PATH%"
call "%VS_PATH%\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 exit /b 1
echo [OK] Visual Studio C++ Build Tools are ready.
exit /b 0

:ensure_python
where py >nul 2>nul
if not errorlevel 1 py -3 --version >nul 2>nul
if not errorlevel 1 (
  echo [OK] Python 3 is already available.
  exit /b 0
)
where winget >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Python 3 is missing and winget is unavailable.
  exit /b 1
)
echo [INSTALL] Python 3 through winget.
winget install --id Python.Python.3.12 --source winget --scope user -e --accept-source-agreements --accept-package-agreements --disable-interactivity
call :refresh_common_path
py -3 --version >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Python 3 is not available after bootstrap.
  exit /b 1
)
echo [OK] Python 3 is ready.
exit /b 0

:refresh_common_path
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\node24;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%PATH%"
exit /b 0
