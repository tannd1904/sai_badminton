# SAI Badminton Championship - PowerShell Dev Server Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SAI BADMINTON CHAMPIONSHIP MANAGEMENT SYSTEM (SAI-BCS) " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

# Prepend Node 20 to current session PATH
$env:PATH = "C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64;" + $env:PATH

Write-Host "Active Node version: $(node -v)" -ForegroundColor Green
Write-Host "Starting server on http://localhost:3000 ..." -ForegroundColor Cyan

npm run dev
