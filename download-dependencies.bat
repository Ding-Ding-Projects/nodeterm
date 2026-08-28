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
  echo [FAILED] Windows PowerShell 5.1 is unavailable at "%PS%".
  exit /b 1
)

"%PS%" -NoProfile -NonInteractive -Command "$p=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){exit 0}; exit 1" >nul 2>nul
if not errorlevel 1 goto :elevation_ready
if "%NODETERM_SILENT%"=="1" (
  echo [INFO] Silent mode will not open an administrator prompt. User-scoped tools will continue; missing Visual Studio Build Tools will stop with an exact remedy.
  goto :elevation_ready
)
set "NODETERM_ELEVATE_SCRIPT=%~f0"
echo [ADMIN] Requesting administrator approval before toolchain work begins.
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command "try { $p=Start-Process -FilePath $env:NODETERM_ELEVATE_SCRIPT -Verb RunAs -Wait -PassThru; exit $p.ExitCode } catch { Write-Error 'Administrator approval was declined or unavailable.'; exit 1223 }"
exit /b %ERRORLEVEL%

:elevation_ready
for /f "delims=" %%T in ('%PS% -NoProfile -NonInteractive -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set "NODETERM_START=%%T"
echo === nodeterm dependency bootstrap ===
echo Repository: "%ROOT%"
echo A fresh Windows checkout needs no manual runtime, SDK, compiler, or package installation.

call :ensure_node
if errorlevel 1 exit /b %ERRORLEVEL%
call :ensure_python
if errorlevel 1 exit /b %ERRORLEVEL%
call :ensure_vs
if errorlevel 1 exit /b %ERRORLEVEL%

pushd "%ROOT%"
call node scripts/check-dependencies-ready.mjs verify >nul 2>nul
if not errorlevel 1 (
  echo [OK] Project packages are already ready for this package-lock.json.
  popd
  goto :done
)
echo [INSTALL] Project packages from package-lock.json.
call npm ci
set "NPM_EXIT=%ERRORLEVEL%"
if not "%NPM_EXIT%"=="0" (
  popd
  echo [FAILED] npm ci exited with code %NPM_EXIT%.
  exit /b %NPM_EXIT%
)
call node scripts/check-dependencies-ready.mjs write
set "MARKER_EXIT=%ERRORLEVEL%"
popd
if not "%MARKER_EXIT%"=="0" (
  echo [FAILED] Could not write the dependency readiness marker.
  exit /b %MARKER_EXIT%
)

:done
for /f "delims=" %%T in ('%PS% -NoProfile -NonInteractive -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set "NODETERM_END=%%T"
set /a NODETERM_SECONDS=NODETERM_END-NODETERM_START
echo [DONE] Toolchain and project packages are ready in %NODETERM_SECONDS% seconds.
exit /b 0

:ensure_node
set "NODE_HOME=%LOCALAPPDATA%\nodeterm\toolchain\node-v24.19.0-win-x64"
set "NODE_VERSION="
where node >nul 2>nul
if not errorlevel 1 for /f "delims=" %%V in ('node -v 2^>nul') do set "NODE_VERSION=%%V"
if /I "%NODE_VERSION%"=="v24.19.0" (
  echo [OK] Pinned Node.js 24.19.0 is already available.
  exit /b 0
)
if exist "%NODE_HOME%\node.exe" (
  set "PATH=%NODE_HOME%;%PATH%"
  set "NODE_VERSION="
  for /f "delims=" %%V in ('"%NODE_HOME%\node.exe" -v 2^>nul') do set "NODE_VERSION=%%V"
  if /I "%NODE_VERSION%"=="v24.19.0" (
    echo [OK] Reusing pinned Node.js 24.19.0 at "%NODE_HOME%".
    exit /b 0
  )
)
echo [CHECK] Verified portable Node.js 24.19.0.
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\bootstrap-windows-toolchain.ps1" -Component Node -RepositoryRoot "%ROOT%"
if errorlevel 1 (
  echo [FAILED] Could not obtain pinned Node.js 24.19.0 from the declared official source.
  exit /b 1
)
set "PATH=%NODE_HOME%;%PATH%"
"%NODE_HOME%\node.exe" -v | findstr /X /I "v24.19.0" >nul
if errorlevel 1 (
  echo [FAILED] Pinned Node.js verification failed after bootstrap.
  exit /b 1
)
exit /b 0

:ensure_python
set "PYTHON_HOME=%LOCALAPPDATA%\Programs\Python\Python312"
set "PYTHON=%PYTHON_HOME%\python.exe"
if exist "%PYTHON%" (
  "%PYTHON%" -c "import platform; raise SystemExit(0 if platform.python_version() == '3.12.10' else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "npm_config_python=%PYTHON%"
    echo [OK] Reusing pinned Python 3.12.10 at "%PYTHON_HOME%".
    exit /b 0
  )
)
set "PYTHON="
where py >nul 2>nul
if not errorlevel 1 for /f "delims=" %%P in ('py -3.12 -c "import platform,sys; print(sys.executable if platform.python_version() == '3.12.10' else '')" 2^>nul') do set "PYTHON=%%P"
if defined PYTHON (
  set "npm_config_python=%PYTHON%"
  echo [OK] Reusing pinned Python 3.12.10 at "%PYTHON%".
  exit /b 0
)
echo [INSTALL] Verified Python 3.12.10 for node-gyp.
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\bootstrap-windows-toolchain.ps1" -Component Python -RepositoryRoot "%ROOT%"
if errorlevel 1 (
  echo [FAILED] Could not obtain pinned Python 3.12.10 from the declared official source.
  exit /b 1
)
set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not exist "%PYTHON%" for /f "delims=" %%P in ('py -3.12 -c "import platform,sys; print(sys.executable if platform.python_version() == '3.12.10' else '')" 2^>nul') do set "PYTHON=%%P"
set "npm_config_python=%PYTHON%"
"%PYTHON%" -c "import platform; raise SystemExit(0 if platform.python_version() == '3.12.10' else 1)" >nul 2>nul
if errorlevel 1 (
  echo [FAILED] Pinned Python verification failed after bootstrap.
  exit /b 1
)
exit /b 0

:ensure_vs
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
call :find_vs
if defined VS_PATH goto :vs_ready
echo [INSTALL] Verified Visual Studio 2022 C++ Build Tools. This is the only machine-wide toolchain component.
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\bootstrap-windows-toolchain.ps1" -Component VisualStudio -RepositoryRoot "%ROOT%"
if errorlevel 1 (
  echo [FAILED] Visual Studio 2022 C++ Build Tools could not be installed.
  echo [FAILED] Interactive users should double-click build.bat and approve its upfront administrator prompt.
  exit /b 1
)
call :find_vs
if not defined VS_PATH (
  echo [FAILED] The C++ workload is still unavailable after the verified installer completed.
  exit /b 1
)
:vs_ready
set "GYP_MSVS_VERSION=2022"
set "npm_config_msvs_version=2022"
set "GYP_MSVS_OVERRIDE_PATH=%VS_PATH%"
call "%VS_PATH%\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 (
  echo [FAILED] VsDevCmd.bat could not initialize the x64 compiler environment.
  exit /b 1
)
echo [OK] Visual Studio 2022 C++ Build Tools are available at "%VS_PATH%".
exit /b 0

:find_vs
set "VS_PATH="
if exist "%VSWHERE%" "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%ROOT%\scripts\find-windows-toolchain.ps1" -VsWhere "%VSWHERE%" >"%TEMP%\nodeterm-vs-path.txt" 2>nul
if exist "%TEMP%\nodeterm-vs-path.txt" set /p "VS_PATH="<"%TEMP%\nodeterm-vs-path.txt"
del /f /q "%TEMP%\nodeterm-vs-path.txt" >nul 2>nul
exit /b 0
