import { describe, expect, it } from "vitest";
import { buildTodaySummary, isCompletedFocusSession, sortSessionsNewestFirst } from "./sessionUtils";
import type { PomodoroSession } from "./types";

function createSession(overrides: Partial<PomodoroSession>): PomodoroSession {
  return {
    id: "session-1",
    sessionType: "focus",
    label: "수학",
    startedAt: "2026-05-11T09:00",
    endedAt: "2026-05-11T09:25",
    durationSec: 1500,
    status: "completed",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("sessionUtils", () => {
  it("counts only completed focus sessions in today summary", () => {
    const summary = buildTodaySummary("2026-05-11", [
      createSession({ id: "1", label: "수학" }),
      createSession({ id: "2", label: "영어", status: "interrupted" }),
      createSession({ id: "3", label: "휴식", sessionType: "short-break" }),
      createSession({ id: "4", label: "수학", durationSec: 1800 }),
    ]);

    expect(summary.completedSessions).toBe(2);
    expect(summary.totalFocusMinutes).toBe(55);
    expect(summary.byLabel).toEqual([{ label: "수학", count: 2 }]);
  });

  it("detects completed focus sessions for quick filtering", () => {
    expect(isCompletedFocusSession(createSession({ status: "completed" }))).toBe(true);
    expect(isCompletedFocusSession(createSession({ status: "cancelled" }))).toBe(false);
    expect(isCompletedFocusSession(createSession({ sessionType: "long-break" }))).toBe(false);
  });

  it("sorts newest sessions first by local timestamp string", () => {
    const sessions = sortSessionsNewestFirst([
      createSession({ id: "1", startedAt: "2026-05-11T08:00" }),
      createSession({ id: "2", startedAt: "2026-05-11T12:00" }),
      createSession({ id: "3", startedAt: "2026-05-11T10:30" }),
    ]);

    expect(sessions.map((session) => session.id)).toEqual(["2", "3", "1"]);
  });
});
