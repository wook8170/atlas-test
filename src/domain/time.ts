import type { WeeklyScheduleEntry } from "@/domain/types";

export const WEEKDAY_LABELS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function minutesToClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${minutes}`.padStart(2, "0")}`;
}

export function clockToMinutes(clock: string): number {
  const [rawHours = "0", rawMinutes = "0"] = clock.split(":");
  return Number(rawHours) * 60 + Number(rawMinutes);
}

export function sortScheduleEntries(
  entries: WeeklyScheduleEntry[],
): WeeklyScheduleEntry[] {
  return [...entries].sort(
    (left, right) =>
      left.weekday - right.weekday || left.startMinute - right.startMinute,
  );
}

export function getCurrentScheduleEntry(
  entries: WeeklyScheduleEntry[],
  now: Date,
): WeeklyScheduleEntry | undefined {
  const weekday = now.getDay() as WeeklyScheduleEntry["weekday"];
  const minute = now.getHours() * 60 + now.getMinutes();
  return entries.find(
    (entry) =>
      entry.weekday === weekday &&
      entry.startMinute <= minute &&
      entry.endMinute > minute,
  );
}
