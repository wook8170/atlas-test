import Dexie, { Table } from "dexie";
import type {
  ErrorLog,
  PomodoroSession,
  PomodoroSettings,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";
import { getLocalDateKey } from "@/domain/sessionSummary";

type LegacyScheduleEntry = {
  id: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startMinute: number;
  endMinute: number;
  subject?: string;
  color?: string;
};

type LegacySettings = {
  id?: "default";
  focusMinutes?: number;
  breakMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  longBreakEvery?: number;
  updatedAt?: string;
};

type LegacySession = {
  id: string;
  scheduleEntryId?: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  elapsedSeconds?: number;
  status?: "completed" | "interrupted" | "cancelled";
};

function createIsoNow(): string {
  return new Date().toISOString();
}

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
        schedule: "id, weekday, order, startMinute, isActive",
        settings: "id",
        sessions: "id, localDateKey, startedAt, scheduleEntryId",
        errorLogs: "id, occurredAt",
      })
      .upgrade(async (tx) => {
        const now = createIsoNow();

        const scheduleTable = tx.table("schedule");
        const legacyEntries = (await scheduleTable.toArray()) as LegacyScheduleEntry[];
        const orderById = new Map<string, number>();

        Array.from(
          legacyEntries.reduce((acc, entry) => {
            const list = acc.get(entry.weekday) ?? [];
            list.push(entry);
            acc.set(entry.weekday, list);
            return acc;
          }, new Map<number, LegacyScheduleEntry[]>()),
        ).forEach(([, entries]) => {
          entries
            .slice()
            .sort((left, right) => left.startMinute - right.startMinute)
            .forEach((entry, index) => {
              orderById.set(entry.id, index + 1);
            });
        });

        await scheduleTable.toCollection().modify((entry: Record<string, unknown>) => {
          const legacy = entry as LegacyScheduleEntry;
          entry.order = orderById.get(legacy.id) ?? 1;
          entry.title = typeof legacy.subject === "string" ? legacy.subject : "새 과제";
          entry.isActive = entry.isActive ?? true;
          entry.createdAt = typeof entry.createdAt === "string" ? entry.createdAt : now;
          entry.updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : now;
          entry.schemaVersion = 2;
          if (typeof legacy.color === "string" && typeof entry.displayColor !== "string") {
            entry.displayColor = legacy.color;
          }
          delete entry.subject;
          delete entry.color;
        });

        const settingsTable = tx.table("settings");
        await settingsTable.toCollection().modify((entry: Record<string, unknown>) => {
          const legacy = entry as LegacySettings;
          entry.id = "default";
          entry.focusMinutes = legacy.focusMinutes ?? 25;
          entry.shortBreakMinutes = legacy.shortBreakMinutes ?? legacy.breakMinutes ?? 5;
          entry.longBreakMinutes = legacy.longBreakMinutes ?? 15;
          entry.longBreakEvery = legacy.longBreakEvery ?? 4;
          entry.updatedAt = legacy.updatedAt ?? now;
          entry.schemaVersion = 1;
          delete entry.breakMinutes;
        });

        const sessionsTable = tx.table("sessions");
        await sessionsTable.toCollection().modify((entry: Record<string, unknown>) => {
          const legacy = entry as LegacySession;
          const endedAt = legacy.endedAt ?? legacy.startedAt;
          const completionReason = legacy.status === "completed"
            ? "finished"
            : legacy.status === "cancelled"
              ? "abandoned"
              : "user_stopped";

          entry.scheduleEntryId = legacy.scheduleEntryId ?? null;
          entry.freeTaskTitle = entry.freeTaskTitle ?? null;
          entry.sessionType = entry.sessionType ?? "focus";
          entry.endedAt = endedAt;
          entry.elapsedSeconds = legacy.elapsedSeconds ?? legacy.durationSec ?? 0;
          entry.completed = legacy.status === "completed";
          entry.completionReason = entry.completed ? "finished" : completionReason;
          entry.localDateKey = getLocalDateKey(legacy.startedAt);
          entry.createdAt = typeof entry.createdAt === "string" ? entry.createdAt : endedAt;
          entry.schemaVersion = 1;
          delete entry.durationSec;
          delete entry.status;
        });
      });
  }
}

export const db = new AppDb();
