import { describe, expect, it } from "vitest";

import type { PomodoroSession } from "@/domain/types";
import { buildTodaySummary, shouldIncrementReward } from "@/lib/session-logic";

function createSession(
  overrides: Partial<PomodoroSession> = {},
): PomodoroSession {
  return {
    id: overrides.id ?? "session-1",
    sessionType: overrides.sessionType ?? "focus",
    scheduleEntryId: overrides.scheduleEntryId,
    freeTaskTitle: overrides.freeTaskTitle,
    subjectLabel: overrides.subjectLabel ?? "수학",
    localDateKey: overrides.localDateKey ?? "2026-05-13",
    startedAt: overrides.startedAt ?? "2026-05-13T08:00:00.000Z",
    endedAt: overrides.endedAt ?? "2026-05-13T08:15:00.000Z",
    plannedFocusMinutes: overrides.plannedFocusMinutes ?? 15,
    plannedBreakMinutes: overrides.plannedBreakMinutes ?? 5,
    durationSec: overrides.durationSec ?? 900,
    status: overrides.status ?? "completed",
    rewardEarned: overrides.rewardEarned ?? 1,
    schemaVersion: 1,
  };
}

describe("buildTodaySummary", () => {
  it("counts only completed focus sessions in completed totals", () => {
    const summary = buildTodaySummary("2026-05-13", [
      createSession({ id: "a", subjectLabel: "수학", durationSec: 900 }),
      createSession({ id: "b", subjectLabel: "영어", durationSec: 1200 }),
      createSession({
        id: "c",
        subjectLabel: "체육",
        status: "interrupted",
        rewardEarned: 0,
        durationSec: 300,
      }),
      createSession({
        id: "d",
        sessionType: "short-break",
        subjectLabel: "휴식",
        rewardEarned: 0,
        durationSec: 300,
      }),
    ]);

    expect(summary.completedSessions).toBe(2);
    expect(summary.totalFocusMinutes).toBe(35);
    expect(summary.todayStickerCount).toBe(2);
    expect(summary.bySubject).toEqual([
      { subject: "수학", count: 1 },
      { subject: "영어", count: 1 },
    ]);
  });
});

describe("shouldIncrementReward", () => {
  it("returns true for the first completed focus session reward", () => {
    expect(shouldIncrementReward(undefined, createSession())).toBe(true);
  });

  it("does not increment reward twice for the same saved session", () => {
    const existing = createSession({ id: "same-session", rewardEarned: 1 });
    const next = createSession({ id: "same-session", rewardEarned: 1 });
    expect(shouldIncrementReward(existing, next)).toBe(false);
  });
});
