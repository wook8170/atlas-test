import { db } from "@/db/dexie";
import type { PomodoroSession, TodaySummary } from "@/domain/types";
import { buildTodaySummary, shouldIncrementReward } from "@/lib/session-logic";

export const SessionRepository = {
  async save(session: PomodoroSession): Promise<void> {
    await db.transaction("rw", db.sessions, db.rewardState, async () => {
      const previous = await db.sessions.get(session.id);
      await db.sessions.put(session);

      if (shouldIncrementReward(previous, session)) {
        const rewardState =
          (await db.rewardState.get("reward")) ?? {
            id: "reward" as const,
            stickerCount: 0,
            updatedAt: session.endedAt,
            schemaVersion: 1 as const,
          };
        rewardState.stickerCount += 1;
        rewardState.updatedAt = session.endedAt;
        await db.rewardState.put(rewardState);
      }
    });
  },
  async listByDate(date: string): Promise<PomodoroSession[]> {
    return db.sessions.where("localDateKey").equals(date).sortBy("startedAt");
  },
  async listRecent(limit = 12): Promise<PomodoroSession[]> {
    return db.sessions.orderBy("startedAt").reverse().limit(limit).toArray();
  },
  async todaySummary(date: string): Promise<TodaySummary> {
    return buildTodaySummary(date, await this.listByDate(date));
  },
};
