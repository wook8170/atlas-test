// AGENTORC architect 설계 (cmp0oieta) 정합. 신규 엔터티 금지 — 6개 도메인만.
//
// - student profile: 학생 1명 로컬 프로필 (이름, 학년 등)
// - weekly schedule: 요일별 시간표 (시작/종료/과목/색)
// - pomodoro settings: 집중 25 / 휴식 5 등 기본값 — 사용자 override 가능
// - today records: 오늘 완료한 세션 요약 (캐시 — 세션 기록으로 재계산 가능)
// - sticker count: 보상 누적 카운트
// - error logs: 실패한 사용자 동작 (재시도 결과 포함)

export interface StudentProfile {
  id: "self";
  name: string;
  grade?: number;
  createdAt: string;
  schemaVersion: 1;
}

export interface WeeklyScheduleEntry {
  id: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startMinute: number;
  endMinute: number;
  subject: string;
  color: string;
  schemaVersion: 1;
}

export interface PomodoroSettings {
  id: "default";
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  schemaVersion: 1;
}

export type PomodoroSessionStatus = "completed" | "interrupted" | "cancelled";
export type PomodoroSessionType = "focus" | "short-break" | "long-break";

export interface PomodoroSession {
  id: string;
  scheduleEntryId?: string;
  subjectSnapshot?: string;
  freeTaskTitle?: string;
  localDateKey?: string;
  sessionType?: PomodoroSessionType;
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  status: PomodoroSessionStatus;
  schemaVersion: 1;
}

export interface ErrorLog {
  id: string;
  occurredAt: string;
  action: string;
  reason: string;
  retried?: "ok" | "failed";
  schemaVersion: 1;
}

export interface TodaySummary {
  date: string;
  completedSessions: number;
  totalFocusMinutes: number;
  totalFocusSeconds: number;
  bySubject: Array<{ subject: string; count: number }>;
}
