@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Intuition AI v2 실행 중...
echo.

if not exist "%~dp0dist\index.html" (
  echo [오류] dist 폴더가 없습니다.
  echo ZIP 전체를 이 폴더에 풀어주세요.
  echo 현재 폴더: %~dp0
  pause
  exit /b 1
)

if exist "%~dp0Intuition-AI-v2.exe" (
  "%~dp0Intuition-AI-v2.exe"
) else (
  echo [오류] Intuition-AI-v2.exe 파일이 없습니다.
  pause
  exit /b 1
)

echo.
pause
