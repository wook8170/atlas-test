import type { WeeklyScheduleEntry } from "@/domain/types";

export type ScheduleWeekday = WeeklyScheduleEntry["weekday"];

export interface ScheduleEntryDraft {
  id: string;
  weekday: ScheduleWeekday;
  periodLabel: string;
  subject: string;
  startMinute: number;
  endMinute: number;
  colorId: string;
  displayOrder?: number;
}

export interface LegacyWeeklyScheduleEntry {
  id: string;
  weekday: ScheduleWeekday;
  startMinute: number;
  endMinute: number;
  subject: string;
  color?: string;
  colorId?: string;
  schemaVersion?: number;
}

export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleValidationError";
  }
}

function compareByDisplayOrder(a: WeeklyScheduleEntry, b: WeeklyScheduleEntry): number {
  return (
    a.displayOrder - b.displayOrder ||
    a.startMinute - b.startMinute ||
    a.endMinute - b.endMinute ||
    a.id.localeCompare(b.id)
  );
}

function compareByTime(
  a: Pick<WeeklyScheduleEntry, "startMinute" | "endMinute" | "id">,
  b: Pick<WeeklyScheduleEntry, "startMinute" | "endMinute" | "id">,
): number {
  return (
    a.startMinute - b.startMinute ||
    a.endMinute - b.endMinute ||
    a.id.localeCompare(b.id)
  );
}

function normalizeText(value: string): string {
  return value.trim();
}

export function normalizeScheduleEntry(
  draft: ScheduleEntryDraft,
  fallbackDisplayOrder = 0,
): WeeklyScheduleEntry {
  return {
    id: normalizeText(draft.id),
    weekday: draft.weekday,
    periodLabel: normalizeText(draft.periodLabel),
    subject: normalizeText(draft.subject),
    startMinute: draft.startMinute,
    endMinute: draft.endMinute,
    colorId: normalizeText(draft.colorId),
    displayOrder: draft.displayOrder ?? fallbackDisplayOrder,
    schemaVersion: 2,
  };
}

export function sortScheduleEntries(entries: readonly WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
  return [...entries].sort(
    (a, b) => a.weekday - b.weekday || compareByDisplayOrder(a, b),
  );
}

export function compactDisplayOrder(entries: readonly WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
  return [...entries]
    .sort(compareByDisplayOrder)
    .map((entry, index) => ({ ...entry, displayOrder: index }));
}

export function assignDisplayOrderByTime(
  entries: readonly ScheduleEntryDraft[],
): WeeklyScheduleEntry[] {
  return [...entries]
    .map((entry) => normalizeScheduleEntry(entry))
    .sort(compareByTime)
    .map((entry, index) => ({ ...entry, displayOrder: index }));
}

export function validateScheduleEntries(entries: readonly WeeklyScheduleEntry[]): void {
  const grouped = new Map<ScheduleWeekday, WeeklyScheduleEntry[]>();

  entries.forEach((entry) => {
    validateScheduleEntry(entry);
    const current = grouped.get(entry.weekday) ?? [];
    current.push(entry);
    grouped.set(entry.weekday, current);
  });

  grouped.forEach((weekdayEntries, weekday) => {
    [...weekdayEntries]
      .sort(compareByDisplayOrder)
      .forEach((entry, index) => {
        if (entry.displayOrder !== index) {
          throw new ScheduleValidationError(
            `요일 ${weekday}의 표시 순서는 0부터 끊김 없이 이어져야 합니다.`,
          );
        }
      });

    const byTime = [...weekdayEntries].sort(compareByTime);
    for (let index = 1; index < byTime.length; index += 1) {
      const previous = byTime[index - 1];
      const current = byTime[index];
      if (previous.endMinute > current.startMinute) {
        throw new ScheduleValidationError(
          `요일 ${weekday}의 시간표가 겹칩니다: ${previous.periodLabel} / ${current.periodLabel}`,
        );
      }
    }
  });
}

export function migrateLegacyScheduleEntries(
  entries: readonly LegacyWeeklyScheduleEntry[],
): WeeklyScheduleEntry[] {
  const grouped = new Map<ScheduleWeekday, ScheduleEntryDraft[]>();

  entries.forEach((entry) => {
    const current = grouped.get(entry.weekday) ?? [];
    current.push({
      id: entry.id,
      weekday: entry.weekday,
      periodLabel: "",
      subject: entry.subject,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      colorId: normalizeText(entry.colorId ?? entry.color ?? "default"),
    });
    grouped.set(entry.weekday, current);
  });

  const migrated: WeeklyScheduleEntry[] = [];
  grouped.forEach((weekdayEntries) => {
    [...weekdayEntries]
      .sort(compareByTime)
      .forEach((entry, index) => {
        migrated.push(
          normalizeScheduleEntry(
            { ...entry, periodLabel: `${index + 1}교시`, displayOrder: index },
            index,
          ),
        );
      });
  });

  validateScheduleEntries(migrated);
  return sortScheduleEntries(migrated);
}

function validateScheduleEntry(entry: WeeklyScheduleEntry): void {
  if (!entry.id) {
    throw new ScheduleValidationError("시간표 항목 id 는 비어 있을 수 없습니다.");
  }

  if (!Number.isInteger(entry.weekday) || entry.weekday < 0 || entry.weekday > 6) {
    throw new ScheduleValidationError("weekday 는 0부터 6 사이의 정수여야 합니다.");
  }

  if (!entry.periodLabel) {
    throw new ScheduleValidationError("교시명은 비어 있을 수 없습니다.");
  }

  if (!entry.subject) {
    throw new ScheduleValidationError("과목명은 비어 있을 수 없습니다.");
  }

  if (!entry.colorId) {
    throw new ScheduleValidationError("색상 식별자는 비어 있을 수 없습니다.");
  }

  if (!Number.isInteger(entry.displayOrder) || entry.displayOrder < 0) {
    throw new ScheduleValidationError("displayOrder 는 0 이상의 정수여야 합니다.");
  }

  if (!Number.isInteger(entry.startMinute) || entry.startMinute < 0 || entry.startMinute > 1439) {
    throw new ScheduleValidationError("startMinute 는 0부터 1439 사이의 정수여야 합니다.");
  }

  if (!Number.isInteger(entry.endMinute) || entry.endMinute < 0 || entry.endMinute > 1439) {
    throw new ScheduleValidationError("endMinute 는 0부터 1439 사이의 정수여야 합니다.");
  }

  if (entry.endMinute <= entry.startMinute) {
    throw new ScheduleValidationError("endMinute 는 startMinute 보다 커야 합니다.");
  }
}
