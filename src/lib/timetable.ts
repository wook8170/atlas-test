import type { WeeklyScheduleEntry } from "@/domain/types";

export const WEEKDAY_SEQUENCE = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABELS: Record<WeeklyScheduleEntry["weekday"], string> = {
  0: "일요일",
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
  6: "토요일",
};

export const COLOR_OPTIONS = [
  { value: "#4f7cff", label: "파랑" },
  { value: "#ff8a4c", label: "주황" },
  { value: "#3bb273", label: "초록" },
  { value: "#ff5d8f", label: "분홍" },
  { value: "#8b6cf6", label: "보라" },
  { value: "#f0b429", label: "노랑" },
] as const;

export type TimetableEditorValues = {
  id?: string;
  weekday: WeeklyScheduleEntry["weekday"];
  order: number;
  subject: string;
  startMinute: number;
  endMinute: number;
  color: string;
};

export type TodayAgenda = {
  weekday: WeeklyScheduleEntry["weekday"];
  todayEntries: WeeklyScheduleEntry[];
  currentEntry?: WeeklyScheduleEntry;
  nextEntry?: WeeklyScheduleEntry;
  remainingMinutes?: number;
  minutesUntilNext?: number;
};

export function compareScheduleEntries(
  left: WeeklyScheduleEntry,
  right: WeeklyScheduleEntry,
): number {
  if (left.weekday !== right.weekday) return left.weekday - right.weekday;
  if (left.order !== right.order) return left.order - right.order;
  if (left.startMinute !== right.startMinute) return left.startMinute - right.startMinute;
  return left.subject.localeCompare(right.subject, "ko-KR");
}

export function sortScheduleEntries(entries: WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
  return [...entries].sort(compareScheduleEntries);
}

export function getNextOrder(entries: WeeklyScheduleEntry[]): number {
  return entries.reduce((maxOrder, entry) => Math.max(maxOrder, entry.order), 0) + 1;
}

export function minuteToTime(minute: number): string {
  const safeMinute = Math.min(Math.max(minute, 0), 23 * 60 + 59);
  const hour = Math.floor(safeMinute / 60)
    .toString()
    .padStart(2, "0");
  const mins = (safeMinute % 60).toString().padStart(2, "0");
  return `${hour}:${mins}`;
}

export function timeToMinute(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error(`invalid time value: ${value}`);
  }
  return hour * 60 + minute;
}

export function formatRemaining(minutes: number): string {
  const safeMinutes = Math.max(minutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

export function getTodayAgenda(
  entries: WeeklyScheduleEntry[],
  now: Date,
): TodayAgenda {
  const weekday = now.getDay() as WeeklyScheduleEntry["weekday"];
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const todayEntries = sortScheduleEntries(entries).filter((entry) => entry.weekday === weekday);

  const currentIndex = todayEntries.findIndex(
    (entry) => entry.startMinute <= minuteOfDay && minuteOfDay < entry.endMinute,
  );
  const currentEntry = currentIndex >= 0 ? todayEntries[currentIndex] : undefined;
  const nextEntry = currentEntry
    ? todayEntries[currentIndex + 1]
    : todayEntries.find((entry) => entry.startMinute > minuteOfDay);

  return {
    weekday,
    todayEntries,
    currentEntry,
    nextEntry,
    remainingMinutes: currentEntry ? currentEntry.endMinute - minuteOfDay : undefined,
    minutesUntilNext: nextEntry ? nextEntry.startMinute - minuteOfDay : undefined,
  };
}

export function getScheduleValidationError(
  values: TimetableEditorValues,
  siblings: WeeklyScheduleEntry[],
): string | null {
  if (!values.subject.trim()) {
    return "과목명을 입력해 주세요.";
  }
  if (!Number.isInteger(values.order) || values.order < 1) {
    return "교시 순서는 1 이상의 숫자여야 해요.";
  }
  if (values.startMinute >= values.endMinute) {
    return "시작 시각은 종료 시각보다 빨라야 저장할 수 있어요.";
  }
  if (siblings.some((entry) => entry.order === values.order && entry.id !== values.id)) {
    return "같은 요일의 교시 순서는 겹칠 수 없어요.";
  }
  return null;
}
