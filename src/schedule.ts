export const WEEKLY_SCHEDULE_SCHEMA_VERSION = 1;

export const WEEKDAY_MIN = 0;
export const WEEKDAY_MAX = 6;
export const MIN_SUBJECT_NAME_LENGTH = 1;
export const MAX_SUBJECT_NAME_LENGTH = 30;
export const MIN_DURATION_MINUTES = 1;
export const DEFAULT_TIME_STEP_MINUTES = 5;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyScheduleEntry {
  scheduleEntryId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectColor: string;
  focusDurationMin: number;
  breakDurationMin: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  schemaVersion: typeof WEEKLY_SCHEDULE_SCHEMA_VERSION;
  updatedAt: string;
  entries: WeeklyScheduleEntry[];
}

export interface CurrentOrNextEntryResult {
  current?: WeeklyScheduleEntry;
  next?: WeeklyScheduleEntry;
}

export interface WeeklyScheduleRepository {
  getWeeklySchedule(): Promise<WeeklySchedule>;
  saveWeeklySchedule(schedule: WeeklySchedule): Promise<void>;
  upsertEntry(entry: WeeklyScheduleEntry): Promise<WeeklySchedule>;
  deactivateEntry(scheduleEntryId: string): Promise<WeeklySchedule>;
  removeEntry(scheduleEntryId: string): Promise<WeeklySchedule>;
  getEntriesForWeekday(weekday: Weekday): Promise<WeeklyScheduleEntry[]>;
  getCurrentOrNextEntry(now: Date): Promise<CurrentOrNextEntryResult>;
}

export class WeeklyScheduleValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "WeeklyScheduleValidationError";
    this.issues = issues;
  }
}

export function createEmptyWeeklySchedule(
  updatedAt = new Date().toISOString(),
): WeeklySchedule {
  return {
    schemaVersion: WEEKLY_SCHEDULE_SCHEMA_VERSION,
    updatedAt,
    entries: [],
  };
}

export function validateWeeklyScheduleEntry(
  entry: WeeklyScheduleEntry,
  options: { enforceFiveMinuteStep?: boolean } = {},
): string[] {
  const issues: string[] = [];
  const enforceFiveMinuteStep = options.enforceFiveMinuteStep ?? true;
  const subjectName = entry.subjectName.trim();

  if (!entry.scheduleEntryId.trim()) {
    issues.push("scheduleEntryId must not be empty.");
  }

  if (!Number.isInteger(entry.weekday) || entry.weekday < WEEKDAY_MIN || entry.weekday > WEEKDAY_MAX) {
    issues.push("weekday must be an integer from 0 to 6.");
  }

  if (!TIME_PATTERN.test(entry.startTime)) {
    issues.push("startTime must use HH:mm 24-hour format.");
  }

  if (!TIME_PATTERN.test(entry.endTime)) {
    issues.push("endTime must use HH:mm 24-hour format.");
  }

  if (TIME_PATTERN.test(entry.startTime) && TIME_PATTERN.test(entry.endTime)) {
    const startMinutes = timeStringToMinutes(entry.startTime);
    const endMinutes = timeStringToMinutes(entry.endTime);

    if (endMinutes <= startMinutes) {
      issues.push("endTime must be later than startTime on the same day.");
    }

    if (enforceFiveMinuteStep) {
      if (startMinutes % DEFAULT_TIME_STEP_MINUTES !== 0) {
        issues.push("startTime must be aligned to 5-minute steps.");
      }
      if (endMinutes % DEFAULT_TIME_STEP_MINUTES !== 0) {
        issues.push("endTime must be aligned to 5-minute steps.");
      }
    }
  }

  if (subjectName.length < MIN_SUBJECT_NAME_LENGTH || subjectName.length > MAX_SUBJECT_NAME_LENGTH) {
    issues.push("subjectName must be 1 to 30 characters after trimming.");
  }

  if (!HEX_COLOR_PATTERN.test(entry.subjectColor)) {
    issues.push("subjectColor must be a 6-digit hex color like #4F8EF7.");
  }

  if (!Number.isInteger(entry.focusDurationMin) || entry.focusDurationMin < MIN_DURATION_MINUTES) {
    issues.push("focusDurationMin must be an integer greater than or equal to 1.");
  }

  if (!Number.isInteger(entry.breakDurationMin) || entry.breakDurationMin < MIN_DURATION_MINUTES) {
    issues.push("breakDurationMin must be an integer greater than or equal to 1.");
  }

  if (typeof entry.isActive !== "boolean") {
    issues.push("isActive must be a boolean.");
  }

  if (!isIsoDateTime(entry.createdAt)) {
    issues.push("createdAt must be a valid ISO datetime string.");
  }

  if (!isIsoDateTime(entry.updatedAt)) {
    issues.push("updatedAt must be a valid ISO datetime string.");
  }

  return issues;
}

export function validateWeeklySchedule(
  schedule: WeeklySchedule,
  options: { enforceFiveMinuteStep?: boolean } = {},
): string[] {
  const issues: string[] = [];

  if (schedule.schemaVersion !== WEEKLY_SCHEDULE_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${WEEKLY_SCHEDULE_SCHEMA_VERSION}.`);
  }

  if (!isIsoDateTime(schedule.updatedAt)) {
    issues.push("updatedAt must be a valid ISO datetime string.");
  }

  const seenIds = new Set<string>();
  for (const entry of schedule.entries) {
    const entryIssues = validateWeeklyScheduleEntry(entry, options);
    issues.push(...entryIssues.map((issue) => `${entry.scheduleEntryId || "<missing-id>"}: ${issue}`));

    if (seenIds.has(entry.scheduleEntryId)) {
      issues.push(`${entry.scheduleEntryId}: scheduleEntryId must be unique within the schedule.`);
    }
    seenIds.add(entry.scheduleEntryId);
  }

  issues.push(...validateNoOverlap(schedule.entries));
  return issues;
}

export function assertValidWeeklySchedule(
  schedule: WeeklySchedule,
  options: { enforceFiveMinuteStep?: boolean } = {},
): WeeklySchedule {
  const issues = validateWeeklySchedule(schedule, options);
  if (issues.length > 0) {
    throw new WeeklyScheduleValidationError(issues);
  }
  return schedule;
}

export function validateNoOverlap(entries: WeeklyScheduleEntry[]): string[] {
  const issues: string[] = [];
  const activeEntries = entries.filter((entry) => entry.isActive);

  for (let index = 0; index < activeEntries.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < activeEntries.length; compareIndex += 1) {
      const left = activeEntries[index];
      const right = activeEntries[compareIndex];

      if (left.weekday !== right.weekday) {
        continue;
      }

      if (entriesOverlap(left, right)) {
        issues.push(
          `${left.scheduleEntryId} overlaps ${right.scheduleEntryId} on weekday ${left.weekday}.`,
        );
      }
    }
  }

  return issues;
}

export function entriesOverlap(
  left: Pick<WeeklyScheduleEntry, "weekday" | "startTime" | "endTime">,
  right: Pick<WeeklyScheduleEntry, "weekday" | "startTime" | "endTime">,
): boolean {
  if (left.weekday !== right.weekday) {
    return false;
  }

  const leftStart = timeStringToMinutes(left.startTime);
  const leftEnd = timeStringToMinutes(left.endTime);
  const rightStart = timeStringToMinutes(right.startTime);
  const rightEnd = timeStringToMinutes(right.endTime);

  return leftStart < rightEnd && rightStart < leftEnd;
}

export function getEntriesForWeekday(
  schedule: WeeklySchedule,
  weekday: Weekday,
  options: { activeOnly?: boolean } = {},
): WeeklyScheduleEntry[] {
  const activeOnly = options.activeOnly ?? true;

  return schedule.entries
    .filter((entry) => entry.weekday === weekday)
    .filter((entry) => !activeOnly || entry.isActive)
    .sort(compareEntriesByTime);
}

export function getCurrentOrNextEntry(
  schedule: WeeklySchedule,
  now: Date,
): CurrentOrNextEntryResult {
  const weekday = now.getDay() as Weekday;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const entries = getEntriesForWeekday(schedule, weekday, { activeOnly: true });

  let current: WeeklyScheduleEntry | undefined;
  let next: WeeklyScheduleEntry | undefined;

  for (const entry of entries) {
    const startMinutes = timeStringToMinutes(entry.startTime);
    const endMinutes = timeStringToMinutes(entry.endTime);

    if (startMinutes <= nowMinutes && nowMinutes < endMinutes) {
      current = entry;
      continue;
    }

    if (!current && startMinutes > nowMinutes) {
      next = entry;
      break;
    }
  }

  if (current) {
    next = entries.find((entry) => timeStringToMinutes(entry.startTime) >= timeStringToMinutes(current.endTime));
  }

  return { current, next };
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function compareEntriesByTime(left: WeeklyScheduleEntry, right: WeeklyScheduleEntry): number {
  const weekdayOrder = left.weekday - right.weekday;
  if (weekdayOrder !== 0) {
    return weekdayOrder;
  }

  const startOrder = timeStringToMinutes(left.startTime) - timeStringToMinutes(right.startTime);
  if (startOrder !== 0) {
    return startOrder;
  }

  return timeStringToMinutes(left.endTime) - timeStringToMinutes(right.endTime);
}

function isIsoDateTime(value: string): boolean {
  if (!value || Number.isNaN(Date.parse(value))) {
    return false;
  }

  return value.includes("T");
}
