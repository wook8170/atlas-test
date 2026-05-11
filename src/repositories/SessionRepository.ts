import { db } from "@/db/dexie";
import { buildTodaySummary } from "@/domain/sessionUtils";
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
    return buildTodaySummary(date, sessions);
  },
};
