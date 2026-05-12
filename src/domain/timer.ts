import type {
  ActiveTimerSnapshot,
  CompletionReason,
  SessionRecord,
  TimerPhase,
} from "@/domain/types";
import { toLocalDateKey } from "@/domain/time";

type CreateFocusTimerInput = {
  durationMinutes: number;
  label: string;
  scheduleEntryId?: string | null;
};

const SECOND_MS = 1000;

export function getPhaseLabel(phase: TimerPhase): string {
  switch (phase) {
    case "short-break":
      return "짧은 쉬는 시간";
    case "long-break":
      return "긴 쉬는 시간";
    default:
      return "집중 시간";
  }
}

export function createFocusTimerSnapshot(
  input: CreateFocusTimerInput,
  nowMs = Date.now(),
): ActiveTimerSnapshot {
  return {
    id: "active",
    phase: "focus",
    label: input.label,
    scheduleEntryId: input.scheduleEntryId ?? null,
    startedAt: new Date(nowMs).toISOString(),
    elapsedSec: 0,
    targetDurationSec: input.durationMinutes * 60,
    pausedAt: null,
    cycleIndex: 1,
    schemaVersion: 1,
  };
}

export function getElapsedSeconds(
  snapshot: ActiveTimerSnapshot,
  nowMs = Date.now(),
): number {
  if (snapshot.pausedAt) {
    return snapshot.elapsedSec;
  }
  const runningSeconds = Math.floor(
    Math.max(0, nowMs - Date.parse(snapshot.startedAt)) / SECOND_MS,
  );
  return snapshot.elapsedSec + runningSeconds;
}

export function getRemainingSeconds(
  snapshot: ActiveTimerSnapshot,
  nowMs = Date.now(),
): number {
  return Math.max(snapshot.targetDurationSec - getElapsedSeconds(snapshot, nowMs), 0);
}

export function isTimerPaused(snapshot: ActiveTimerSnapshot): boolean {
  return snapshot.pausedAt !== null;
}

export function isTimerComplete(
  snapshot: ActiveTimerSnapshot,
  nowMs = Date.now(),
): boolean {
  return getRemainingSeconds(snapshot, nowMs) === 0;
}

export function pauseActiveTimer(
  snapshot: ActiveTimerSnapshot,
  nowMs = Date.now(),
): ActiveTimerSnapshot {
  return {
    ...snapshot,
    elapsedSec: getElapsedSeconds(snapshot, nowMs),
    pausedAt: new Date(nowMs).toISOString(),
    startedAt: new Date(nowMs).toISOString(),
  };
}

export function resumeActiveTimer(
  snapshot: ActiveTimerSnapshot,
  nowMs = Date.now(),
): ActiveTimerSnapshot {
  return {
    ...snapshot,
    startedAt: new Date(nowMs).toISOString(),
    pausedAt: null,
  };
}

export function buildSessionFromSnapshot(
  snapshot: ActiveTimerSnapshot,
  status: "completed" | "interrupted" | "cancelled",
  nowMs = Date.now(),
): SessionRecord {
  const endedAt = new Date(nowMs);
  const durationSec =
    status === "completed"
      ? snapshot.targetDurationSec
      : Math.min(getElapsedSeconds(snapshot, nowMs), snapshot.targetDurationSec);

  const completionReason: CompletionReason =
    status === "completed"
      ? "finished"
      : status === "interrupted"
        ? "user_stopped"
        : "abandoned";

  return {
    id: crypto.randomUUID(),
    scheduleEntryId: snapshot.scheduleEntryId,
    freeTaskTitle: snapshot.scheduleEntryId ? null : snapshot.label,
    sessionType: snapshot.phase,
    localDateKey: toLocalDateKey(endedAt),
    startedAt: snapshot.startedAt,
    endedAt: endedAt.toISOString(),
    completed: status === "completed",
    createdAt: endedAt.toISOString(),
    elapsedSeconds: durationSec,
    completionReason,
    schemaVersion: 1,
  };
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
  }
  return `${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
}
