@echo off
REM 이사갈집 — 로컬 실행 스크립트 (Windows)
REM 사용법: start.bat 더블클릭 또는 명령창에서 start.bat

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js가 설치돼 있지 않습니다. https://nodejs.org 에서 LTS를 설치하세요.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [*] 의존성 설치 중... 처음 한 번만, 잠시 걸립니다.
  call npm install
)

echo.
echo 서버를 시작합니다 - http://localhost:7000   (종료: Ctrl + C)
echo.
call npm run dev
