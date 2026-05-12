import { describe, expect, it } from "vitest";
import {
  createTimerSnapshot,
  getElapsedSec,
  getRemainingSec,
  pauseTimer,
  resumeTimer,
  snapshotToSession,
} from "./timer";

describe("timer helpers", () => {
  it("counts down from the configured total", () => {
    const start = new Date("2026-05-11T10:00:00.000Z");
    const timer = createTimerSnapshot({
      id: "session-1",
      label: "수학",
      totalSec: 1500,
      now: start,
    });

    expect(getRemainingSec(timer, new Date("2026-05-11T10:05:00.000Z"))).toBe(1200);
    expect(getElapsedSec(timer, new Date("2026-05-11T10:05:00.000Z"))).toBe(300);
  });

  it("preserves remaining time across pause and resume", () => {
    const start = new Date("2026-05-11T10:00:00.000Z");
    const timer = createTimerSnapshot({
      id: "session-2",
      label: "국어",
      totalSec: 600,
      now: start,
    });

    const paused = pauseTimer(timer, new Date("2026-05-11T10:03:30.000Z"));
    expect(getRemainingSec(paused, new Date("2026-05-11T10:05:00.000Z"))).toBe(390);

    const resumed = resumeTimer(paused, new Date("2026-05-11T10:05:00.000Z"));
    expect(getRemainingSec(resumed, new Date("2026-05-11T10:06:00.000Z"))).toBe(330);
  });

  it("creates completed sessions with the full focus duration", () => {
    const timer = createTimerSnapshot({
      id: "session-3",
      label: "자율 집중",
      totalSec: 900,
      now: new Date("2026-05-11T10:00:00.000Z"),
    });

    const session = snapshotToSession(
      timer,
      "completed",
      new Date("2026-05-11T10:15:00.000Z"),
    );

    expect(session.elapsedSeconds).toBe(900);
    expect(session.completed).toBe(true);
    expect(session.freeTaskTitle).toBe("자율 집중");
  });
});
