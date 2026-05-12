import Dexie, { Table } from "dexie";
import type {
  ActiveTimerSnapshot,
  ErrorLog,
  PomodoroSession,
  PomodoroSettings,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";
import { toLocalDateKey } from "@/domain/time";

class AppDb extends Dexie {
  profile!: Table<StudentProfile, "self">;
  schedule!: Table<WeeklyScheduleEntry, string>;
  settings!: Table<PomodoroSettings, "default">;
  sessions!: Table<PomodoroSession, string>;
  activeTimer!: Table<ActiveTimerSnapshot, "active">;
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
        sessions: "id, startedAt, scheduleEntryId, localDateKey, phase, status",
        activeTimer: "id",
        errorLogs: "id, occurredAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((session: Record<string, unknown>) => {
            if (typeof session.localDateKey !== "string") {
              session.localDateKey = toLocalDateKey(
                new Date(String(session.startedAt)),
              );
            }
            if (typeof session.phase !== "string") {
              session.phase = "focus";
            }
            if (typeof session.label !== "string") {
              session.label =
                typeof session.scheduleEntryId === "string" &&
                session.scheduleEntryId.length > 0
                  ? session.scheduleEntryId
                  : "집중";
            }
            session.scheduleEntryId =
              typeof session.scheduleEntryId === "string"
                ? session.scheduleEntryId
                : null;
            session.schemaVersion = 2;
          });
      });
  }
}

export const db = new AppDb();
