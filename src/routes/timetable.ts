import type { WeeklyScheduleEntry } from "@/domain/types";

export const WEEKDAYS = [
  { value: 1, shortLabel: "월", fullLabel: "월요일" },
  { value: 2, shortLabel: "화", fullLabel: "화요일" },
  { value: 3, shortLabel: "수", fullLabel: "수요일" },
  { value: 4, shortLabel: "목", fullLabel: "목요일" },
  { value: 5, shortLabel: "금", fullLabel: "금요일" },
  { value: 6, shortLabel: "토", fullLabel: "토요일" },
  { value: 0, shortLabel: "일", fullLabel: "일요일" },
] as const;

export type TimetableWeekday = (typeof WEEKDAYS)[number]["value"];
export type TimetableViewEntry = WeeklyScheduleEntry & { order: number };

export function formatTimeLabel(minute: number): string {
  const hour = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const min = (minute % 60).toString().padStart(2, "0");
  return `${hour}:${min}`;
}

export function toViewEntries(entries: WeeklyScheduleEntry[]): TimetableViewEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    order: index + 1,
  }));
}
