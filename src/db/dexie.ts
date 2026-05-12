import Dexie, { Table } from "dexie";
import type {
  ErrorLog,
  PomodoroSettings,
  SessionRecord,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";

type LegacySessionStatus = "completed" | "interrupted" | "cancelled";

type LegacySessionRecord = {
  id: string;
  scheduleEntryId?: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  status?: LegacySessionStatus;
  schemaVersion?: 1;
};

function toLocalDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

class AppDb extends Dexie {
  profile!: Table<StudentProfile, "self">;
  schedule!: Table<WeeklyScheduleEntry, string>;
  settings!: Table<PomodoroSettings, "default">;
  sessions!: Table<SessionRecord, string>;
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
        sessions: "id, localDateKey, startedAt, scheduleEntryId, sessionType",
        errorLogs: "id, occurredAt",
      })
      .upgrade((tx) =>
        tx
          .table("sessions")
          .toCollection()
          .modify((session: LegacySessionRecord & Partial<SessionRecord>) => {
            const legacy = session as LegacySessionRecord;
            const status = legacy.status ?? "completed";
            const completed =
              typeof session.completed === "boolean"
                ? session.completed
                : status === "completed";
            const mutable = session as Record<string, unknown>;

            mutable.scheduleEntryId = session.scheduleEntryId ?? null;
            mutable.freeTaskTitle = session.freeTaskTitle ?? null;
            session.sessionType = session.sessionType ?? "focus";
            session.endedAt = session.endedAt ?? legacy.endedAt ?? legacy.startedAt;
            session.completed = completed;
            session.localDateKey = toLocalDateKey(legacy.startedAt);
            session.createdAt = session.createdAt ?? session.endedAt;
            session.elapsedSeconds = session.elapsedSeconds ?? legacy.durationSec;

            if (session.completionReason === undefined) {
              session.completionReason = completed
                ? "finished"
                : status === "interrupted"
                  ? "user_stopped"
                  : "abandoned";
            }

            session.schemaVersion = 1;

            delete mutable.status;
            delete mutable.durationSec;
          }),
      );
  }
}

export const db = new AppDb();
