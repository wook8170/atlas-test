import { describe, expect, it } from "vitest";
import { buildTodaySummary, isCompletedFocusSession, sortSessionsNewestFirst } from "./sessionUtils";
import type { SessionRecord } from "./types";

function createSession(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: "session-1",
    scheduleEntryId: null,
    freeTaskTitle: "수학",
    sessionType: "focus",
    startedAt: "2026-05-11T09:00",
    endedAt: "2026-05-11T09:25",
    completed: true,
    localDateKey: "2026-05-11",
    createdAt: "2026-05-11T09:25",
    elapsedSeconds: 1500,
    completionReason: "finished",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("sessionUtils", () => {
  it("counts only completed focus sessions in today summary", () => {
    const summary = buildTodaySummary("2026-05-11", [
      createSession({ id: "1", freeTaskTitle: "수학" }),
      createSession({ id: "2", freeTaskTitle: "영어", completed: false, completionReason: "user_stopped" }),
      createSession({ id: "3", freeTaskTitle: null, sessionType: "short-break", completed: true }),
      createSession({ id: "4", freeTaskTitle: "수학", elapsedSeconds: 1800 }),
    ]);

    expect(summary.completedSessions).toBe(2);
    expect(summary.totalFocusMinutes).toBe(55);
    expect(summary.bySubject).toEqual([{ subject: "수학", count: 2 }]);
  });

  it("detects completed focus sessions for quick filtering", () => {
    expect(isCompletedFocusSession(createSession({ completed: true }))).toBe(true);
    expect(isCompletedFocusSession(createSession({ completed: false }))).toBe(false);
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
