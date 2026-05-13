import type { WeeklyScheduleEntry } from "@/domain/types";

export interface TimetableDraft {
  weekday: WeeklyScheduleEntry["weekday"];
  subject: string;
  startTime: string;
  endTime: string;
  color: string;
}

export const WEEKDAY_OPTIONS: Array<{
  value: WeeklyScheduleEntry["weekday"];
  label: string;
}> = [
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
  { value: 0, label: "일요일" },
];

export const DEFAULT_TIMETABLE_DRAFT: TimetableDraft = {
  weekday: 1,
  subject: "",
  startTime: "",
  endTime: "",
  color: "#4f7cff",
};

function parseTime(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function validateTimetableDraft(draft: TimetableDraft): string | null {
  if (!draft.subject.trim()) {
    return "과목명을 입력해야 저장할 수 있어요.";
  }

  if (!draft.startTime || !draft.endTime) {
    return "시작 시각과 종료 시각을 모두 입력해야 저장할 수 있어요.";
  }

  const startMinute = parseTime(draft.startTime);
  const endMinute = parseTime(draft.endTime);

  if (startMinute === null || endMinute === null) {
    return "시간 형식을 다시 확인해 주세요.";
  }

  if (endMinute <= startMinute) {
    return "종료 시각은 시작 시각보다 늦어야 해요.";
  }

  return null;
}

export function toWeeklyScheduleEntry(
  draft: TimetableDraft,
  id?: WeeklyScheduleEntry["id"],
): WeeklyScheduleEntry {
  const startMinute = parseTime(draft.startTime);
  const endMinute = parseTime(draft.endTime);

  if (startMinute === null || endMinute === null) {
    throw new Error("Cannot convert invalid timetable draft.");
  }

  return {
    id: id ?? crypto.randomUUID(),
    weekday: draft.weekday,
    startMinute,
    endMinute,
    subject: draft.subject.trim(),
    color: draft.color,
    schemaVersion: 1,
  };
}

export function toTimetableDraft(entry: WeeklyScheduleEntry): TimetableDraft {
  return {
    weekday: entry.weekday,
    subject: entry.subject,
    startTime: formatMinutes(entry.startMinute),
    endTime: formatMinutes(entry.endMinute),
    color: entry.color,
  };
}

export function sortScheduleEntries(
  entries: WeeklyScheduleEntry[],
): WeeklyScheduleEntry[] {
  return [...entries].sort((left, right) => {
    const leftWeekday = left.weekday === 0 ? 7 : left.weekday;
    const rightWeekday = right.weekday === 0 ? 7 : right.weekday;

    if (leftWeekday !== rightWeekday) {
      return leftWeekday - rightWeekday;
    }

    if (left.startMinute !== right.startMinute) {
      return left.startMinute - right.startMinute;
    }

    return left.subject.localeCompare(right.subject);
  });
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}
