import type { PomodoroSettings } from "@/domain/types";

export type TimerPhase = "focus" | "break";
export type TimerSignalKind = "focus-complete" | "break-complete";

export interface TimerSnapshot {
  phase: TimerPhase;
  totalSeconds: number;
  remainingSeconds: number;
  completedFocusSessions: number;
}

export interface TimerSignal {
  kind: TimerSignalKind;
  title: string;
  message: string;
  accent: TimerPhase;
}

export function toDurationSeconds(minutes: number): number {
  return Math.max(1, Math.round(minutes * 60));
}

export function createInitialTimer(settings: PomodoroSettings): TimerSnapshot {
  const focusSeconds = toDurationSeconds(settings.focusMinutes);
  return {
    phase: "focus",
    totalSeconds: focusSeconds,
    remainingSeconds: focusSeconds,
    completedFocusSessions: 0,
  };
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getPhaseLabel(phase: TimerPhase, paused: boolean): string {
  if (paused) {
    return "잠깐 멈췄어요";
  }
  return phase === "focus" ? "집중 시간" : "휴식 시간";
}

export function advanceTimerPhase(
  current: TimerSnapshot,
  settings: PomodoroSettings,
): { next: TimerSnapshot; signal: TimerSignal } {
  if (current.phase === "focus") {
    const completedFocusSessions = current.completedFocusSessions + 1;
    const longBreakEvery = Math.max(1, Math.round(settings.longBreakEvery));
    const breakMinutes =
      completedFocusSessions % longBreakEvery === 0
        ? settings.longBreakMinutes
        : settings.breakMinutes;
    const breakSeconds = toDurationSeconds(breakMinutes);

    return {
      next: {
        phase: "break",
        totalSeconds: breakSeconds,
        remainingSeconds: breakSeconds,
        completedFocusSessions,
      },
      signal: {
        kind: "focus-complete",
        title: "집중 끝!",
        message: "이제 잠깐 쉬는 시간이에요.",
        accent: "break",
      },
    };
  }

  const focusSeconds = toDurationSeconds(settings.focusMinutes);
  return {
    next: {
      phase: "focus",
      totalSeconds: focusSeconds,
      remainingSeconds: focusSeconds,
      completedFocusSessions: current.completedFocusSessions,
    },
    signal: {
      kind: "break-complete",
      title: "휴식 끝!",
      message: "다음 집중을 바로 시작해요.",
      accent: "focus",
    },
  };
}
