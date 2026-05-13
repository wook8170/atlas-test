import type { PomodoroSession, TodaySummary } from "@/domain/types";

function isCompletedFocusSession(session: PomodoroSession): boolean {
  return session.sessionType === "focus" && session.status === "completed";
}

export function shouldIncrementReward(
  previous: PomodoroSession | undefined,
  next: PomodoroSession,
): boolean {
  return (
    isCompletedFocusSession(next) &&
    next.rewardEarned === 1 &&
    (previous?.rewardEarned ?? 0) !== 1
  );
}

export function buildTodaySummary(
  date: string,
  sessions: PomodoroSession[],
): TodaySummary {
  const todaySessions = sessions.filter((session) => session.localDateKey === date);
  const completedFocusSessions = todaySessions.filter(isCompletedFocusSession);
  const bySubject = new Map<string, number>();

  completedFocusSessions.forEach((session) => {
    const key = session.subjectLabel.trim() || "자유";
    bySubject.set(key, (bySubject.get(key) ?? 0) + 1);
  });

  return {
    date,
    completedSessions: completedFocusSessions.length,
    totalFocusMinutes: Math.round(
      completedFocusSessions.reduce((sum, session) => sum + session.durationSec, 0) / 60,
    ),
    todayStickerCount: todaySessions.reduce(
      (sum, session) => sum + session.rewardEarned,
      0,
    ),
    bySubject: [...bySubject.entries()].map(([subject, count]) => ({ subject, count })),
  };
}
