# Setup Supabase Database via PowerShell
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SAI Badminton Championship - Setup Supabase Database" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$dbUrl = Read-Host "Dan duong dan Supabase DATABASE_URL vao day roi nhan Enter"

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "❌ Ban chua nhap DATABASE_URL! Vui long chay lai." -ForegroundColor Red
    exit 1
}

$dbUrl = $dbUrl.Trim()

Write-Host "`n[1/2] Dang tao cac bang du lieu tren Supabase Database..." -ForegroundColor Yellow
$env:DATABASE_URL = $dbUrl
& npx prisma db push --accept-data-loss

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Loi khi tao bang tren database. Vui long kiem tra lai DATABASE_URL!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/2] Dang nap danh sach 24 VDV, 16 cap dau & tai khoan BTC/Trong tai..." -ForegroundColor Yellow
& node launcher.js seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Loi khi seed du lieu. Vui long kiem tra lai!" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "   ✅ HOAN TAT THIET LAP SUPABASE DATABASE THANH CONG!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Gio day ban co the bat dau Web Service tren Render de su dung.`n" -ForegroundColor Green
