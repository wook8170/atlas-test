import Dexie, { Table } from "dexie";
import { getLocalDateKey } from "@/domain/sessionRecords";
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
        schedule: "id, weekday",
        settings: "id",
        sessions: "id, startedAt, endedAt, status, scheduleEntryId, localDateKey",
        errorLogs: "id, occurredAt",
      })
      .upgrade((tx) =>
        tx
          .table("sessions")
          .toCollection()
          .modify((session: PomodoroSession) => {
            session.localDateKey ??= getLocalDateKey(session.startedAt);
            session.sessionType ??= "focus";
          }),
      );
  }
}

export const db = new AppDb();
