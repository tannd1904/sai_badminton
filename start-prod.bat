@echo off
echo ========================================================
echo   SAI Badminton Championship - Production Server (Fast)
echo ========================================================
echo.
echo Ensuring PostgreSQL & Redis containers are running...
docker start badminton_postgres badminton_redis >nul 2>&1

echo.
echo Building optimized production bundles...
node launcher.js build

echo.
echo Launching Production Server on http://localhost:3000 ...
echo (Instant page loading and zero compilation latency)
echo.
node launcher.js start
pause
