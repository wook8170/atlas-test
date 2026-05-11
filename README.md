# atlas-test

ATLAS Agent Orchestration 라이브 검증용 샌드박스 저장소.

Initial commit — 에이전트 dispatch 시 base branch 로 사용.

## MVP Boundary

This sandbox now codifies the AGENTORC-4 MVP guardrails as a local-only app model.

- State is limited to timetable entries, pomodoro sessions, study records, stickers, settings, and the last local save timestamp.
- Remote-first concepts such as calendar integration, social sharing, billing, server push notifications, and multi-device sync are explicitly rejected.
- Copy that implies integration, subscription, or cloud sync should be treated as out of scope for the MVP.
