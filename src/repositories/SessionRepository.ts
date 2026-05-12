import { db } from "@/db/dexie";
import type { PomodoroSession, TodaySummary } from "@/domain/types";

export const SessionRepository = {
  async append(session: PomodoroSession): Promise<void> {
    await db.sessions.put(session);
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    return (await db.sessions.where("localDateKey").equals(date).toArray()).sort(
      (left, right) => right.startedAt.localeCompare(left.startedAt),
    );
  },
  async listRecent(date: string): Promise<PomodoroSession[]> {
    return this.listByDate(date);
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const sessions = await this.listByDate(date);
    const completed = sessions.filter(
      (s) => s.status === "completed" && s.phase === "focus",
    );
    const bySubject = new Map<string, number>();
    completed.forEach((s) => {
      const k = s.label || "자유 집중";
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
