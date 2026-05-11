export const SCHEDULE_KEY = "weekly-schedule";
export const ACTIVE_SESSION_KEY = "active-pomodoro-session";
export const STUDY_RECORDS_KEY = "study-records";
export const COMPLETED_OUTCOME = "completed";

export interface WeeklyScheduleEntry {
  scheduleEntryId: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  subjectName: string;
  subjectColor: string;
  startTime: string;
  endTime: string;
  focusDurationMin: number;
  breakDurationMin: number;
  isActive: boolean;
}

export interface PomodoroSession {
  sessionId: string;
  scheduleEntryId: string;
  subjectName: string;
  subjectColor: string;
  plannedFocusDurationMin: number;
  plannedBreakDurationMin: number;
  startedAt: string;
}

export interface StudyRecord extends PomodoroSession {
  endedAt: string;
  actualFocusDurationMin: number;
  outcome: string;
}

export interface DailyStudySnapshot {
  date: string;
  entries: WeeklyScheduleEntry[];
  current?: WeeklyScheduleEntry;
  next?: WeeklyScheduleEntry;
  activeSession: PomodoroSession | null;
  completedSummary: StudyRecordSummary;
}

export interface StudyRecordSummary {
  completedCount: number;
  totalFocusMinutes: number;
  subjects: string[];
  records: StudyRecord[];
}

export class StudyFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyFlowError";
  }
}

export class MemoryStorage {
  #store = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.#store.set(key, value);
    }
  }

  getItem(key: string): string | null {
    return this.#store.has(key) ? this.#store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value);
  }

  removeItem(key: string): void {
    this.#store.delete(key);
  }
}

export class StudyFlowApp {
  #storage: Pick<MemoryStorage, "getItem" | "setItem" | "removeItem">;
  #now: () => Date;

  constructor({
    storage = new MemoryStorage(),
    now = () => new Date(),
  }: {
    storage?: Pick<MemoryStorage, "getItem" | "setItem" | "removeItem">;
    now?: () => Date;
  } = {}) {
    this.#storage = storage;
    this.#now = now;
  }

  seedWeeklySchedule(entries: WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
    writeJson(this.#storage, SCHEDULE_KEY, entries.map((entry) => ({ ...entry })));
    return this.listWeeklySchedule();
  }

  listWeeklySchedule(): WeeklyScheduleEntry[] {
    return readJson<WeeklyScheduleEntry[]>(this.#storage, SCHEDULE_KEY, []).map((entry) => ({
      ...entry,
    }));
  }

  getTodaySchedule(dateLike: Date | string = this.#now()): WeeklyScheduleEntry[] {
    return getEntriesForDate(this.listWeeklySchedule(), dateLike);
  }

  getTodaySnapshot(dateLike: Date | string = this.#now()): DailyStudySnapshot {
    return createDailyStudySnapshot({
      dateLike,
      entries: this.listWeeklySchedule(),
      activeSession: this.getActivePomodoroSession(),
      completedRecords: this.listStudyRecords({
        dateLike,
        outcome: COMPLETED_OUTCOME,
      }),
    });
  }

  startPomodoroForScheduleEntry(
    scheduleEntryId: string,
    startedAt: string = this.#now().toISOString(),
  ): PomodoroSession {
    if (this.getActivePomodoroSession()) {
      throw new StudyFlowError("An active pomodoro session already exists.");
    }

    const sessionDate = new Date(startedAt);
    const entry = this.getTodaySchedule(sessionDate).find(
      (candidate) => candidate.scheduleEntryId === scheduleEntryId,
    );

    if (!entry) {
      throw new StudyFlowError("The selected schedule entry is not available for today.");
    }

    if (!entry.isActive) {
      throw new StudyFlowError("Inactive schedule entries cannot start a pomodoro.");
    }

    const session: PomodoroSession = {
      sessionId: `${entry.scheduleEntryId}-${Date.parse(startedAt)}`,
      scheduleEntryId: entry.scheduleEntryId,
      subjectName: entry.subjectName,
      subjectColor: entry.subjectColor,
      plannedFocusDurationMin: entry.focusDurationMin,
      plannedBreakDurationMin: entry.breakDurationMin,
      startedAt,
    };

    writeJson(this.#storage, ACTIVE_SESSION_KEY, session);
    return session;
  }

  getActivePomodoroSession(): PomodoroSession | null {
    return readJson<PomodoroSession | null>(this.#storage, ACTIVE_SESSION_KEY, null);
  }

  completeActivePomodoro({
    endedAt = this.#now().toISOString(),
    outcome = COMPLETED_OUTCOME,
  }: {
    endedAt?: string;
    outcome?: string;
  } = {}): StudyRecord {
    const activeSession = this.getActivePomodoroSession();

    if (!activeSession) {
      throw new StudyFlowError("There is no active pomodoro session to complete.");
    }

    const actualFocusDurationMin = Math.max(
      0,
      Math.round(
        (Date.parse(endedAt) - Date.parse(activeSession.startedAt)) / (1000 * 60),
      ),
    );

    const record: StudyRecord = {
      ...activeSession,
      endedAt,
      actualFocusDurationMin,
      outcome,
    };

    const records = this.listStudyRecords({ newestFirst: false });
    records.push(record);
    writeJson(this.#storage, STUDY_RECORDS_KEY, records);
    this.#storage.removeItem(ACTIVE_SESSION_KEY);
    return record;
  }

  listStudyRecords({
    dateLike,
    outcome,
    scheduleEntryId,
    newestFirst = true,
  }: {
    dateLike?: Date | string;
    outcome?: string;
    scheduleEntryId?: string;
    newestFirst?: boolean;
  } = {}): StudyRecord[] {
    const targetDate = dateLike ? normalizeDate(dateLike) : null;
    const records = readJson<StudyRecord[]>(this.#storage, STUDY_RECORDS_KEY, []).filter(
      (record) => {
        if (targetDate && normalizeDate(record.startedAt) !== targetDate) {
          return false;
        }

        if (outcome && record.outcome !== outcome) {
          return false;
        }

        if (scheduleEntryId && record.scheduleEntryId !== scheduleEntryId) {
          return false;
        }

        return true;
      },
    );

    records.sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));
    return newestFirst ? records.reverse() : records;
  }

  getCompletedStudyHistory(dateLike: Date | string = this.#now()): StudyRecordSummary {
    return summarizeCompletedStudyRecords(
      this.listStudyRecords({ dateLike, outcome: COMPLETED_OUTCOME }),
    );
  }
}

export function createWeeklyScheduleEntry(
  overrides: Partial<WeeklyScheduleEntry> & Pick<WeeklyScheduleEntry, "scheduleEntryId">,
): WeeklyScheduleEntry {
  return {
    scheduleEntryId: overrides.scheduleEntryId,
    weekday: overrides.weekday ?? 1,
    subjectName: overrides.subjectName ?? "수학",
    subjectColor: overrides.subjectColor ?? "#FF8A3D",
    startTime: overrides.startTime ?? "15:00",
    endTime: overrides.endTime ?? "15:25",
    focusDurationMin: overrides.focusDurationMin ?? 25,
    breakDurationMin: overrides.breakDurationMin ?? 5,
    isActive: overrides.isActive ?? true,
  };
}

export function getEntriesForDate(
  entries: WeeklyScheduleEntry[],
  dateLike: Date | string,
): WeeklyScheduleEntry[] {
  const date = new Date(dateLike);
  const weekday = date.getDay() as WeeklyScheduleEntry["weekday"];

  return entries
    .filter((entry) => entry.weekday === weekday && entry.isActive)
    .sort(compareEntriesByTime);
}

export function getCurrentOrNextScheduleEntry(
  entries: WeeklyScheduleEntry[],
  nowLike: Date | string,
): {
  current?: WeeklyScheduleEntry;
  next?: WeeklyScheduleEntry;
} {
  const now = new Date(nowLike);
  const todayEntries = getEntriesForDate(entries, now);
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  let current: WeeklyScheduleEntry | undefined;
  let next: WeeklyScheduleEntry | undefined;

  for (const entry of todayEntries) {
    const startMinute = timeToMinutes(entry.startTime);
    const endMinute = timeToMinutes(entry.endTime);

    if (startMinute <= currentMinute && currentMinute < endMinute) {
      current = entry;
      continue;
    }

    if (!current && startMinute > currentMinute) {
      next = entry;
      break;
    }
  }

  if (current) {
    next = todayEntries.find(
      (entry) => timeToMinutes(entry.startTime) >= timeToMinutes(current.endTime),
    );
  }

  return { current, next };
}

export function summarizeCompletedStudyRecords(records: StudyRecord[]): StudyRecordSummary {
  const completedRecords = records.filter((record) => record.outcome === COMPLETED_OUTCOME);
  const subjects = [...new Set(completedRecords.map((record) => record.subjectName))];

  return {
    completedCount: completedRecords.length,
    totalFocusMinutes: completedRecords.reduce(
      (total, record) => total + record.actualFocusDurationMin,
      0,
    ),
    subjects,
    records: completedRecords,
  };
}

export function createDailyStudySnapshot({
  dateLike,
  entries,
  activeSession,
  completedRecords,
}: {
  dateLike: Date | string;
  entries: WeeklyScheduleEntry[];
  activeSession: PomodoroSession | null;
  completedRecords: StudyRecord[];
}): DailyStudySnapshot {
  const date = normalizeDate(dateLike);
  const todayEntries = getEntriesForDate(entries, dateLike);
  const { current, next } = getCurrentOrNextScheduleEntry(entries, dateLike);

  return {
    date,
    entries: todayEntries,
    current,
    next,
    activeSession,
    completedSummary: summarizeCompletedStudyRecords(completedRecords),
  };
}

function compareEntriesByTime(left: WeeklyScheduleEntry, right: WeeklyScheduleEntry): number {
  return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeDate(dateLike: Date | string): string {
  const date = new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readJson<T>(
  storage: Pick<MemoryStorage, "getItem">,
  key: string,
  fallback: T,
): T {
  const raw = storage.getItem(key);
  return raw === null ? fallback : (JSON.parse(raw) as T);
}

function writeJson(
  storage: Pick<MemoryStorage, "setItem">,
  key: string,
  value: unknown,
): void {
  storage.setItem(key, JSON.stringify(value));
}
