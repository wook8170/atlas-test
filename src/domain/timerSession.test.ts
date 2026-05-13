import { describe, expect, it } from "vitest";

import { migrateLegacySession, summarizeTodaySessions } from "./timerSession";

describe("migrateLegacySession", () => {
  it("maps a completed legacy session to a v2 terminal record", () => {
    expect(
      migrateLegacySession({
        id: "session-1",
        scheduleEntryId: "math-1",
        startedAt: "2026-05-13T09:00:00.000Z",
        endedAt: "2026-05-13T09:25:00.000Z",
        durationSec: 1500,
        status: "completed",
        schemaVersion: 1,
      }),
    ).toEqual({
      id: "session-1",
      sessionType: "focus",
      startedAt: "2026-05-13T09:00:00.000Z",
      expectedEndAt: "2026-05-13T09:25:00.000Z",
      actualEndAt: "2026-05-13T09:25:00.000Z",
      status: "completed",
      completed: true,
      earnedStars: 1,
      targetDurationSec: 1500,
      actualDurationSec: 1500,
      scheduleEntryId: "math-1",
      freeTaskTitle: null,
      localDateKey: "2026-05-13",
      schemaVersion: 2,
    });
  });
});

describe("summarizeTodaySessions", () => {
  it("counts only completed focus sessions toward minutes and stars", () => {
    expect(
      summarizeTodaySessions("2026-05-13", [
        {
          id: "focus-complete",
          sessionType: "focus",
          startedAt: "2026-05-13T09:00:00.000Z",
          expectedEndAt: "2026-05-13T09:25:00.000Z",
          actualEndAt: "2026-05-13T09:25:00.000Z",
          status: "completed",
          completed: true,
          earnedStars: 1,
          targetDurationSec: 1500,
          actualDurationSec: 1500,
          scheduleEntryId: "math-1",
          freeTaskTitle: null,
          localDateKey: "2026-05-13",
          schemaVersion: 2,
        },
        {
          id: "focus-cancelled",
          sessionType: "focus",
          startedAt: "2026-05-13T10:00:00.000Z",
          expectedEndAt: "2026-05-13T10:25:00.000Z",
          actualEndAt: "2026-05-13T10:10:00.000Z",
          status: "cancelled",
          completed: false,
          earnedStars: 0,
          targetDurationSec: 1500,
          actualDurationSec: 600,
          scheduleEntryId: null,
          freeTaskTitle: "자유 공부",
          localDateKey: "2026-05-13",
          schemaVersion: 2,
        },
        {
          id: "break-complete",
          sessionType: "shortBreak",
          startedAt: "2026-05-13T10:25:00.000Z",
          expectedEndAt: "2026-05-13T10:30:00.000Z",
          actualEndAt: "2026-05-13T10:30:00.000Z",
          status: "completed",
          completed: true,
          earnedStars: 0,
          targetDurationSec: 300,
          actualDurationSec: 300,
          scheduleEntryId: null,
          freeTaskTitle: null,
          localDateKey: "2026-05-13",
          schemaVersion: 2,
        },
      ]),
    ).toEqual({
      date: "2026-05-13",
      completedFocusCount: 1,
      totalFocusMinutes: 25,
      earnedStars: 1,
    });
  });
});
