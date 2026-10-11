@echo off
REM ============================================================
REM  Jorkan League Draft Night 2026
REM  Starts the TV presentation and opens it in Chrome.
REM  ESPN is still the draft - this only starts the broadcast.
REM ============================================================
setlocal

cd /d "%~dp0"

echo.
echo  JORKAN LEAGUE - 2026 DRAFT NIGHT
echo  --------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [X] Node.js was not found.
  echo      Install the LTS build from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  [1/3] Installing dependencies ^(first run only^)...
  call npm install
  if errorlevel 1 (
    echo  [X] npm install failed. Fix the error above and run this again.
    pause
    exit /b 1
  )
) else (
  echo  [1/3] Dependencies already installed.
)

echo  [2/3] Building the Chrome extension...
call npm run build:extension
if errorlevel 1 (
  echo  [X] Extension build failed.
  pause
  exit /b 1
)

echo  [3/3] Starting the presentation server...
start "Jorkan draft server" cmd /c "npm run dev"

echo.
echo  Waiting for the server to come up...
set "READY="
for /l %%i in (1,1,40) do (
  if not defined READY (
    timeout /t 1 /nobreak >nul
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:5173/presentation) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 set "READY=1"
  )
)

if not defined READY (
  echo  [!] The server did not answer on http://localhost:5173 yet.
  echo      Check the "Jorkan draft server" window for errors.
) else (
  echo  [OK] Presentation is up.
)

start "" "http://localhost:5173/presentation"

echo.
echo  ============================================================
echo   NEXT STEPS
echo.
echo   1. Load the extension once ^(only needed the first time^):
echo        chrome://extensions  ^>  Developer mode  ^>  Load unpacked
echo        select:  %cd%\extension\dist
echo.
echo   2. Open the ESPN draft room in a second Chrome window.
echo   3. Drag the presentation window onto the TV and press F.
echo   4. Click ARM PRESENTATION, then wait.
echo.
echo   ESPN starts the draft. The presentation follows by itself.
echo   Press C in the presentation for the draft day checklist.
echo  ============================================================
echo.
pause
endlocal
