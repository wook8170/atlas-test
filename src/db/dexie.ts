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
    this.version(2)
      .stores({
        profile: "id",
        schedule: "id, weekday",
        settings: "id",
        sessions: "id, localDateKey, startedAt, scheduleEntryId, sessionType, completed",
        errorLogs: "id, occurredAt",
      })
      .upgrade(async (tx) => {
        await tx.table("settings").toCollection().modify((rawSetting) => {
          const setting = rawSetting as Partial<PomodoroSettings> & { breakMinutes?: number };
          setting.shortBreakMinutes =
            setting.shortBreakMinutes ?? setting.breakMinutes ?? 5;
          setting.updatedAt =
            typeof setting.updatedAt === "string"
              ? setting.updatedAt
              : new Date().toISOString();
          setting.schemaVersion = 2;
          delete setting.breakMinutes;
        });

        await tx.table("sessions").toCollection().modify((rawSession) => {
          const session = rawSession as Partial<PomodoroSession> & {
            durationSec?: number;
            status?: "completed" | "interrupted" | "cancelled";
          };
          const startedAt =
            typeof session.startedAt === "string"
              ? session.startedAt
              : new Date().toISOString();
          const endedAt =
            typeof session.endedAt === "string" ? session.endedAt : startedAt;

          session.scheduleEntryId =
            typeof session.scheduleEntryId === "string" ? session.scheduleEntryId : null;
          session.freeTaskTitle =
            typeof session.freeTaskTitle === "string" ? session.freeTaskTitle : null;
          session.sessionType =
            session.sessionType === "short-break" || session.sessionType === "long-break"
              ? session.sessionType
              : "focus";
          session.endedAt = endedAt;
          session.elapsedSeconds =
            typeof session.elapsedSeconds === "number"
              ? session.elapsedSeconds
              : session.durationSec ?? 0;
          session.completed =
            typeof session.completed === "boolean"
              ? session.completed
              : session.status === "completed";
          session.completionReason =
            session.completionReason ??
            (session.completed ? "finished" : "user_stopped");
          session.localDateKey =
            typeof session.localDateKey === "string"
              ? session.localDateKey
              : startedAt.slice(0, 10);
          session.createdAt =
            typeof session.createdAt === "string" ? session.createdAt : startedAt;
          session.schemaVersion = 2;
          delete session.durationSec;
          delete session.status;
        });
      });
  }
}

export const db = new AppDb();
