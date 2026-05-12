import type { WeeklyScheduleEntry } from "@/domain/types";

export interface CurrentOrNextScheduleEntry {
  current?: WeeklyScheduleEntry;
  next?: WeeklyScheduleEntry;
}

export function compareScheduleEntries(a: WeeklyScheduleEntry, b: WeeklyScheduleEntry): number {
  return (
    a.weekday - b.weekday ||
    a.startMinute - b.startMinute ||
    a.endMinute - b.endMinute ||
    a.subjectName.localeCompare(b.subjectName, "ko-KR")
  );
}

export function sortScheduleEntries(entries: WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
  return [...entries].sort(compareScheduleEntries);
}

export function getMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinuteLabel(minute: number): string {
  const hour = Math.floor(minute / 60);
  const minuteOfHour = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minuteOfHour).padStart(2, "0")}`;
}

export function formatEntryRange(entry: WeeklyScheduleEntry): string {
  return `${formatMinuteLabel(entry.startMinute)} - ${formatMinuteLabel(entry.endMinute)}`;
}

export function getCurrentOrNextEntry(
  entries: WeeklyScheduleEntry[],
  minuteOfDay: number,
): CurrentOrNextScheduleEntry {
  const sorted = sortScheduleEntries(entries);
  const current = sorted.find((entry) => entry.startMinute <= minuteOfDay && minuteOfDay < entry.endMinute);

  if (current) {
    return {
      current,
      next: sorted.find((entry) => entry.startMinute >= current.endMinute),
    };
  }

  return {
    next: sorted.find((entry) => entry.startMinute > minuteOfDay),
  };
}

export function getNextEntryAfterSelected(
  entries: WeeklyScheduleEntry[],
  selectedEntryId: string,
): WeeklyScheduleEntry | undefined {
  const sorted = sortScheduleEntries(entries);
  const index = sorted.findIndex((entry) => entry.id === selectedEntryId);
  return index >= 0 ? sorted[index + 1] : undefined;
}
