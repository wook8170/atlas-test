import { db } from "@/db/dexie";
import type { PomodoroSession, TodaySummary } from "@/domain/types";
import { buildTodaySummary } from "@/domain/sessionSummary";

export const SessionRepository = {
  async append(session: PomodoroSession): Promise<void> {
    await db.sessions.put(session);
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    return db.sessions.where("localDateKey").equals(date).reverse().sortBy("startedAt");
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const [sessions, scheduleEntries] = await Promise.all([
      this.listByDate(date),
      db.schedule.toArray(),
    ]);
    return buildTodaySummary(date, sessions, scheduleEntries);
  },
};
