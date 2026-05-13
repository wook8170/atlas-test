import type { PomodoroSession, TodaySummary, WeeklyScheduleEntry } from "./types";

export interface SessionHistoryItem {
  id: string;
  dateKey: string;
  subject: string;
  status: PomodoroSession["status"];
  durationSec: number;
  startedAt: string;
  endedAt?: string;
}

export function getLocalDateKey(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFocusSession(session: PomodoroSession): boolean {
  return session.sessionType === undefined || session.sessionType === "focus";
}

function buildScheduleMap(
  scheduleEntries: WeeklyScheduleEntry[],
): Map<string, WeeklyScheduleEntry> {
  return new Map(scheduleEntries.map((entry) => [entry.id, entry]));
}

function getSessionDateKey(session: PomodoroSession): string {
  return session.localDateKey ?? getLocalDateKey(session.startedAt);
}

function getSortableTimestamp(session: PomodoroSession): number {
  const source = session.endedAt ?? session.startedAt;
  const stamp = Date.parse(source);
  return Number.isNaN(stamp) ? 0 : stamp;
}

export function resolveSessionSubject(
  session: PomodoroSession,
  scheduleById: ReadonlyMap<string, WeeklyScheduleEntry>,
): string {
  if (session.subjectSnapshot?.trim()) {
    return session.subjectSnapshot.trim();
  }

  if (session.freeTaskTitle?.trim()) {
    return session.freeTaskTitle.trim();
  }

  if (session.scheduleEntryId) {
    return scheduleById.get(session.scheduleEntryId)?.subject ?? "연결 과목 없음";
  }

  return "자유 학습";
}

export function buildTodaySummary(args: {
  dateKey: string;
  sessions: PomodoroSession[];
  scheduleEntries: WeeklyScheduleEntry[];
}): TodaySummary {
  const scheduleById = buildScheduleMap(args.scheduleEntries);
  const completedSessions = args.sessions.filter(
    (session) =>
      isFocusSession(session) &&
      session.status === "completed" &&
      getSessionDateKey(session) === args.dateKey,
  );

  const bySubject = new Map<string, number>();
  let totalFocusSeconds = 0;

  completedSessions.forEach((session) => {
    const subject = resolveSessionSubject(session, scheduleById);
    bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
    totalFocusSeconds += session.durationSec;
  });

  return {
    date: args.dateKey,
    completedSessions: completedSessions.length,
    totalFocusMinutes: Math.round(totalFocusSeconds / 60),
    totalFocusSeconds,
    bySubject: [...bySubject.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko-KR"))
      .map(([subject, count]) => ({ subject, count })),
  };
}

export function buildSessionHistoryItems(args: {
  sessions: PomodoroSession[];
  scheduleEntries: WeeklyScheduleEntry[];
  limit?: number;
}): SessionHistoryItem[] {
  const scheduleById = buildScheduleMap(args.scheduleEntries);
  const limit = args.limit ?? 10;

  return args.sessions
    .filter(isFocusSession)
    .sort((a, b) => getSortableTimestamp(b) - getSortableTimestamp(a))
    .slice(0, limit)
    .map((session) => ({
      id: session.id,
      dateKey: getSessionDateKey(session),
      subject: resolveSessionSubject(session, scheduleById),
      status: session.status,
      durationSec: session.durationSec,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    }));
}
