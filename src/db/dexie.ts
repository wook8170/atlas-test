import Dexie, { Table } from "dexie";
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
  }
}

export const db = new AppDb();
