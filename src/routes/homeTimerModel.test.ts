import { describe, expect, it } from "vitest";
import {
  advanceTimerPhase,
  createInitialTimer,
  formatClock,
  getPhaseLabel,
  toDurationSeconds,
} from "./homeTimerModel";
import { DEFAULT_SETTINGS } from "@/repositories/LocalStateRepository";

describe("homeTimerModel", () => {
  it("creates an initial focus timer from settings", () => {
    const timer = createInitialTimer(DEFAULT_SETTINGS);

    expect(timer.phase).toBe("focus");
    expect(timer.remainingSeconds).toBe(DEFAULT_SETTINGS.focusMinutes * 60);
    expect(timer.totalSeconds).toBe(DEFAULT_SETTINGS.focusMinutes * 60);
    expect(timer.completedFocusSessions).toBe(0);
  });

  it("moves from focus into a short break and emits a focus completion signal", () => {
    const { next, signal } = advanceTimerPhase(
      {
        phase: "focus",
        totalSeconds: toDurationSeconds(DEFAULT_SETTINGS.focusMinutes),
        remainingSeconds: 0,
        completedFocusSessions: 0,
      },
      DEFAULT_SETTINGS,
    );

    expect(next.phase).toBe("break");
    expect(next.remainingSeconds).toBe(DEFAULT_SETTINGS.breakMinutes * 60);
    expect(next.completedFocusSessions).toBe(1);
    expect(signal.kind).toBe("focus-complete");
    expect(signal.title).toContain("집중");
  });

  it("moves from focus into a long break when the cycle threshold is reached", () => {
    const { next } = advanceTimerPhase(
      {
        phase: "focus",
        totalSeconds: toDurationSeconds(DEFAULT_SETTINGS.focusMinutes),
        remainingSeconds: 0,
        completedFocusSessions: DEFAULT_SETTINGS.longBreakEvery - 1,
      },
      DEFAULT_SETTINGS,
    );

    expect(next.phase).toBe("break");
    expect(next.remainingSeconds).toBe(DEFAULT_SETTINGS.longBreakMinutes * 60);
    expect(next.completedFocusSessions).toBe(DEFAULT_SETTINGS.longBreakEvery);
  });

  it("moves from break back into focus and emits a break completion signal", () => {
    const { next, signal } = advanceTimerPhase(
      {
        phase: "break",
        totalSeconds: toDurationSeconds(DEFAULT_SETTINGS.breakMinutes),
        remainingSeconds: 0,
        completedFocusSessions: 2,
      },
      DEFAULT_SETTINGS,
    );

    expect(next.phase).toBe("focus");
    expect(next.remainingSeconds).toBe(DEFAULT_SETTINGS.focusMinutes * 60);
    expect(next.completedFocusSessions).toBe(2);
    expect(signal.kind).toBe("break-complete");
    expect(signal.title).toContain("휴식");
  });

  it("formats timer text and phase labels for the screen", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(getPhaseLabel("focus", false)).toBe("집중 시간");
    expect(getPhaseLabel("break", true)).toBe("잠깐 멈췄어요");
  });
});
