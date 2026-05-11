import type { PomodoroSession, TodaySummary } from "./types";

export function createEmptyTodaySummary(date: string): TodaySummary {
  return {
    date,
    completedSessions: 0,
    totalFocusMinutes: 0,
    byLabel: [],
  };
}

export function isCompletedFocusSession(session: PomodoroSession): boolean {
  return session.sessionType === "focus" && session.status === "completed";
}

export function sortSessionsNewestFirst(sessions: PomodoroSession[]): PomodoroSession[] {
  return [...sessions].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function buildTodaySummary(date: string, sessions: PomodoroSession[]): TodaySummary {
  const byLabel = new Map<string, number>();
  const completedFocusSessions = sessions.filter(isCompletedFocusSession);

  completedFocusSessions.forEach((session) => {
    const label = session.label.trim() || "이름 없는 세션";
    byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
  });

  return {
    date,
    completedSessions: completedFocusSessions.length,
    totalFocusMinutes: Math.round(
      completedFocusSessions.reduce((sum, session) => sum + session.durationSec, 0) / 60,
    ),
    byLabel: [...byLabel.entries()].map(([label, count]) => ({ label, count })),
  };
}
