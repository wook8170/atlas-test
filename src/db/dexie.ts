import Dexie, { Table } from "dexie";
import {
  migrateLegacyScheduleEntries,
  type LegacyWeeklyScheduleEntry,
} from "@/domain/schedule";
import type {
  ErrorLog,
  PomodoroSession,
  PomodoroSettings,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";

class AppDb extends Dexie {
  profile!: Table<StudentProfile, "self">;
  schedule!: Table<WeeklyScheduleEntry, string>;
  settings!: Table<PomodoroSettings, "default">;
  sessions!: Table<PomodoroSession, string>;
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
        schedule: "id, weekday, [weekday+displayOrder], [weekday+startMinute]",
        settings: "id",
        sessions: "id, startedAt, scheduleEntryId",
        errorLogs: "id, occurredAt",
      })
      .upgrade(async (tx) => {
        const schedule = tx.table<LegacyWeeklyScheduleEntry, string>("schedule");
        const legacyRows = await schedule.toArray();
        if (legacyRows.length === 0) return;

        const migratedRows = migrateLegacyScheduleEntries(legacyRows);
        await schedule.clear();
        await schedule.bulkPut(migratedRows);
      });
  }
}

export const db = new AppDb();
