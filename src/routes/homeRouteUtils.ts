import type { WeeklyScheduleEntry } from "@/domain/types";

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinuteLabel(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatScheduleWindow(entry: WeeklyScheduleEntry): string {
  return `${formatMinuteLabel(entry.startMinute)} - ${formatMinuteLabel(entry.endMinute)}`;
}

export function isEntryInProgress(
  entry: WeeklyScheduleEntry,
  currentMinute: number,
): boolean {
  return currentMinute >= entry.startMinute && currentMinute < entry.endMinute;
}

export function entryDistance(
  entry: WeeklyScheduleEntry,
  currentMinute: number,
): number {
  if (isEntryInProgress(entry, currentMinute)) return 0;
  if (currentMinute < entry.startMinute) return entry.startMinute - currentMinute;
  return currentMinute - entry.endMinute;
}

function compareEntries(
  a: WeeklyScheduleEntry,
  b: WeeklyScheduleEntry,
  currentMinute: number,
): number {
  const aIsCurrent = isEntryInProgress(a, currentMinute);
  const bIsCurrent = isEntryInProgress(b, currentMinute);
  if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;

  const distanceDiff =
    entryDistance(a, currentMinute) - entryDistance(b, currentMinute);
  if (distanceDiff !== 0) return distanceDiff;

  const aUpcoming = a.startMinute >= currentMinute;
  const bUpcoming = b.startMinute >= currentMinute;
  if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

  return a.startMinute - b.startMinute || (a.order ?? 0) - (b.order ?? 0);
}

export function findClosestEntry(
  entries: WeeklyScheduleEntry[],
  currentMinute: number,
): WeeklyScheduleEntry | undefined {
  return entries
    .filter((entry) => entry.isActive !== false)
    .slice()
    .sort((a, b) => compareEntries(a, b, currentMinute))[0];
}

export function describeEntryTiming(
  entry: WeeklyScheduleEntry,
  currentMinute: number,
): string {
  if (isEntryInProgress(entry, currentMinute)) return "지금 진행 중";
  if (currentMinute < entry.startMinute) {
    return `${entry.startMinute - currentMinute}분 뒤 시작`;
  }
  return `${currentMinute - entry.endMinute}분 전에 끝남`;
}
