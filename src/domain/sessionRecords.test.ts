import { describe, expect, it } from "vitest";
import {
  buildSessionHistoryItems,
  buildTodaySummary,
  resolveSessionSubject,
} from "./sessionRecords";
import type { PomodoroSession, WeeklyScheduleEntry } from "./types";

const scheduleEntries: WeeklyScheduleEntry[] = [
  {
    id: "math",
    weekday: 1,
    startMinute: 540,
    endMinute: 590,
    subject: "수학",
    color: "#ffd166",
    schemaVersion: 1,
  },
  {
    id: "science",
    weekday: 1,
    startMinute: 600,
    endMinute: 650,
    subject: "과학",
    color: "#8ecae6",
    schemaVersion: 1,
  },
];

function createSession(
  overrides: Partial<PomodoroSession> & Pick<PomodoroSession, "id">,
): PomodoroSession {
  return {
    id: overrides.id,
    startedAt: overrides.startedAt ?? "2026-05-13T09:00:00+09:00",
    endedAt: overrides.endedAt ?? "2026-05-13T09:25:00+09:00",
    durationSec: overrides.durationSec ?? 1500,
    status: overrides.status ?? "completed",
    scheduleEntryId: overrides.scheduleEntryId,
    subjectSnapshot: overrides.subjectSnapshot,
    freeTaskTitle: overrides.freeTaskTitle,
    localDateKey: overrides.localDateKey,
    sessionType: overrides.sessionType,
    schemaVersion: 1,
  };
}

describe("sessionRecords", () => {
  it("prefers subject snapshot and free task labels before schedule lookup", () => {
    const scheduleById = new Map(scheduleEntries.map((entry) => [entry.id, entry]));

    expect(
      resolveSessionSubject(
        createSession({
          id: "snapshot",
          scheduleEntryId: "math",
          subjectSnapshot: "수학 복습",
        }),
        scheduleById,
      ),
    ).toBe("수학 복습");

    expect(
      resolveSessionSubject(
        createSession({
          id: "free-task",
          freeTaskTitle: "독서 시간",
        }),
        scheduleById,
      ),
    ).toBe("독서 시간");

    expect(
      resolveSessionSubject(
        createSession({
          id: "missing-entry",
          scheduleEntryId: "unknown",
        }),
        scheduleById,
      ),
    ).toBe("연결 과목 없음");
  });

  it("builds today summary from completed focus sessions only", () => {
    const summary = buildTodaySummary({
      dateKey: "2026-05-13",
      scheduleEntries,
      sessions: [
        createSession({ id: "math-1", scheduleEntryId: "math", localDateKey: "2026-05-13" }),
        createSession({
          id: "reading",
          subjectSnapshot: "독서",
          localDateKey: "2026-05-13",
          durationSec: 1200,
        }),
        createSession({
          id: "interrupted",
          scheduleEntryId: "science",
          localDateKey: "2026-05-13",
          status: "interrupted",
        }),
        createSession({
          id: "yesterday",
          scheduleEntryId: "science",
          localDateKey: "2026-05-12",
        }),
        createSession({
          id: "break",
          localDateKey: "2026-05-13",
          durationSec: 300,
          sessionType: "short-break",
        }),
      ],
    });

    expect(summary.completedSessions).toBe(2);
    expect(summary.totalFocusSeconds).toBe(2700);
    expect(summary.totalFocusMinutes).toBe(45);
    expect(summary.bySubject).toEqual([
      { subject: "독서", count: 1 },
      { subject: "수학", count: 1 },
    ]);
  });

  it("builds recent history in reverse chronological order and filters break sessions", () => {
    const recent = buildSessionHistoryItems({
      scheduleEntries,
      limit: 2,
      sessions: [
        createSession({
          id: "oldest",
          scheduleEntryId: "math",
          localDateKey: "2026-05-12",
          startedAt: "2026-05-12T08:00:00+09:00",
          endedAt: "2026-05-12T08:25:00+09:00",
        }),
        createSession({
          id: "latest",
          scheduleEntryId: "science",
          localDateKey: "2026-05-13",
          startedAt: "2026-05-13T11:00:00+09:00",
          endedAt: "2026-05-13T11:25:00+09:00",
        }),
        createSession({
          id: "snapshot",
          subjectSnapshot: "국어 읽기",
          localDateKey: "2026-05-13",
          startedAt: "2026-05-13T09:00:00+09:00",
          endedAt: "2026-05-13T09:20:00+09:00",
          durationSec: 1200,
        }),
        createSession({
          id: "break",
          localDateKey: "2026-05-13",
          startedAt: "2026-05-13T11:30:00+09:00",
          endedAt: "2026-05-13T11:35:00+09:00",
          durationSec: 300,
          sessionType: "short-break",
        }),
      ],
    });

    expect(recent).toHaveLength(2);
    expect(recent.map((item) => item.id)).toEqual(["latest", "snapshot"]);
    expect(recent[0].subject).toBe("과학");
    expect(recent[1].subject).toBe("국어 읽기");
  });
});
