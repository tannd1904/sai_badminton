@echo off
title SAI Badminton Championship - Dev Server
echo ========================================================
echo  SAI BADMINTON CHAMPIONSHIP MANAGEMENT SYSTEM (SAI-BCS)
echo ========================================================
echo Setting Node 20 environment...
set PATH=C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64;%PATH%
node -v
echo Starting real-time development server (Next.js + Socket.io + Redis)...
npm run dev
pause
