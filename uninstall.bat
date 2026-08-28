@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "NODETERM_SILENT=0"
set "NODETERM_PURGE=0"
set "NODETERM_DRY_RUN=0"

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="/s" set "NODETERM_SILENT=1"
if /I "%~1"=="--silent" set "NODETERM_SILENT=1"
if /I "%~1"=="/purge" set "NODETERM_PURGE=1"
if /I "%~1"=="--purge" set "NODETERM_PURGE=1"
if /I "%~1"=="/dry-run" set "NODETERM_DRY_RUN=1"
if /I "%~1"=="--dry-run" set "NODETERM_DRY_RUN=1"
shift
goto parse_args

:args_done
if /I "%SILENT%"=="1" set "NODETERM_SILENT=1"

set "UPDATE_EXE="
for %%F in (
  "%LOCALAPPDATA%\nodeterm\Update.exe"
  "%LOCALAPPDATA%\node-terminal\Update.exe"
  "%LOCALAPPDATA%\Programs\nodeterm\Update.exe"
) do if not defined UPDATE_EXE if exist "%%~fF" set "UPDATE_EXE=%%~fF"

echo === nodeterm Windows uninstall ===
if defined UPDATE_EXE (
  echo [FOUND] Squirrel.Windows uninstaller: "%UPDATE_EXE%"
) else (
  echo [INFO] No installed Squirrel.Windows uninstaller was found.
)
if "%NODETERM_PURGE%"=="1" (
  echo [PLAN] Remove "%APPDATA%\nodeterm"
  echo [PLAN] Remove "%USERPROFILE%\.nodeterm"
  echo [PLAN] Remove the installed nodeterm directory under LocalAppData.
) else (
  echo [KEEP] Application data remains. Pass --purge to remove it.
)

if "%NODETERM_DRY_RUN%"=="1" (
  echo [DONE] Dry run only. Nothing was changed.
  exit /b 0
)

if not defined UPDATE_EXE if not "%NODETERM_PURGE%"=="1" (
  echo [FAILED] nodeterm is not installed in a recognized Squirrel.Windows location.
  exit /b 1
)

if "%NODETERM_SILENT%"=="0" (
  choice /C YN /N /M "Continue with uninstall? [Y/N] "
  if errorlevel 2 (
    echo [CANCELLED] Nothing was changed.
    exit /b 0
  )
)

if defined UPDATE_EXE (
  if "%NODETERM_SILENT%"=="1" (
    start "" /wait "%UPDATE_EXE%" --uninstall -s
  ) else (
    start "" /wait "%UPDATE_EXE%" --uninstall
  )
  if errorlevel 1 (
    echo [FAILED] Squirrel.Windows uninstall returned an error.
    exit /b 1
  )
  echo [DONE] The installed application was removed.
)

if "%NODETERM_PURGE%"=="1" (
  call :remove_dir "%APPDATA%\nodeterm" || exit /b 1
  call :remove_dir "%USERPROFILE%\.nodeterm" || exit /b 1
  call :remove_dir "%LOCALAPPDATA%\nodeterm" || exit /b 1
  call :remove_dir "%LOCALAPPDATA%\node-terminal" || exit /b 1
  call :remove_dir "%LOCALAPPDATA%\Programs\nodeterm" || exit /b 1
  echo [DONE] nodeterm application data was removed.
)

exit /b 0

:remove_dir
if exist "%~1" rd /s /q "%~1"
if exist "%~1" (
  echo [FAILED] Could not remove "%~1".
  exit /b 1
)
exit /b 0
