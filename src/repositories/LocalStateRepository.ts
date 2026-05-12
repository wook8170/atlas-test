// 학생 프로필 + 뽀모도로 설정 + 스티커 카운트 — 같이 읽히는 루트 상태.
import { db } from "@/db/dexie";
import type { PomodoroSettings, StudentProfile } from "@/domain/types";

const DEFAULT_SETTINGS: PomodoroSettings = {
  id: "default",
  focusMinutes: 15,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  updatedAt: new Date(0).toISOString(),
  schemaVersion: 1,
};

export const LocalStateRepository = {
  async getProfile(): Promise<StudentProfile | undefined> {
    return db.profile.get("self");
  },
  async upsertProfile(profile: StudentProfile): Promise<void> {
    await db.profile.put(profile);
  },
  async getSettings(): Promise<PomodoroSettings> {
    return (await db.settings.get("default")) ?? DEFAULT_SETTINGS;
  },
  async updateSettings(patch: Partial<PomodoroSettings>): Promise<void> {
    const cur = await this.getSettings();
    await db.settings.put({
      ...cur,
      ...patch,
      id: "default",
      updatedAt: new Date().toISOString(),
    });
  },
};
