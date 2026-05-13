import { db } from "@/db/dexie";
import {
  buildSessionHistoryItems,
  buildTodaySummary,
  getLocalDateKey,
  type SessionHistoryItem,
} from "@/domain/sessionRecords";
import type { PomodoroSession, TodaySummary } from "@/domain/types";

function normalizeSession(session: PomodoroSession): PomodoroSession {
  return {
    ...session,
    localDateKey: session.localDateKey ?? getLocalDateKey(session.startedAt),
    sessionType: session.sessionType ?? "focus",
  };
}

export type { SessionHistoryItem };

export const SessionRepository = {
  async append(session: PomodoroSession): Promise<void> {
    await db.sessions.put(normalizeSession(session));
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    return (await db.sessions.where("localDateKey").equals(date).toArray()).map(
      normalizeSession,
    );
  },
  async listRecent(limit = 10): Promise<SessionHistoryItem[]> {
    const [sessions, scheduleEntries] = await Promise.all([
      db.sessions.toArray(),
      db.schedule.toArray(),
    ]);
    return buildSessionHistoryItems({
      sessions: sessions.map(normalizeSession),
      scheduleEntries,
      limit,
    });
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    const [sessions, scheduleEntries] = await Promise.all([
      this.listByDate(date),
      db.schedule.toArray(),
    ]);
    return buildTodaySummary({
      dateKey: date,
      sessions,
      scheduleEntries,
    });
  },
};
