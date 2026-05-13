import type { SessionRecord, TodaySummary } from "./types";

export function createEmptyTodaySummary(date: string): TodaySummary {
  return {
    date,
    completedSessions: 0,
    totalFocusMinutes: 0,
    totalFocusSeconds: 0,
    bySubject: [],
  };
}

export function isCompletedFocusSession(session: SessionRecord): boolean {
  return session.sessionType === "focus" && session.completed;
}

export function sortSessionsNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function sessionSubjectLabel(session: SessionRecord): string {
  if (session.freeTaskTitle?.trim()) {
    return session.freeTaskTitle.trim();
  }
  return session.scheduleEntryId ? "연결된 시간표" : "자유 공부";
}

export function sessionElapsedSeconds(session: SessionRecord): number {
  if (typeof session.elapsedSeconds === "number" && session.elapsedSeconds >= 0) {
    return session.elapsedSeconds;
  }

  const startedAtMs = Date.parse(session.startedAt);
  const endedAtMs = Date.parse(session.endedAt);
  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs) || endedAtMs < startedAtMs) {
    return 0;
  }

  return Math.floor((endedAtMs - startedAtMs) / 1000);
}

export function buildTodaySummary(date: string, sessions: SessionRecord[]): TodaySummary {
  const bySubject = new Map<string, number>();
  const completedFocusSessions = sessions.filter(isCompletedFocusSession);
  const totalFocusSeconds = completedFocusSessions.reduce(
    (sum, session) => sum + sessionElapsedSeconds(session),
    0,
  );

  completedFocusSessions.forEach((session) => {
    const subject = sessionSubjectLabel(session);
    bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
  });

  return {
    date,
    completedSessions: completedFocusSessions.length,
    totalFocusMinutes: Math.round(totalFocusSeconds / 60),
    totalFocusSeconds,
    bySubject: [...bySubject.entries()].map(([subject, count]) => ({ subject, count })),
  };
}
