import { describe, expect, it } from "vitest";
import type { WeeklyScheduleEntry } from "@/domain/types";
import {
  createSessionRecord,
  formatClock,
  getDefaultScheduleEntry,
  getRemainingSeconds,
} from "./HomeRoute";

describe("HomeRoute helpers", () => {
  it("formats seconds as a mm:ss clock", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(75)).toBe("01:15");
  });

  it("prefers the current schedule block and then the next upcoming block", () => {
    const entries: WeeklyScheduleEntry[] = [
      {
        id: "math",
        weekday: 3,
        startMinute: 540,
        endMinute: 600,
        subject: "수학",
        color: "#f59e0b",
        schemaVersion: 1,
      },
      {
        id: "science",
        weekday: 3,
        startMinute: 630,
        endMinute: 690,
        subject: "과학",
        color: "#10b981",
        schemaVersion: 1,
      },
    ];

    expect(getDefaultScheduleEntry(entries, 550)?.id).toBe("math");
    expect(getDefaultScheduleEntry(entries, 615)?.id).toBe("science");
  });

  it("computes remaining seconds and stores interrupted sessions with elapsed time", () => {
    const draft = {
      id: "session-1",
      startedAt: "2026-05-13T00:00:00.000Z",
      plannedDurationSec: 1200,
      remainingAtRunStartSec: 900,
      runStartedAtMs: 1_000,
      scheduleEntryId: "math",
    };

    expect(getRemainingSeconds(draft, 61_000)).toBe(840);

    const record = createSessionRecord(draft, "interrupted", 840);
    expect(record.durationSec).toBe(360);
    expect(record.status).toBe("interrupted");
    expect(record.scheduleEntryId).toBe("math");
  });
});
