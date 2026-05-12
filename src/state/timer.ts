import type { CompletionReason, SessionRecord } from "@/domain/types";

type TimerSnapshotBase = {
  id: string;
  label: string;
  scheduleEntryId?: string | null;
  startedAt: string;
  totalSec: number;
};

export type TimerSnapshot =
  | (TimerSnapshotBase & {
      mode: "running";
      endsAt: string;
    })
  | (TimerSnapshotBase & {
      mode: "paused";
      remainingSec: number;
    });

export function createTimerSnapshot(input: {
  id: string;
  label: string;
  scheduleEntryId?: string | null;
  totalSec: number;
  now?: Date;
}): TimerSnapshot {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    label: input.label,
    scheduleEntryId: input.scheduleEntryId,
    startedAt: now.toISOString(),
    totalSec: input.totalSec,
    mode: "running",
    endsAt: new Date(now.getTime() + input.totalSec * 1000).toISOString(),
  };
}

export function getRemainingSec(snapshot: TimerSnapshot, now = new Date()): number {
  if (snapshot.mode === "paused") {
    return Math.max(0, Math.ceil(snapshot.remainingSec));
  }

  const diffMs = new Date(snapshot.endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

export function getElapsedSec(snapshot: TimerSnapshot, now = new Date()): number {
  return Math.max(0, snapshot.totalSec - getRemainingSec(snapshot, now));
}

export function pauseTimer(snapshot: TimerSnapshot, now = new Date()): TimerSnapshot {
  if (snapshot.mode === "paused") return snapshot;
  return {
    id: snapshot.id,
    label: snapshot.label,
    scheduleEntryId: snapshot.scheduleEntryId,
    startedAt: snapshot.startedAt,
    totalSec: snapshot.totalSec,
    mode: "paused",
    remainingSec: getRemainingSec(snapshot, now),
  };
}

export function resumeTimer(snapshot: TimerSnapshot, now = new Date()): TimerSnapshot {
  if (snapshot.mode === "running") return snapshot;
  return {
    id: snapshot.id,
    label: snapshot.label,
    scheduleEntryId: snapshot.scheduleEntryId,
    startedAt: snapshot.startedAt,
    totalSec: snapshot.totalSec,
    mode: "running",
    endsAt: new Date(now.getTime() + snapshot.remainingSec * 1000).toISOString(),
  };
}

export function isExpired(snapshot: TimerSnapshot, now = new Date()): boolean {
  return snapshot.mode === "running" && getRemainingSec(snapshot, now) === 0;
}

export function snapshotToSession(
  snapshot: TimerSnapshot,
  status: "completed" | "interrupted" | "cancelled",
  endedAt = new Date(),
): SessionRecord {
  const completed = status === "completed";
  const completionReason: CompletionReason = completed
    ? "finished"
    : status === "interrupted"
      ? "user_stopped"
      : "abandoned";
  const elapsedSeconds = completed ? snapshot.totalSec : getElapsedSec(snapshot, endedAt);

  return {
    id: snapshot.id,
    scheduleEntryId: snapshot.scheduleEntryId ?? null,
    freeTaskTitle: snapshot.scheduleEntryId ? null : snapshot.label,
    sessionType: "focus",
    startedAt: snapshot.startedAt,
    endedAt: endedAt.toISOString(),
    completed,
    localDateKey: snapshot.startedAt.slice(0, 10),
    createdAt: endedAt.toISOString(),
    elapsedSeconds,
    completionReason,
    schemaVersion: 1,
  };
}

export function formatTimer(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
