import type { PomodoroSettings } from "@/domain/types";

export type TimerPhase = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "running" | "paused";

export interface TimerDurations {
  focusSec: number;
  shortBreakSec: number;
  longBreakSec: number;
  longBreakEvery: number;
}

export interface ActiveTimerSnapshot {
  schemaVersion: 1;
  phase: TimerPhase;
  status: TimerStatus;
  remainingSec: number;
  completedFocusBlocks: number;
  durations: TimerDurations;
  focusSessionId: string | null;
  focusStartedAt: string | null;
  lastSavedAt: string;
}

export interface AdvanceSnapshotResult {
  snapshot: ActiveTimerSnapshot;
  completedFocus: boolean;
}

export function createTimerDurations(settings: PomodoroSettings): TimerDurations {
  return {
    focusSec: Math.max(1, Math.round(settings.focusMinutes * 60)),
    shortBreakSec: Math.max(1, Math.round(settings.breakMinutes * 60)),
    longBreakSec: Math.max(1, Math.round(settings.longBreakMinutes * 60)),
    longBreakEvery: Math.max(1, Math.round(settings.longBreakEvery)),
  };
}

export function createActiveFocusSnapshot(
  durations: TimerDurations,
  options: {
    startedAt: string;
    focusSessionId: string;
    completedFocusBlocks?: number;
    status?: TimerStatus;
  },
): ActiveTimerSnapshot {
  return {
    schemaVersion: 1,
    phase: "focus",
    status: options.status ?? "running",
    remainingSec: durations.focusSec,
    completedFocusBlocks: options.completedFocusBlocks ?? 0,
    durations,
    focusSessionId: options.focusSessionId,
    focusStartedAt: options.startedAt,
    lastSavedAt: options.startedAt,
  };
}

export function decrementSnapshot(
  snapshot: ActiveTimerSnapshot,
  savedAt: string,
): ActiveTimerSnapshot {
  return {
    ...snapshot,
    remainingSec: Math.max(0, snapshot.remainingSec - 1),
    lastSavedAt: savedAt,
  };
}

export function advanceSnapshot(
  snapshot: ActiveTimerSnapshot,
  savedAt: string,
  nextFocusSessionId: string,
): AdvanceSnapshotResult {
  if (snapshot.phase === "focus") {
    const completedFocusBlocks = snapshot.completedFocusBlocks + 1;
    const takeLongBreak = completedFocusBlocks % snapshot.durations.longBreakEvery === 0;

    return {
      completedFocus: true,
      snapshot: {
        ...snapshot,
        phase: takeLongBreak ? "longBreak" : "shortBreak",
        status: "running",
        remainingSec: takeLongBreak
          ? snapshot.durations.longBreakSec
          : snapshot.durations.shortBreakSec,
        completedFocusBlocks,
        focusSessionId: null,
        focusStartedAt: null,
        lastSavedAt: savedAt,
      },
    };
  }

  return {
    completedFocus: false,
    snapshot: createActiveFocusSnapshot(snapshot.durations, {
      startedAt: savedAt,
      focusSessionId: nextFocusSessionId,
      completedFocusBlocks: snapshot.completedFocusBlocks,
      status: "running",
    }),
  };
}

export function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isActiveTimerSnapshot(value: unknown): value is ActiveTimerSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ActiveTimerSnapshot>;
  const phaseOk =
    candidate.phase === "focus" ||
    candidate.phase === "shortBreak" ||
    candidate.phase === "longBreak";
  const statusOk = candidate.status === "running" || candidate.status === "paused";
  const durations = candidate.durations;
  const durationsOk =
    !!durations &&
    typeof durations.focusSec === "number" &&
    typeof durations.shortBreakSec === "number" &&
    typeof durations.longBreakSec === "number" &&
    typeof durations.longBreakEvery === "number";

  return (
    candidate.schemaVersion === 1 &&
    phaseOk &&
    statusOk &&
    typeof candidate.remainingSec === "number" &&
    typeof candidate.completedFocusBlocks === "number" &&
    durationsOk &&
    (typeof candidate.focusSessionId === "string" || candidate.focusSessionId === null) &&
    (typeof candidate.focusStartedAt === "string" || candidate.focusStartedAt === null) &&
    typeof candidate.lastSavedAt === "string"
  );
}
