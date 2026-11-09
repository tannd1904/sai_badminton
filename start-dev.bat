@echo off
echo ========================================================
echo   SAI Badminton Championship - Full-Stack App Server
echo ========================================================
echo.
echo Ensuring PostgreSQL & Redis containers are running...
docker start badminton_postgres badminton_redis >nul 2>&1

echo.
echo Launching SAI Badminton Championship on http://localhost:3000 ...
echo (Node 20 automatic resolution via launcher.js)
echo.
node launcher.js
pause
