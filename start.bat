@echo off
echo ========================================
echo    CarGo - Autokolcsonzo Rendszer
echo ========================================
echo.
echo Backend es Frontend inditasa...
echo.

REM Ellenorizzuk, hogy a MySQL fut-e
echo [1/3] MySQL ellenorzese...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL fut
) else (
    echo [HIBA] MySQL nem fut! Kerjuk inditsd el a MySQL szervert eloszor.
    echo        XAMPP Control Panel -^> MySQL Start
    pause
    exit /b 1
)

echo.
echo [2/3] Backend szerver inditasa (Port 5000)...
start "CarGo Backend" cmd /k "npm start"

echo.
echo [3/3] Frontend szerver inditasa (Port 4200)...
timeout /t 3 /nobreak >nul
cd cargo-frontend
start "CarGo Frontend" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo    Szerverek elinditva!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:4200
echo.
echo A szerverek kulon ablakokban futnak.
echo Zarjuk be az ablakokat a leallitashoz.
echo.
pause
