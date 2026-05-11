# atlas-test — 초딩 뽀모도로 + 시간표 앱

ATLAS Agent Orchestration 의 라이브 검증용 product. AGENTORC 프로젝트의
25 이슈가 이 저장소 위에서 구현된다.

## 기술 스택

- Vite + React 18 + TypeScript
- React Router (`/home`, `/timetable`, `/records`, `/settings` 4탭)
- Dexie (IndexedDB wrapper) — 로컬 우선 저장
- 모바일 우선 (phone 320~767, tablet 768~1024)

## 디렉토리

```
src/
├── App.tsx                  # 라우팅
├── main.tsx                 # 엔트리
├── components/              # 공용 UI (MobileAppShell 등)
├── routes/                  # 4 화면 (Home / Timetable / Records / Settings)
├── domain/                  # 6 도메인 모델 (architect 설계 정합)
├── db/                      # Dexie 인스턴스
├── repositories/            # 4 Repository (LocalState / Schedule / Session / ErrorLog)
└── styles/global.css        # 디자인 토큰 + App Shell CSS
```

## Architect 설계 정합

- [AI 아키텍트] AGENTORC-1 모바일 우선 웹 앱 아키텍처 설계
- [AI 아키텍트] AGENTORC-8 주간 시간표 데이터 모델
- [AI 아키텍트] AGENTORC-9 뽀모도로 세션 기록 데이터 모델
- [AI 아키텍트] AGENTORC-10 오류 기록 데이터 모델
- [AI PM] AGENTORC-1 모바일 우선 웹 앱 정의
- [AI PM] AGENTORC-14 시간표 학습 칸 CRUD 분해 및 인수 기준

## 에이전트 작업 방식

1. AGENTORC 이슈의 IssueRepositoryReference 가 이 저장소 + `auto/agentorc-N` 브랜치
2. 에이전트는 `src/routes/<X>Route.tsx` 의 placeholder 위에 구현
3. domain/repository 가 부족하면 확장 — 기존 6 도메인 framework 안에서

이 README + scaffold 가 product seed. agent 는 이 위에 feature 추가.
