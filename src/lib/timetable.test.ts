import { describe, expect, it } from "vitest";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { getScheduleValidationError, getTodayAgenda } from "@/lib/timetable";

function createEntry(overrides: Partial<WeeklyScheduleEntry>): WeeklyScheduleEntry {
  return {
    id: overrides.id ?? "entry-1",
    weekday: overrides.weekday ?? 1,
    order: overrides.order ?? 1,
    startMinute: overrides.startMinute ?? 540,
    endMinute: overrides.endMinute ?? 585,
    subjectName: overrides.subjectName ?? "수학",
    subjectColor: overrides.subjectColor ?? "#4f7cff",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-05-11T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-11T00:00:00.000Z",
    schemaVersion: 1,
  };
}

describe("getTodayAgenda", () => {
  it("현재 교시와 다음 교시, 남은 시간을 계산한다", () => {
    const entries = [
      createEntry({ id: "a", weekday: 1, order: 1, startMinute: 540, endMinute: 585, subjectName: "국어" }),
      createEntry({ id: "b", weekday: 1, order: 2, startMinute: 600, endMinute: 645, subjectName: "수학" }),
      createEntry({ id: "c", weekday: 2, order: 1, startMinute: 540, endMinute: 585, subjectName: "과학" }),
    ];

    const agenda = getTodayAgenda(entries, new Date("2026-05-11T09:20:00+09:00"));

    expect(agenda.currentEntry?.id).toBe("a");
    expect(agenda.nextEntry?.id).toBe("b");
    expect(agenda.remainingMinutes).toBe(25);
  });

  it("현재 교시가 없으면 다음 교시를 안내한다", () => {
    const entries = [
      createEntry({ id: "a", weekday: 1, order: 1, startMinute: 540, endMinute: 585, subjectName: "국어" }),
      createEntry({ id: "b", weekday: 1, order: 2, startMinute: 600, endMinute: 645, subjectName: "수학" }),
    ];

    const agenda = getTodayAgenda(entries, new Date("2026-05-11T08:30:00+09:00"));

    expect(agenda.currentEntry).toBeUndefined();
    expect(agenda.nextEntry?.id).toBe("a");
    expect(agenda.minutesUntilNext).toBe(30);
  });
});

describe("getScheduleValidationError", () => {
  it("시작 시각이 종료 시각보다 늦으면 저장을 막는다", () => {
    const error = getScheduleValidationError(
      createEntry({ startMinute: 600, endMinute: 580 }),
      [],
    );

    expect(error).toContain("시작 시각");
  });

  it("같은 요일의 교시 순서 중복을 막는다", () => {
    const error = getScheduleValidationError(
      createEntry({ id: "next", order: 2 }),
      [createEntry({ id: "prev", order: 2 })],
    );

    expect(error).toContain("교시 순서");
  });
});
