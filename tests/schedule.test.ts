import { describe, expect, it } from "vitest";
import {
  assignDisplayOrderByTime,
  compactDisplayOrder,
  migrateLegacyScheduleEntries,
  normalizeScheduleEntry,
  ScheduleValidationError,
  validateScheduleEntries,
} from "@/domain/schedule";

describe("schedule domain rules", () => {
  it("migrates legacy rows into v2 schedule entries", () => {
    const migrated = migrateLegacyScheduleEntries([
      {
        id: "late",
        weekday: 1,
        startMinute: 600,
        endMinute: 650,
        subject: "수학",
        color: "sky",
        schemaVersion: 1,
      },
      {
        id: "early",
        weekday: 1,
        startMinute: 540,
        endMinute: 590,
        subject: "국어",
        color: "mint",
        schemaVersion: 1,
      },
    ]);

    expect(migrated).toEqual([
      {
        id: "early",
        weekday: 1,
        periodLabel: "1교시",
        subject: "국어",
        startMinute: 540,
        endMinute: 590,
        colorId: "mint",
        displayOrder: 0,
        schemaVersion: 2,
      },
      {
        id: "late",
        weekday: 1,
        periodLabel: "2교시",
        subject: "수학",
        startMinute: 600,
        endMinute: 650,
        colorId: "sky",
        displayOrder: 1,
        schemaVersion: 2,
      },
    ]);
  });

  it("rejects overlapping schedule ranges within a weekday", () => {
    expect(() =>
      validateScheduleEntries([
        normalizeScheduleEntry({
          id: "a",
          weekday: 2,
          periodLabel: "1교시",
          subject: "사회",
          startMinute: 540,
          endMinute: 600,
          colorId: "orange",
          displayOrder: 0,
        }),
        normalizeScheduleEntry({
          id: "b",
          weekday: 2,
          periodLabel: "2교시",
          subject: "과학",
          startMinute: 590,
          endMinute: 650,
          colorId: "green",
          displayOrder: 1,
        }),
      ]),
    ).toThrow(ScheduleValidationError);
  });

  it("rebuilds display order from time order when omitted", () => {
    const reordered = assignDisplayOrderByTime([
      {
        id: "second",
        weekday: 4,
        periodLabel: "2교시",
        subject: "영어",
        startMinute: 600,
        endMinute: 650,
        colorId: "blue",
      },
      {
        id: "first",
        weekday: 4,
        periodLabel: "1교시",
        subject: "체육",
        startMinute: 540,
        endMinute: 590,
        colorId: "red",
      },
    ]);

    expect(reordered.map((entry) => entry.id)).toEqual(["first", "second"]);
    expect(reordered.map((entry) => entry.displayOrder)).toEqual([0, 1]);
  });

  it("compacts display order without changing relative order", () => {
    const compacted = compactDisplayOrder([
      normalizeScheduleEntry({
        id: "a",
        weekday: 3,
        periodLabel: "1교시",
        subject: "국어",
        startMinute: 540,
        endMinute: 590,
        colorId: "red",
        displayOrder: 0,
      }),
      normalizeScheduleEntry({
        id: "c",
        weekday: 3,
        periodLabel: "3교시",
        subject: "미술",
        startMinute: 660,
        endMinute: 710,
        colorId: "yellow",
        displayOrder: 2,
      }),
    ]);

    expect(compacted.map((entry) => entry.displayOrder)).toEqual([0, 1]);
    expect(compacted.map((entry) => entry.id)).toEqual(["a", "c"]);
  });
});
