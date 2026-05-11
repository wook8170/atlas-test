import { db } from "@/db/dexie";
import type { PomodoroSession, TodaySummary } from "@/domain/types";

export const SessionRepository = {
  async append(session: PomodoroSession): Promise<void> {
    await db.sessions.put(session);
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    const sessions = await db.sessions.where("localDateKey").equals(date).toArray();
    sessions.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    return sessions;
  },
  async listRecent(limit = 10): Promise<PomodoroSession[]> {
    return db.sessions.orderBy("startedAt").reverse().limit(limit).toArray();
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const scheduleEntries = await db.schedule.toArray();
    const labelByEntryId = new Map(
      scheduleEntries.map((entry) => [entry.id, entry.subject] as const),
    );
    const sessions = await this.listByDate(date);
    const completed = sessions.filter(
      (session) => session.sessionType === "focus" && session.completed,
    );
    const bySubject = new Map<string, number>();
    completed.forEach((session) => {
      const label =
        session.freeTaskTitle ??
        (session.scheduleEntryId
          ? labelByEntryId.get(session.scheduleEntryId) ?? "시간표 활동"
          : "자유 과제");
      bySubject.set(label, (bySubject.get(label) ?? 0) + 1);
    });
    return {
      date,
      completedSessions: completed.length,
      totalFocusMinutes:
        completed.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60,
      bySubject: [...bySubject.entries()].map(([subject, count]) => ({ subject, count })),
    };
  },
};
