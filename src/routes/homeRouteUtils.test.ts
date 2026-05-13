import { describe, expect, it } from "vitest";
import type { WeeklyScheduleEntry } from "@/domain/types";
import {
  describeEntryTiming,
  findClosestEntry,
  formatScheduleWindow,
  isEntryInProgress,
} from "./homeRouteUtils";

const mathEntry: WeeklyScheduleEntry = {
  id: "math",
  weekday: 3,
  order: 1,
  startMinute: 540,
  endMinute: 590,
  subjectName: "수학",
  subjectColor: "#f59e0b",
  isActive: true,
  schemaVersion: 1,
};

const scienceEntry: WeeklyScheduleEntry = {
  id: "science",
  weekday: 3,
  order: 2,
  startMinute: 610,
  endMinute: 660,
  subjectName: "과학",
  subjectColor: "#22c55e",
  isActive: true,
  schemaVersion: 1,
};

describe("findClosestEntry", () => {
  it("prefers a block that is currently in progress", () => {
    const closest = findClosestEntry([mathEntry, scienceEntry], 560);
    expect(closest?.id).toBe("math");
    expect(isEntryInProgress(mathEntry, 560)).toBe(true);
  });

  it("returns the nearest upcoming block while between classes", () => {
    const closest = findClosestEntry([mathEntry, scienceEntry], 600);
    expect(closest?.id).toBe("science");
  });

  it("breaks equal-distance ties in favor of the upcoming block", () => {
    const koreanEntry: WeeklyScheduleEntry = {
      ...mathEntry,
      id: "korean",
      order: 0,
      subjectName: "국어",
      startMinute: 480,
      endMinute: 530,
    };

    const closest = findClosestEntry([koreanEntry, scienceEntry], 570);
    expect(closest?.id).toBe("science");
  });
});

describe("schedule labels", () => {
  it("describes whether a block is current or upcoming", () => {
    expect(describeEntryTiming(mathEntry, 560)).toBe("지금 진행 중");
    expect(describeEntryTiming(scienceEntry, 600)).toBe("10분 뒤 시작");
  });

  it("renders a schedule window label", () => {
    expect(formatScheduleWindow(mathEntry)).toBe("09:00 - 09:50");
  });
});
