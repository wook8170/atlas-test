// 학생 프로필 + 뽀모도로 설정 + 스티커 카운트 — 같이 읽히는 루트 상태.
import { db } from "@/db/dexie";
import type { PomodoroSettings, StudentProfile } from "@/domain/types";

const DEFAULT_SETTINGS: PomodoroSettings = {
  id: "default",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  updatedAt: new Date().toISOString(),
  schemaVersion: 2,
};

function normalizeSettings(
  settings?: Partial<PomodoroSettings> & { breakMinutes?: number },
): PomodoroSettings {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return {
    id: "default",
    focusMinutes: settings.focusMinutes ?? DEFAULT_SETTINGS.focusMinutes,
    shortBreakMinutes:
      settings.shortBreakMinutes ?? settings.breakMinutes ?? DEFAULT_SETTINGS.shortBreakMinutes,
    longBreakMinutes: settings.longBreakMinutes ?? DEFAULT_SETTINGS.longBreakMinutes,
    longBreakEvery: settings.longBreakEvery ?? DEFAULT_SETTINGS.longBreakEvery,
    updatedAt: settings.updatedAt ?? DEFAULT_SETTINGS.updatedAt,
    schemaVersion: 2,
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
    return normalizeSettings(
      (await db.settings.get("default")) as
        | (Partial<PomodoroSettings> & { breakMinutes?: number })
        | undefined,
    );
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
