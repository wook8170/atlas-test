// 학생 프로필 + 뽀모도로 설정 + 스티커 카운트 — 같이 읽히는 루트 상태.
import { db } from "@/db/dexie";
import { isActiveTimerSnapshot } from "@/lib/activeTimer";
import type { ActiveTimerSnapshot } from "@/lib/activeTimer";
import type { PomodoroSettings, StudentProfile } from "@/domain/types";

const DEFAULT_SETTINGS: PomodoroSettings = {
  id: "default",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  schemaVersion: 1,
};

const ACTIVE_TIMER_STORAGE_KEY = "atlas-test.active-timer.v1";

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
    await db.settings.put({ ...cur, ...patch, id: "default" });
  },
  getActiveTimerSnapshot(): ActiveTimerSnapshot | null {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isActiveTimerSnapshot(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  saveActiveTimerSnapshot(snapshot: ActiveTimerSnapshot): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ACTIVE_TIMER_STORAGE_KEY, JSON.stringify(snapshot));
  },
  clearActiveTimerSnapshot(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
  },
};
