@echo off
chcp 65001 >nul
echo ================================================================
echo   SAI Badminton Championship - Setup Neon / Cloud Database
echo ================================================================
echo.
echo Script này sẽ tự động tạo bảng dữ liệu và nạp 24 VĐV, 16 cặp đấu
echo lên cơ sở dữ liệu Cloud (Neon.tech / Supabase).
echo.
set /p CLOUD_DB_URL="Dán đường dẫn Neon DATABASE_URL vào đây rồi nhấn Enter: "

if "%CLOUD_DB_URL%"=="" (
    echo.
    echo ❌ Bạn chưa nhập DATABASE_URL. Vui lòng chạy lại script!
    pause
    exit /b
)

set DATABASE_URL=%CLOUD_DB_URL%

echo.
echo [1/2] Đang tạo các bảng dữ liệu trên Cloud Database...
call npx prisma db push --accept-data-loss

echo.
echo [2/2] Đang nạp danh sách 24 VĐV, 16 cặp đấu và tài khoản BTC/Trọng tài...
call node launcher.js seed

echo.
echo ================================================================
echo   ✅ Hoàn tất thiết lập Database Cloud thành công!
echo ================================================================
echo Giờ đây ứng dụng trên Render đã có thể kết nối và chạy hoàn chỉnh.
echo.
pause
