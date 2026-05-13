import { describe, expect, it } from "vitest";
import {
  advanceSnapshot,
  createActiveFocusSnapshot,
  createTimerDurations,
  formatRemaining,
  isActiveTimerSnapshot,
} from "@/lib/activeTimer";

describe("activeTimer helpers", () => {
  it("promotes the fourth completed focus block into a long break", () => {
    const durations = createTimerDurations({
      id: "default",
      focusMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      schemaVersion: 1,
    });
    const runningFocus = createActiveFocusSnapshot(durations, {
      startedAt: "2026-05-13T10:52:01Z",
      focusSessionId: "focus-4",
      completedFocusBlocks: 3,
    });

    const result = advanceSnapshot(runningFocus, "2026-05-13T11:17:01Z", "ignored");

    expect(result.completedFocus).toBe(true);
    expect(result.snapshot.phase).toBe("longBreak");
    expect(result.snapshot.remainingSec).toBe(durations.longBreakSec);
    expect(result.snapshot.completedFocusBlocks).toBe(4);
  });

  it("starts a fresh focus block after break completion", () => {
    const durations = createTimerDurations({
      id: "default",
      focusMinutes: 20,
      breakMinutes: 3,
      longBreakMinutes: 10,
      longBreakEvery: 4,
      schemaVersion: 1,
    });
    const onBreak = {
      schemaVersion: 1 as const,
      phase: "shortBreak" as const,
      status: "running" as const,
      remainingSec: 1,
      completedFocusBlocks: 1,
      durations,
      focusSessionId: null,
      focusStartedAt: null,
      lastSavedAt: "2026-05-13T10:52:01Z",
    };

    const result = advanceSnapshot(onBreak, "2026-05-13T10:55:01Z", "focus-2");

    expect(result.completedFocus).toBe(false);
    expect(result.snapshot.phase).toBe("focus");
    expect(result.snapshot.focusSessionId).toBe("focus-2");
    expect(result.snapshot.remainingSec).toBe(durations.focusSec);
  });

  it("guards malformed persisted snapshots", () => {
    expect(
      isActiveTimerSnapshot({
        schemaVersion: 1,
        phase: "focus",
        status: "paused",
        remainingSec: 90,
        completedFocusBlocks: 2,
        durations: {
          focusSec: 1500,
          shortBreakSec: 300,
          longBreakSec: 900,
          longBreakEvery: 4,
        },
        focusSessionId: "focus-1",
        focusStartedAt: "2026-05-13T10:00:00Z",
        lastSavedAt: "2026-05-13T10:10:00Z",
      }),
    ).toBe(true);
    expect(isActiveTimerSnapshot({ phase: "focus" })).toBe(false);
    expect(formatRemaining(65)).toBe("01:05");
  });
});
