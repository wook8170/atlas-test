import { describe, expect, it } from "vitest";
import { buildTodaySummary, getLocalDateKey, resolveSessionLabel } from "./sessionSummary";
import type { SessionRecord, WeeklyScheduleEntry } from "./types";

const scheduleEntries: WeeklyScheduleEntry[] = [
  {
    id: "schedule-1",
    weekday: 1,
    startMinute: 540,
    endMinute: 590,
    subjectName: "수학",
    subjectColor: "#3566e2",
    isActive: true,
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
    schemaVersion: 1,
  },
];

describe("sessionSummary", () => {
  it("keeps free task names in today's summary and counts interruptions separately", () => {
    const sessions: SessionRecord[] = [
      {
        id: "session-1",
        scheduleEntryId: null,
        freeTaskTitle: "독서",
        sessionType: "focus",
        startedAt: "2026-05-11T09:00:00.000Z",
        endedAt: "2026-05-11T09:25:00.000Z",
        elapsedSeconds: 1500,
        completed: true,
        completionReason: "finished",
        localDateKey: "2026-05-11",
        createdAt: "2026-05-11T09:25:00.000Z",
        schemaVersion: 1,
      },
      {
        id: "session-2",
        scheduleEntryId: null,
        freeTaskTitle: "독서",
        sessionType: "focus",
        startedAt: "2026-05-11T10:00:00.000Z",
        endedAt: "2026-05-11T10:10:00.000Z",
        elapsedSeconds: 600,
        completed: false,
        completionReason: "user_stopped",
        localDateKey: "2026-05-11",
        createdAt: "2026-05-11T10:10:00.000Z",
        schemaVersion: 1,
      },
    ];

    expect(buildTodaySummary("2026-05-11", sessions, scheduleEntries)).toEqual({
      date: "2026-05-11",
      completedSessions: 1,
      totalFocusMinutes: 35,
      totalFocusSeconds: 2100,
      bySubject: [{ subject: "독서", count: 2 }],
    });
  });

  it("resolves schedule-based session labels and local date keys", () => {
    const session: SessionRecord = {
      id: "session-3",
      scheduleEntryId: "schedule-1",
      freeTaskTitle: null,
      sessionType: "focus",
      startedAt: "2026-05-11T08:30:00.000Z",
      endedAt: "2026-05-11T08:55:00.000Z",
      elapsedSeconds: 1500,
      completed: true,
      completionReason: "finished",
      localDateKey: "2026-05-11",
      createdAt: "2026-05-11T08:55:00.000Z",
      schemaVersion: 1,
    };

    expect(resolveSessionLabel(session, new Map([["schedule-1", "수학"]]))).toBe("수학");
    expect(getLocalDateKey("2026-05-11T08:30:00.000Z")).toBe("2026-05-11");
  });
});
