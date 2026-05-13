import Dexie, { Table } from "dexie";
import type {
  ErrorLog,
  PomodoroSession,
  PomodoroSettings,
  RewardState,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";
import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_FOCUS_MINUTES,
  createDefaultSettings,
} from "@/lib/constants";
import { getLocalDateKey } from "@/lib/time";

class AppDb extends Dexie {
  profile!: Table<StudentProfile, "self">;
  schedule!: Table<WeeklyScheduleEntry, string>;
  settings!: Table<PomodoroSettings, "default">;
  rewardState!: Table<RewardState, "reward">;
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
        schedule: "id, weekday, startMinute",
        settings: "id",
        rewardState: "id",
        sessions: "id, localDateKey, startedAt, scheduleEntryId, status",
        errorLogs: "id, occurredAt, retryResult",
      })
      .upgrade(async (tx) => {
        await tx.table("schedule").toCollection().modify((entry: Record<string, unknown>) => {
          if (typeof entry.focusMinutes !== "number") {
            entry.focusMinutes = DEFAULT_FOCUS_MINUTES;
          }
          if (typeof entry.breakMinutes !== "number") {
            entry.breakMinutes = DEFAULT_BREAK_MINUTES;
          }
          if (typeof entry.isActive !== "boolean") {
            entry.isActive = true;
          }
          entry.schemaVersion = 1;
        });

        await tx.table("settings").toCollection().modify((settings: Record<string, unknown>) => {
          mergeDefaults(settings, createDefaultSettings());
        });

        await tx.table("sessions").toCollection().modify((session: Record<string, unknown>) => {
          const startedAt =
            typeof session.startedAt === "string"
              ? session.startedAt
              : new Date().toISOString();
          const endedAt =
            typeof session.endedAt === "string" ? session.endedAt : startedAt;

          session.sessionType =
            typeof session.sessionType === "string" ? session.sessionType : "focus";
          session.subjectLabel =
            typeof session.subjectLabel === "string"
              ? session.subjectLabel
              : typeof session.scheduleEntryId === "string" && session.scheduleEntryId.length > 0
                ? session.scheduleEntryId
                : "자유";
          session.localDateKey =
            typeof session.localDateKey === "string"
              ? session.localDateKey
              : getLocalDateKey(new Date(startedAt));
          session.startedAt = startedAt;
          session.endedAt = endedAt;
          session.plannedFocusMinutes =
            typeof session.plannedFocusMinutes === "number"
              ? session.plannedFocusMinutes
              : DEFAULT_FOCUS_MINUTES;
          session.plannedBreakMinutes =
            typeof session.plannedBreakMinutes === "number"
              ? session.plannedBreakMinutes
              : DEFAULT_BREAK_MINUTES;
          session.rewardEarned =
            session.status === "completed" && session.rewardEarned !== 0 ? 1 : 0;
          session.schemaVersion = 1;
        });

        await tx.table("errorLogs").toCollection().modify((log: Record<string, unknown>) => {
          if (typeof log.retryResult !== "string") {
            if (log.retried === "ok") {
              log.retryResult = "retry_succeeded";
            } else if (log.retried === "failed") {
              log.retryResult = "retry_failed";
            } else {
              log.retryResult = "not_attempted";
            }
          }
          log.schemaVersion = 1;
        });

        const rewardTable = tx.table<RewardState, "reward">("rewardState");
        const reward = await rewardTable.get("reward");
        if (!reward) {
          await rewardTable.add({
            id: "reward",
            stickerCount: 0,
            updatedAt: new Date().toISOString(),
            schemaVersion: 1,
          });
        }
      });
  }
}

function mergeDefaults<T extends object>(
  target: Record<string, unknown>,
  defaults: T,
): void {
  Object.entries(defaults as Record<string, unknown>).forEach(([key, value]) => {
    if (target[key] === undefined) {
      target[key] = value;
    }
  });
}

export const db = new AppDb();
