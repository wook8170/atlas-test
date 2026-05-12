import { describe, expect, it } from "vitest";
import type {
  PomodoroSession,
  PomodoroSettings,
  WeeklyScheduleEntry,
} from "@/domain/types";
import { buildHomeDashboard, buildTodayAgenda, formatRemainingTime } from "./homeDashboard";

const settings: PomodoroSettings = {
  id: "default",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  schemaVersion: 1,
};

const entries: WeeklyScheduleEntry[] = [
  {
    id: "math",
    weekday: 2,
    startMinute: 540,
    endMinute: 600,
    subject: "수학",
    color: "#4A90E2",
    schemaVersion: 1,
  },
  {
    id: "science",
    weekday: 2,
    startMinute: 610,
    endMinute: 660,
    subject: "과학",
    color: "#40B38A",
    schemaVersion: 1,
  },
];

describe("home dashboard helpers", () => {
  it("marks current agenda blocks and keeps time order", () => {
    const agenda = buildTodayAgenda({
      entries,
      settings,
      sessions: [],
      now: new Date("2026-05-12T09:15:00+09:00"),
    });

    expect(agenda.map((item) => item.subject)).toEqual(["수학", "과학"]);
    expect(agenda[0]?.status).toBe("in_progress");
    expect(agenda[1]?.status).toBe("upcoming");
    expect(agenda[0]?.timeRangeLabel).toBe("09:00-10:00");
  });

  it("switches the summary panel to completed after all agenda items are done", () => {
    const sessions: PomodoroSession[] = [
      {
        id: "s-1",
        scheduleEntryId: "math",
        startedAt: "2026-05-12T09:00:00+09:00",
        endedAt: "2026-05-12T09:25:00+09:00",
        durationSec: 1500,
        status: "completed",
        schemaVersion: 1,
      },
      {
        id: "s-2",
        scheduleEntryId: "science",
        startedAt: "2026-05-12T10:10:00+09:00",
        endedAt: "2026-05-12T10:35:00+09:00",
        durationSec: 1500,
        status: "completed",
        schemaVersion: 1,
      },
    ];

    const view = buildHomeDashboard({
      settings,
      entries,
      sessions,
      now: new Date("2026-05-12T11:00:00+09:00"),
    });

    expect(view.state.mode).toBe("completed");
    expect(view.state.chipLabel).toBe("완료");
    expect(view.progressLabel).toBe("2/2 완료");
  });

  it("falls back to ready mode and default focus time when no schedule exists", () => {
    const view = buildHomeDashboard({
      settings,
      entries: [],
      sessions: [],
      now: new Date("2026-05-12T08:00:00+09:00"),
    });

    expect(view.hasAgenda).toBe(false);
    expect(view.state.mode).toBe("ready");
    expect(view.state.remainingLabel).toBe(formatRemainingTime(1500));
  });
});
