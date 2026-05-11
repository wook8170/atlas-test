export interface TimetableEntry {
  id: string;
  subject: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface PomodoroSession {
  id: string;
  timetableEntryId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  completed: boolean;
}

export interface StudyRecord {
  id: string;
  sessionId: string;
  recordedAt: string;
  subject: string;
  minutesStudied: number;
}

export interface StickerLedger {
  totalEarned: number;
  lastAwardedAt: string | null;
}

export interface AppSettings {
  timerDurationMinutes: number;
  breakDurationMinutes: number;
  soundEnabled: boolean;
}

export interface AppState {
  timetableEntries: TimetableEntry[];
  pomodoroSessions: PomodoroSession[];
  studyRecords: StudyRecord[];
  stickerLedger: StickerLedger;
  settings: AppSettings;
  lastLocalSaveAt: string | null;
}

export const DEFAULT_APP_STATE: AppState = {
  timetableEntries: [],
  pomodoroSessions: [],
  studyRecords: [],
  stickerLedger: {
    totalEarned: 0,
    lastAwardedAt: null,
  },
  settings: {
    timerDurationMinutes: 25,
    breakDurationMinutes: 5,
    soundEnabled: true,
  },
  lastLocalSaveAt: null,
};

export const DISALLOWED_REMOTE_STATE_KEYS = [
  "externalCalendarAccounts",
  "calendarProvider",
  "calendarEventId",
  "syncToken",
  "webhookId",
  "shareLinkId",
  "shareVisibility",
  "feedPostId",
  "rankingScore",
  "billingPlan",
  "subscriptionStatus",
  "receipt",
  "paymentProviderCustomerId",
  "pushToken",
  "pushSchedule",
  "campaignId",
  "notificationPreference",
  "userId",
  "deviceId",
  "cloudRevision",
  "lastSyncedAt",
  "mergeBaseRevision",
  "pendingRemoteMutations",
  "syncConflict",
] as const;

export const DISALLOWED_MVP_COPY = [
  "연동",
  "공유",
  "구독",
  "클라우드",
  "동기화",
  "premium",
  "sync",
  "calendar connect",
  "share",
  "checkout",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function walkRemoteState(
  value: unknown,
  path: string,
  matches: string[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkRemoteState(entry, `${path}[${index}]`, matches);
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;

    if ((DISALLOWED_REMOTE_STATE_KEYS as readonly string[]).includes(key)) {
      matches.push(nextPath);
    }

    walkRemoteState(child, nextPath, matches);
  }
}

export function findDisallowedRemoteState(
  candidate: unknown,
): string[] {
  const matches: string[] = [];
  walkRemoteState(candidate, "", matches);
  return matches;
}

export function hasOnlyLocalState(candidate: unknown): boolean {
  return findDisallowedRemoteState(candidate).length === 0;
}

export function findBlockedMvpCopy(copy: string): string[] {
  const loweredCopy = copy.toLowerCase();

  return DISALLOWED_MVP_COPY.filter((term) =>
    loweredCopy.includes(term.toLowerCase()),
  );
}
