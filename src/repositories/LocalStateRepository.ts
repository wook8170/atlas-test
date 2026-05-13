import { db } from "@/db/dexie";
import type { PomodoroSettings, RewardState, StudentProfile } from "@/domain/types";
import { createDefaultSettings } from "@/lib/constants";

function createDefaultRewardState(): RewardState {
  return {
    id: "reward",
    stickerCount: 0,
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export const LocalStateRepository = {
  async getProfile(): Promise<StudentProfile | undefined> {
    return db.profile.get("self");
  },
  async upsertProfile(profile: StudentProfile): Promise<void> {
    await db.profile.put(profile);
  },
  async getSettings(): Promise<PomodoroSettings> {
    return (await db.settings.get("default")) ?? createDefaultSettings();
  },
  async updateSettings(patch: Partial<PomodoroSettings>): Promise<void> {
    const cur = await this.getSettings();
    await db.settings.put({ ...cur, ...patch, id: "default" });
  },
  async getRewardState(): Promise<RewardState> {
    return (await db.rewardState.get("reward")) ?? createDefaultRewardState();
  },
  async setRewardState(patch: Partial<RewardState>): Promise<void> {
    const current = await this.getRewardState();
    await db.rewardState.put({ ...current, ...patch, id: "reward" });
  },
  async resetLearningData(): Promise<void> {
    await db.transaction(
      "rw",
      db.schedule,
      db.sessions,
      db.rewardState,
      db.errorLogs,
      async () => {
        await db.schedule.clear();
        await db.sessions.clear();
        await db.errorLogs.clear();
        await db.rewardState.put(createDefaultRewardState());
      },
    );
  },
};
