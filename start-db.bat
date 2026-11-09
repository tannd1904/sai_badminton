@echo off
title Start Badminton Database & Redis Containers
echo ===================================================
echo  Starting PostgreSQL (5432) & Redis (6379)...
echo ===================================================
docker compose up -d
echo.
echo Database containers status:
docker ps
pause

