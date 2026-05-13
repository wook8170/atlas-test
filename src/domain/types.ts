// AGENTORC architect 설계 (cmp3y16uj06gnlciaeqsspbqm) 정합.
//
// 영속 엔터티는 6개만 유지하고, TodaySummary 는 세션/보상에서 파생 계산한다.
// - student profile: 학생 1명 로컬 프로필 (이름, 학년 등)
// - weekly schedule: 요일별 시간표 (시작/종료/과목/색/칸별 집중·휴식값)
// - pomodoro settings: 기본 집중/휴식 시간
// - reward state: 누적 스티커 카운트
// - pomodoro session: 완료/중단/취소 세션 기록
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
  focusMinutes: number;
  breakMinutes: number;
  isActive: boolean;
  schemaVersion: 1;
}

export interface PomodoroSettings {
  id: "default";
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes?: number;
  longBreakEvery?: number;
  schemaVersion: 1;
}

export interface RewardState {
  id: "reward";
  stickerCount: number;
  updatedAt: string;
  schemaVersion: 1;
}

export interface PomodoroSession {
  id: string;
  sessionType: "focus" | "short-break" | "long-break";
  scheduleEntryId?: string;
  freeTaskTitle?: string;
  subjectLabel: string;
  localDateKey: string;
  startedAt: string;
  endedAt: string;
  plannedFocusMinutes: number;
  plannedBreakMinutes: number;
  durationSec: number;
  status: "completed" | "interrupted" | "cancelled";
  rewardEarned: 0 | 1;
  schemaVersion: 1;
}

export interface ErrorLog {
  id: string;
  occurredAt: string;
  action: string;
  reason: string;
  retryResult: "not_attempted" | "retry_succeeded" | "retry_failed";
  schemaVersion: 1;
}

export interface TodaySummary {
  date: string;
  completedSessions: number;
  totalFocusMinutes: number;
  todayStickerCount: number;
  bySubject: Array<{ subject: string; count: number }>;
}
