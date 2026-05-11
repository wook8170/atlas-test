# atlas-test

ATLAS Agent Orchestration 라이브 검증용 샌드박스 저장소.

Initial commit — 에이전트 dispatch 시 base branch 로 사용.

## Offline-First Study Domain

이 저장소는 오프라인 우선 학습 앱의 핵심 동작을 검증하는 최소 도메인 모듈을 포함합니다.

- `OfflineStudyApp`: 로컬 캐시된 시간표 조회, 타이머 실행/종료, 기록 저장/조회 제공
- `MemoryStorage`: 브라우저 `localStorage` 대체용 인메모리 저장소
- `syncSchedule(fetcher)`: 온라인이면 원격 시간표를 갱신하고, 실패하면 캐시를 그대로 사용

## Commands

- `npm run build`: 엔트리 모듈이 정상 로드되는지 확인
- `npm test`: 오프라인 시간표 조회, 타이머 기록, 재시작 후 기록 조회 검증
