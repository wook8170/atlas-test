import { db } from "@/db/dexie";
import type { PomodoroSession, TodaySummary } from "@/domain/types";

export const SessionRepository = {
  async append(session: PomodoroSession): Promise<void> {
    await db.sessions.put(session);
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    return db.sessions.where("startedAt").startsWith(date).toArray();
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const sessions = await this.listByDate(date);
    const completed = sessions.filter((s) => s.status === "completed");
    const bySubject = new Map<string, number>();
    completed.forEach((s) => {
      const k = s.scheduleEntryId ?? "자유";
      bySubject.set(k, (bySubject.get(k) ?? 0) + 1);
    });
    return {
      date,
      completedSessions: completed.length,
      totalFocusMinutes: completed.reduce((sum, s) => sum + s.durationSec, 0) / 60,
      bySubject: [...bySubject.entries()].map(([subject, count]) => ({ subject, count })),
    };
  },
};
