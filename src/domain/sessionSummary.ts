import type {
  SessionRecord,
  TodaySummary,
  WeeklyScheduleEntry,
} from "@/domain/types";

const SHORT_BREAK_LABEL = "짧은 휴식";
const LONG_BREAK_LABEL = "긴 휴식";
const SCHEDULE_FALLBACK_LABEL = "시간표 과제";
const FREE_TASK_FALLBACK_LABEL = "자유 과제";

export function getLocalDateKey(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveSessionLabel(
  session: SessionRecord,
  scheduleTitleMap: ReadonlyMap<string, string> = new Map(),
): string {
  if (session.freeTaskTitle) {
    return session.freeTaskTitle;
  }
  if (session.scheduleEntryId) {
    return scheduleTitleMap.get(session.scheduleEntryId) ?? SCHEDULE_FALLBACK_LABEL;
  }
  if (session.sessionType === "short-break") {
    return SHORT_BREAK_LABEL;
  }
  if (session.sessionType === "long-break") {
    return LONG_BREAK_LABEL;
  }
  return FREE_TASK_FALLBACK_LABEL;
}

export function buildTodaySummary(
  date: string,
  sessions: SessionRecord[],
  scheduleEntries: WeeklyScheduleEntry[],
): TodaySummary {
  const scheduleTitleMap = new Map(
    scheduleEntries.map((entry) => [entry.id, entry.subjectName] as const),
  );
  const bySubject = new Map<string, number>();
  let completedSessions = 0;
  let totalFocusSeconds = 0;

  sessions.forEach((session) => {
    if (session.sessionType !== "focus") {
      return;
    }

    totalFocusSeconds += session.elapsedSeconds ?? 0;

    if (session.completed) {
      completedSessions += 1;
    }

    const label = resolveSessionLabel(session, scheduleTitleMap);
    bySubject.set(label, (bySubject.get(label) ?? 0) + 1);
  });

  return {
    date,
    completedSessions,
    totalFocusMinutes: Number((totalFocusSeconds / 60).toFixed(1)),
    totalFocusSeconds,
    bySubject: [...bySubject.entries()]
      .map(([subject, count]) => ({ subject, count }))
      .sort((left, right) => right.count - left.count || left.subject.localeCompare(right.subject, "ko-KR")),
  };
}
