@echo off
cd /d "%~dp0"

set "PORTAL=%~dp0index.html"

:: Tenta Chrome primeiro
set "CHROME="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "--app=file:///%PORTAL:\=/%" --window-size=1440,900 --disable-infobars
  exit /b
)

:: Fallback: Edge
set "EDGE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if defined EDGE (
  start "" "%EDGE%" "--app=file:///%PORTAL:\=/%" --window-size=1440,900
  exit /b
)

:: Fallback: abre no navegador padrão
start "" "%PORTAL%"
