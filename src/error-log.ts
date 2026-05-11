export const ERROR_LOG_SCHEMA_VERSION = 1;
export const ERROR_LOG_STORAGE_KEY = "error_logs_v1";
export const MAX_ERROR_LOG_ENTRIES = 20;

export type ErrorRetryResult =
  | "not_attempted"
  | "retry_succeeded"
  | "retry_failed";

export interface ErrorLogRecord {
  errorLogId: string;
  occurredAt: string;
  failedActionName: string;
  failureMessage: string;
  retryResult: ErrorRetryResult;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorLogCollection {
  schemaVersion: typeof ERROR_LOG_SCHEMA_VERSION;
  entries: ErrorLogRecord[];
}

export interface ErrorLogRepository {
  appendErrorLog(entry: ErrorLogRecord): Promise<void>;
  updateRetryResult(
    errorLogId: string,
    retryResult: ErrorRetryResult,
  ): Promise<void>;
  listRecentErrorLogs(limit?: number): Promise<ErrorLogRecord[]>;
  clearAllErrorLogs(): Promise<void>;
}

const RETRY_RESULTS: ReadonlySet<ErrorRetryResult> = new Set([
  "not_attempted",
  "retry_succeeded",
  "retry_failed",
]);

export function createEmptyErrorLogCollection(): ErrorLogCollection {
  return {
    schemaVersion: ERROR_LOG_SCHEMA_VERSION,
    entries: [],
  };
}

export function validateErrorLogRecord(entry: ErrorLogRecord): void {
  assertNonEmpty(entry.errorLogId, "errorLogId");
  assertIsoDatetime(entry.occurredAt, "occurredAt");
  assertLength(entry.failedActionName, "failedActionName", 1, 50);
  assertLength(entry.failureMessage, "failureMessage", 1, 200);
  assertIsoDatetime(entry.createdAt, "createdAt");
  assertIsoDatetime(entry.updatedAt, "updatedAt");

  if (!RETRY_RESULTS.has(entry.retryResult)) {
    throw new Error(`retryResult must be one of ${Array.from(RETRY_RESULTS).join(", ")}`);
  }
}

export function appendErrorLogEntry(
  collection: ErrorLogCollection,
  entry: ErrorLogRecord,
): ErrorLogCollection {
  validateErrorLogRecord(entry);

  if (collection.entries.some((item) => item.errorLogId === entry.errorLogId)) {
    throw new Error(`errorLogId already exists: ${entry.errorLogId}`);
  }

  const nextEntries = [...collection.entries, normalizeRecord(entry)];
  const trimmedEntries = nextEntries.slice(-MAX_ERROR_LOG_ENTRIES);

  return {
    schemaVersion: ERROR_LOG_SCHEMA_VERSION,
    entries: trimmedEntries,
  };
}

export function updateErrorLogRetryResult(
  collection: ErrorLogCollection,
  errorLogId: string,
  retryResult: ErrorRetryResult,
  updatedAt: string = new Date().toISOString(),
): ErrorLogCollection {
  assertNonEmpty(errorLogId, "errorLogId");
  assertIsoDatetime(updatedAt, "updatedAt");

  if (!RETRY_RESULTS.has(retryResult)) {
    throw new Error(`retryResult must be one of ${Array.from(RETRY_RESULTS).join(", ")}`);
  }

  let matched = false;
  const nextEntries = collection.entries.map((entry) => {
    if (entry.errorLogId !== errorLogId) {
      return entry;
    }

    matched = true;
    return {
      ...entry,
      retryResult,
      updatedAt,
    };
  });

  if (!matched) {
    throw new Error(`errorLogId not found: ${errorLogId}`);
  }

  return {
    schemaVersion: ERROR_LOG_SCHEMA_VERSION,
    entries: nextEntries,
  };
}

export function listRecentErrorLogEntries(
  collection: ErrorLogCollection,
  limit: number = MAX_ERROR_LOG_ENTRIES,
): ErrorLogRecord[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }

  return [...collection.entries]
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0, limit);
}

export function clearErrorLogEntries(): ErrorLogCollection {
  return createEmptyErrorLogCollection();
}

export class InMemoryErrorLogRepository implements ErrorLogRepository {
  private collection: ErrorLogCollection;

  constructor(initialCollection: ErrorLogCollection = createEmptyErrorLogCollection()) {
    this.collection = {
      schemaVersion: ERROR_LOG_SCHEMA_VERSION,
      entries: initialCollection.entries.map(normalizeRecord),
    };
  }

  async appendErrorLog(entry: ErrorLogRecord): Promise<void> {
    this.collection = appendErrorLogEntry(this.collection, entry);
  }

  async updateRetryResult(
    errorLogId: string,
    retryResult: ErrorRetryResult,
  ): Promise<void> {
    this.collection = updateErrorLogRetryResult(
      this.collection,
      errorLogId,
      retryResult,
    );
  }

  async listRecentErrorLogs(limit?: number): Promise<ErrorLogRecord[]> {
    return listRecentErrorLogEntries(this.collection, limit);
  }

  async clearAllErrorLogs(): Promise<void> {
    this.collection = clearErrorLogEntries();
  }

  snapshot(): ErrorLogCollection {
    return {
      schemaVersion: this.collection.schemaVersion,
      entries: this.collection.entries.map((entry) => ({ ...entry })),
    };
  }
}

function normalizeRecord(entry: ErrorLogRecord): ErrorLogRecord {
  return {
    ...entry,
    errorLogId: entry.errorLogId.trim(),
    failedActionName: entry.failedActionName.trim(),
    failureMessage: entry.failureMessage.trim(),
  };
}

function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }
}

function assertLength(
  value: string,
  fieldName: string,
  min: number,
  max: number,
): void {
  const trimmed = value.trim();

  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max} characters`);
  }
}

function assertIsoDatetime(value: string, fieldName: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO datetime`);
  }
}
