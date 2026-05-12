import type { WeeklyScheduleEntry } from "@/domain/types";

export const WEEKDAY_LABELS: Record<WeeklyScheduleEntry["weekday"], string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

export function formatMinute(minute: number): string {
  const hour = Math.floor(minute / 60);
  const minutePart = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
}

export function minuteFromTime(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

export function timeFromMinute(value: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, value));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function compareSchedules(a: WeeklyScheduleEntry, b: WeeklyScheduleEntry): number {
  return a.weekday - b.weekday || a.startMinute - b.startMinute || a.endMinute - b.endMinute;
}

export function currentWeekday(now = new Date()): WeeklyScheduleEntry["weekday"] {
  return now.getDay() as WeeklyScheduleEntry["weekday"];
}

export function localDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
