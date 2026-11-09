@echo off
echo ========================================================
echo   SAI Badminton Championship - Database & Redis Starter
echo ========================================================
echo.
echo Starting Docker containers (badminton_postgres, badminton_redis)...
docker compose up -d
echo.
docker ps --filter "name=badminton"
echo.
echo Database is ready on localhost:5432 and Redis on localhost:6379!
echo.
pause
