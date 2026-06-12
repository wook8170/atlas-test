#!/usr/bin/env bash
# 이사갈집 — 로컬 실행 스크립트
# 사용법: ./start.sh   (실행 권한 없으면:  bash start.sh)
set -e

cd "$(dirname "$0")"

# 1) Node 설치 확인
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js가 설치돼 있지 않습니다."
  echo "   https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node 18 이상이 필요합니다. 현재 버전: $(node -v)"
  exit 1
fi
echo "✅ Node $(node -v)"

# 2) 의존성 설치 (최초 1회 또는 변경 시)
if [ ! -d node_modules ]; then
  echo "📦 의존성 설치 중... (처음 한 번만, 잠시 걸립니다)"
  npm install
fi

# 3) (선택) API 키 안내
if [ ! -f .env.local ]; then
  echo "ℹ️  실거래가 API 키를 쓰려면 'cp .env.example .env.local' 후 키를 채우세요."
  echo "   키가 없으면 데모 데이터로 동작합니다."
fi

# 4) 개발 서버 실행
echo ""
echo "🚀 서버를 시작합니다 → http://localhost:7000"
echo "   (종료: Ctrl + C)"
echo ""
npm run dev
