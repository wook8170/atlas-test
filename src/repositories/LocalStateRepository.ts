// 학생 프로필 + 뽀모도로 설정 + 스티커 카운트 — 같이 읽히는 루트 상태.
import { db } from "@/db/dexie";
import type { PomodoroSettings, StudentProfile } from "@/domain/types";

function createDefaultSettings(): PomodoroSettings {
  return {
    id: "default",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

function normalizeSettings(input: Partial<PomodoroSettings> & { breakMinutes?: number }): PomodoroSettings {
  const defaults = createDefaultSettings();
  return {
    id: "default",
    focusMinutes: input.focusMinutes ?? defaults.focusMinutes,
    shortBreakMinutes: input.shortBreakMinutes ?? input.breakMinutes ?? defaults.shortBreakMinutes,
    longBreakMinutes: input.longBreakMinutes ?? defaults.longBreakMinutes,
    longBreakEvery: input.longBreakEvery ?? defaults.longBreakEvery,
    updatedAt: input.updatedAt ?? defaults.updatedAt,
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
    const settings = await db.settings.get("default");
    return settings ? normalizeSettings(settings as PomodoroSettings) : createDefaultSettings();
  },
  async updateSettings(patch: Partial<PomodoroSettings>): Promise<void> {
    const cur = await this.getSettings();
    await db.settings.put(
      normalizeSettings({
        ...cur,
        ...patch,
        id: "default",
        updatedAt: new Date().toISOString(),
      }),
    );
  },
};
