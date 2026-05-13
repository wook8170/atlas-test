import { db } from "@/db/dexie";
import { summarizeTodaySessions } from "@/domain/timerSession";
import type { PomodoroSessionRecord, TodaySummary } from "@/domain/types";

export const SessionRepository = {
  async append(session: PomodoroSessionRecord): Promise<void> {
    await db.sessions.put(session);
  },
  async listByDate(date: string): Promise<PomodoroSessionRecord[]> {
    return db.sessions.where("localDateKey").equals(date).sortBy("startedAt");
  },
  async listRecent(limit: number): Promise<PomodoroSessionRecord[]> {
    return db.sessions.orderBy("actualEndAt").reverse().limit(limit).toArray();
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const sessions = await this.listByDate(date);
    return summarizeTodaySessions(date, sessions);
  },
};
