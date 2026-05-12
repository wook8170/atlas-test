import { describe, expect, it } from "vitest";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { formatTimeLabel, toViewEntries } from "./timetable";

describe("timetable helpers", () => {
  it("formats minute values as HH:MM", () => {
    expect(formatTimeLabel(540)).toBe("09:00");
    expect(formatTimeLabel(665)).toBe("11:05");
  });

  it("adds 1-based order to sorted timetable entries", () => {
    const entries: WeeklyScheduleEntry[] = [
      {
        id: "mon-1",
        weekday: 1,
        startMinute: 540,
        endMinute: 580,
        subjectName: "국어",
        subjectColor: "#ffb86b",
        isActive: true,
        schemaVersion: 1,
      },
      {
        id: "mon-2",
        weekday: 1,
        startMinute: 600,
        endMinute: 640,
        subjectName: "수학",
        subjectColor: "#78d6ff",
        isActive: true,
        schemaVersion: 1,
      },
    ];

    expect(toViewEntries(entries)).toEqual([
      { ...entries[0], order: 1 },
      { ...entries[1], order: 2 },
    ]);
  });
});
