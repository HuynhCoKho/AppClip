@echo off
setlocal
cd /d "%~dp0"
title AppClip Toon

if not exist ".env" (
  echo Lan dau chay AppClip.
  echo Dan OpenAI API key cua ban vao day, roi bam Enter.
  echo Vi du: sk-...
  set /p OPENAI_API_KEY=OPENAI_API_KEY: 
  if "%OPENAI_API_KEY%"=="" (
    echo Ban chua nhap API key.
    pause
    exit /b 1
  )
  > ".env" echo OPENAI_API_KEY=%OPENAI_API_KEY%
) else (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /i "%%A"=="OPENAI_API_KEY" set "OPENAI_API_KEY=%%B"
  )
)

if "%OPENAI_API_KEY%"=="" (
  echo Khong tim thay OPENAI_API_KEY trong file .env.
  echo Hay xoa file .env roi chay lai file nay de nhap key moi.
  pause
  exit /b 1
)

echo Dang mo AppClip Toon...
start "" "http://localhost:4173"

python server.py
if errorlevel 9009 (
  echo Khong tim thay lenh python, dang thu py -3...
  py -3 server.py
)

echo.
echo Server da dung. Bam phim bat ky de dong cua so.
pause
