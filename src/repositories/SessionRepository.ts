import { db } from "@/db/dexie";
import type { SessionRecord, TodaySummary } from "@/domain/types";

function toLocalDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveElapsedSeconds(session: SessionRecord): number {
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

function assertSessionRecord(record: SessionRecord): void {
  const startedAtMs = Date.parse(record.startedAt);
  const endedAtMs = Date.parse(record.endedAt);

  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
    throw new Error("SessionRecord must contain valid startedAt and endedAt timestamps.");
  }

  if (endedAtMs < startedAtMs) {
    throw new Error("SessionRecord endedAt must be on or after startedAt.");
  }

  const hasScheduleEntry = Boolean(record.scheduleEntryId);
  const hasFreeTaskTitle = Boolean(record.freeTaskTitle);

  if (record.sessionType === "focus") {
    if (hasScheduleEntry === hasFreeTaskTitle) {
      throw new Error(
        "Focus SessionRecord values must include exactly one of scheduleEntryId or freeTaskTitle.",
      );
    }
  } else if (hasScheduleEntry || hasFreeTaskTitle) {
    throw new Error("Break SessionRecord values cannot reference a schedule entry or free task.");
  }

  if (record.completed) {
    if (
      record.completionReason !== undefined &&
      record.completionReason !== null &&
      record.completionReason !== "finished"
    ) {
      throw new Error("Completed SessionRecord values may only use a finished completionReason.");
    }
  } else if (
    record.completionReason !== "user_stopped" &&
    record.completionReason !== "abandoned"
  ) {
    throw new Error(
      "Incomplete SessionRecord values must declare a user_stopped or abandoned completionReason.",
    );
  }
}

function normalizeSessionRecord(record: SessionRecord): SessionRecord {
  const freeTaskTitle = record.freeTaskTitle?.trim() || null;
  const scheduleEntryId = record.scheduleEntryId ?? null;
  const normalized: SessionRecord = {
    ...record,
    scheduleEntryId,
    freeTaskTitle,
    localDateKey: toLocalDateKey(record.startedAt),
    createdAt: record.createdAt || record.endedAt,
    elapsedSeconds: deriveElapsedSeconds({
      ...record,
      scheduleEntryId,
      freeTaskTitle,
    }),
  };

  assertSessionRecord(normalized);
  return normalized;
}

async function buildScheduleSubjectMap(
  records: SessionRecord[],
): Promise<Map<string, string>> {
  const scheduleIds = [
    ...new Set(
      records
        .map((record) => record.scheduleEntryId)
        .filter((scheduleEntryId): scheduleEntryId is string => Boolean(scheduleEntryId)),
    ),
  ];
  if (scheduleIds.length === 0) {
    return new Map();
  }

  const entries = await db.schedule.bulkGet(scheduleIds);
  const byId = new Map<string, string>();
  entries.forEach((entry) => {
    if (entry) {
      byId.set(entry.id, entry.subjectName);
    }
  });
  return byId;
}

function summarizeSubject(
  session: SessionRecord,
  scheduleSubjects: Map<string, string>,
): string {
  if (session.freeTaskTitle) {
    return session.freeTaskTitle;
  }

  if (session.scheduleEntryId) {
    return scheduleSubjects.get(session.scheduleEntryId) ?? "연결된 시간표";
  }

  return "자유";
}

export const SessionRepository = {
  async append(session: SessionRecord): Promise<void> {
    await db.sessions.put(normalizeSessionRecord(session));
  },
  async listByDate(date: string): Promise<SessionRecord[]> {
    return db.sessions.where("localDateKey").equals(date).toArray();
  },
  async listRecent(limit = 20): Promise<SessionRecord[]> {
    return db.sessions.orderBy("startedAt").reverse().limit(limit).toArray();
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const sessions = await this.listByDate(date);
    const completed = sessions.filter(
      (session) => session.sessionType === "focus" && session.completed,
    );
    const scheduleSubjects = await buildScheduleSubjectMap(completed);
    const bySubject = new Map<string, number>();
    const totalFocusSeconds = completed.reduce(
      (sum, session) => sum + deriveElapsedSeconds(session),
      0,
    );

    completed.forEach((session) => {
      const subject = summarizeSubject(session, scheduleSubjects);
      bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
    });

    return {
      date,
      completedSessions: completed.length,
      totalFocusMinutes: Math.round(totalFocusSeconds / 60),
      totalFocusSeconds,
      bySubject: [...bySubject.entries()].map(([subject, count]) => ({ subject, count })),
    };
  },
};
