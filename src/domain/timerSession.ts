import type {
  PomodoroSessionRecord,
  TimerSessionType,
  TodaySummary,
} from "@/domain/types";

type LegacySessionStatus = "completed" | "interrupted" | "cancelled";

export interface LegacyPomodoroSessionV1 {
  id: string;
  scheduleEntryId?: string;
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  status: LegacySessionStatus;
  schemaVersion: 1;
}

export const ACTIVE_TIMER_ID = "active";

export function toLocalDateKey(startedAt: string): string {
  return startedAt.slice(0, 10);
}

export function getEarnedStars(
  sessionType: TimerSessionType,
  completed: boolean,
): number {
  return sessionType === "focus" && completed ? 1 : 0;
}

export function migrateLegacySession(
  session: LegacyPomodoroSessionV1,
): PomodoroSessionRecord {
  const completed = session.status === "completed";
  const actualEndAt = session.endedAt ?? session.startedAt;

  return {
    id: session.id,
    sessionType: "focus",
    startedAt: session.startedAt,
    expectedEndAt: actualEndAt,
    actualEndAt,
    status: completed ? "completed" : "cancelled",
    completed,
    earnedStars: getEarnedStars("focus", completed),
    targetDurationSec: session.durationSec,
    actualDurationSec: session.durationSec,
    scheduleEntryId: session.scheduleEntryId ?? null,
    freeTaskTitle: null,
    localDateKey: toLocalDateKey(session.startedAt),
    schemaVersion: 2,
  };
}

export function summarizeTodaySessions(
  date: string,
  sessions: PomodoroSessionRecord[],
): TodaySummary {
  const completedFocusSessions = sessions.filter(
    (session) => session.sessionType === "focus" && session.completed,
  );

  return {
    date,
    completedFocusCount: completedFocusSessions.length,
    totalFocusMinutes:
      completedFocusSessions.reduce(
        (sum, session) => sum + session.actualDurationSec,
        0,
      ) / 60,
    earnedStars: completedFocusSessions.reduce(
      (sum, session) => sum + session.earnedStars,
      0,
    ),
  };
}
