import type { SessionRecord, TodaySummary, WeeklyScheduleEntry } from "./types";

export type SessionHistoryStatus = "completed" | "interrupted" | "cancelled";

export interface SessionHistoryItem {
  id: string;
  dateKey: string;
  subject: string;
  status: SessionHistoryStatus;
  durationSec: number;
  startedAt: string;
  endedAt: string;
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

export function isFocusSession(session: SessionRecord): boolean {
  return session.sessionType === "focus";
}

function buildScheduleMap(
  scheduleEntries: WeeklyScheduleEntry[],
): Map<string, WeeklyScheduleEntry> {
  return new Map(scheduleEntries.map((entry) => [entry.id, entry]));
}

function getSessionDateKey(session: SessionRecord): string {
  return session.localDateKey || getLocalDateKey(session.startedAt);
}

function getSortableTimestamp(session: SessionRecord): number {
  const stamp = Date.parse(session.endedAt || session.startedAt);
  return Number.isNaN(stamp) ? 0 : stamp;
}

export function sessionDurationSec(session: SessionRecord): number {
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

export function resolveSessionSubject(
  session: SessionRecord,
  scheduleById: ReadonlyMap<string, WeeklyScheduleEntry>,
): string {
  if (session.freeTaskTitle?.trim()) {
    return session.freeTaskTitle.trim();
  }

  if (session.scheduleEntryId) {
    return scheduleById.get(session.scheduleEntryId)?.subjectName ?? "연결 과목 없음";
  }

  return "자유 학습";
}

export function toSessionHistoryStatus(session: SessionRecord): SessionHistoryStatus {
  if (session.completed) {
    return "completed";
  }
  return session.completionReason === "abandoned" ? "cancelled" : "interrupted";
}

export function buildTodaySummary(args: {
  dateKey: string;
  sessions: SessionRecord[];
  scheduleEntries: WeeklyScheduleEntry[];
}): TodaySummary {
  const scheduleById = buildScheduleMap(args.scheduleEntries);
  const completedSessions = args.sessions.filter(
    (session) =>
      isFocusSession(session) &&
      session.completed &&
      getSessionDateKey(session) === args.dateKey,
  );

  const bySubject = new Map<string, number>();
  let totalFocusSeconds = 0;

  completedSessions.forEach((session) => {
    const subject = resolveSessionSubject(session, scheduleById);
    bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
    totalFocusSeconds += sessionDurationSec(session);
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
  sessions: SessionRecord[];
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
      status: toSessionHistoryStatus(session),
      durationSec: sessionDurationSec(session),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    }));
}
