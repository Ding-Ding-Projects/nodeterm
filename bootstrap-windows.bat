@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Compatibility entry point. The supported fresh-machine path is build.bat, which calls this
rem automatic bootstrap before compiling. This wrapper remains for users of older documentation.
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
if /I "%~1"=="/s" (
  call "%ROOT%\download-dependencies.bat" /s
) else if /I "%~1"=="--silent" (
  call "%ROOT%\download-dependencies.bat" --silent
) else (
  call "%ROOT%\download-dependencies.bat"
)
exit /b %ERRORLEVEL%
