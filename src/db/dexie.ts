import Dexie, { Table } from "dexie";
import type {
  ActiveTimerSnapshot,
  ErrorLog,
  PomodoroSessionRecord,
  PomodoroSettings,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";
import {
  type LegacyPomodoroSessionV1,
  migrateLegacySession,
} from "@/domain/timerSession";

class AppDb extends Dexie {
  profile!: Table<StudentProfile, "self">;
  schedule!: Table<WeeklyScheduleEntry, string>;
  settings!: Table<PomodoroSettings, "default">;
  activeTimer!: Table<ActiveTimerSnapshot, "active">;
  sessions!: Table<PomodoroSessionRecord, string>;
  errorLogs!: Table<ErrorLog, string>;

  constructor() {
    super("atlas-test-v1");
    this.version(1).stores({
      profile: "id",
      schedule: "id, weekday",
      settings: "id",
      sessions: "id, startedAt, scheduleEntryId",
      errorLogs: "id, occurredAt",
    });
    this.version(2)
      .stores({
        profile: "id",
        schedule: "id, weekday",
        settings: "id",
        activeTimer: "id, sessionId, status",
        sessions:
          "id, localDateKey, status, startedAt, actualEndAt, sessionType, scheduleEntryId",
        errorLogs: "id, occurredAt",
      })
      .upgrade((tx) =>
        tx
          .table("sessions")
          .toCollection()
          .modify((session: LegacyPomodoroSessionV1 & Record<string, unknown>) => {
            const migrated = migrateLegacySession(session);
            for (const key of Object.keys(session)) {
              if (!(key in migrated)) {
                delete session[key];
              }
            }
            Object.assign(session, migrated);
          }),
      );
  }
}

export const db = new AppDb();
