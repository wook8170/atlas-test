import { describe, expect, it } from "vitest";
import {
  getCurrentOrNextEntry,
  getNextEntryAfterSelected,
  sortScheduleEntries,
} from "./schedule";
import type { WeeklyScheduleEntry } from "./types";

const ENTRIES: WeeklyScheduleEntry[] = [
  {
    id: "science",
    weekday: 1,
    startMinute: 11 * 60,
    endMinute: 11 * 60 + 40,
    subjectName: "과학",
    subjectColor: "#90be6d",
    isActive: true,
    schemaVersion: 1,
  },
  {
    id: "math",
    weekday: 1,
    startMinute: 9 * 60,
    endMinute: 9 * 60 + 40,
    subjectName: "수학",
    subjectColor: "#ffb703",
    isActive: true,
    schemaVersion: 1,
  },
  {
    id: "korean",
    weekday: 1,
    startMinute: 10 * 60,
    endMinute: 10 * 60 + 40,
    subjectName: "국어",
    subjectColor: "#8ecae6",
    isActive: true,
    schemaVersion: 1,
  },
];

describe("schedule helpers", () => {
  it("sorts entries by weekday and start minute", () => {
    expect(sortScheduleEntries(ENTRIES).map((entry) => entry.id)).toEqual([
      "math",
      "korean",
      "science",
    ]);
  });

  it("finds the current entry and the next entry", () => {
    const result = getCurrentOrNextEntry(ENTRIES, 9 * 60 + 15);

    expect(result.current?.id).toBe("math");
    expect(result.next?.id).toBe("korean");
  });

  it("finds the next entry before the day starts", () => {
    const result = getCurrentOrNextEntry(ENTRIES, 8 * 60 + 30);

    expect(result.current).toBeUndefined();
    expect(result.next?.id).toBe("math");
  });

  it("returns no next entry after the last class", () => {
    const result = getCurrentOrNextEntry(ENTRIES, 12 * 60);

    expect(result.current).toBeUndefined();
    expect(result.next).toBeUndefined();
  });

  it("finds the next entry after a selected class", () => {
    expect(getNextEntryAfterSelected(ENTRIES, "korean")?.id).toBe("science");
    expect(getNextEntryAfterSelected(ENTRIES, "science")).toBeUndefined();
  });
});
