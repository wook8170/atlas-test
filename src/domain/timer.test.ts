import { describe, expect, it } from "vitest";
import {
  createFocusTimerSnapshot,
  getElapsedSeconds,
  getRemainingSeconds,
  pauseActiveTimer,
  resumeActiveTimer,
} from "@/domain/timer";

describe("timer snapshot restore", () => {
  it("adds running time after refresh from the stored start timestamp", () => {
    const snapshot = createFocusTimerSnapshot(
      {
        durationMinutes: 25,
        label: "수학",
        scheduleEntryId: "math",
      },
      Date.parse("2026-05-12T09:00:00.000Z"),
    );

    expect(
      getElapsedSeconds(snapshot, Date.parse("2026-05-12T09:05:30.000Z")),
    ).toBe(330);
    expect(
      getRemainingSeconds(snapshot, Date.parse("2026-05-12T09:05:30.000Z")),
    ).toBe(1170);
  });

  it("stops counting while paused and resumes from the stored elapsed value", () => {
    const started = createFocusTimerSnapshot(
      {
        durationMinutes: 10,
        label: "국어",
        scheduleEntryId: "kor",
      },
      Date.parse("2026-05-12T09:00:00.000Z"),
    );

    const paused = pauseActiveTimer(
      started,
      Date.parse("2026-05-12T09:02:00.000Z"),
    );
    expect(
      getElapsedSeconds(paused, Date.parse("2026-05-12T09:07:00.000Z")),
    ).toBe(120);

    const resumed = resumeActiveTimer(
      paused,
      Date.parse("2026-05-12T09:08:00.000Z"),
    );
    expect(
      getElapsedSeconds(resumed, Date.parse("2026-05-12T09:09:30.000Z")),
    ).toBe(210);
  });
});
