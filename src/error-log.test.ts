import test from "node:test";
import assert from "node:assert/strict";

import {
  ERROR_LOG_SCHEMA_VERSION,
  InMemoryErrorLogRepository,
  MAX_ERROR_LOG_ENTRIES,
  appendErrorLogEntry,
  createEmptyErrorLogCollection,
  listRecentErrorLogEntries,
  updateErrorLogRetryResult,
  type ErrorLogRecord,
} from "./error-log.ts";

function buildEntry(index: number, overrides: Partial<ErrorLogRecord> = {}): ErrorLogRecord {
  const minute = String(index).padStart(2, "0");
  return {
    errorLogId: `err_${index}`,
    occurredAt: `2026-05-11T09:${minute}:00.000Z`,
    failedActionName: `save_action_${index}`,
    failureMessage: `Failure message ${index}`,
    retryResult: "not_attempted",
    createdAt: `2026-05-11T09:${minute}:00.000Z`,
    updatedAt: `2026-05-11T09:${minute}:00.000Z`,
    ...overrides,
  };
}

test("appendErrorLogEntry adds entries and preserves schema version", () => {
  const entry = buildEntry(1);
  const collection = appendErrorLogEntry(createEmptyErrorLogCollection(), entry);

  assert.equal(collection.schemaVersion, ERROR_LOG_SCHEMA_VERSION);
  assert.deepEqual(collection.entries, [entry]);
});

test("appendErrorLogEntry trims the oldest entries beyond the capped limit", () => {
  let collection = createEmptyErrorLogCollection();

  for (let index = 1; index <= MAX_ERROR_LOG_ENTRIES + 2; index += 1) {
    collection = appendErrorLogEntry(collection, buildEntry(index));
  }

  assert.equal(collection.entries.length, MAX_ERROR_LOG_ENTRIES);
  assert.equal(collection.entries[0]?.errorLogId, "err_3");
  assert.equal(collection.entries.at(-1)?.errorLogId, `err_${MAX_ERROR_LOG_ENTRIES + 2}`);
});

test("updateErrorLogRetryResult updates only the matching record", () => {
  const updatedAt = "2026-05-11T10:00:00.000Z";
  const entry = buildEntry(1);
  const untouched = buildEntry(2);
  const collection = {
    schemaVersion: ERROR_LOG_SCHEMA_VERSION,
    entries: [entry, untouched],
  };

  const updated = updateErrorLogRetryResult(
    collection,
    entry.errorLogId,
    "retry_succeeded",
    updatedAt,
  );

  assert.equal(updated.entries[0]?.retryResult, "retry_succeeded");
  assert.equal(updated.entries[0]?.updatedAt, updatedAt);
  assert.deepEqual(updated.entries[1], untouched);
});

test("listRecentErrorLogEntries returns newest entries first", () => {
  const collection = {
    schemaVersion: ERROR_LOG_SCHEMA_VERSION,
    entries: [buildEntry(1), buildEntry(3), buildEntry(2)],
  };

  const recent = listRecentErrorLogEntries(collection, 2);

  assert.deepEqual(
    recent.map((entry) => entry.errorLogId),
    ["err_3", "err_2"],
  );
});

test("InMemoryErrorLogRepository supports append, update, list, and clear", async () => {
  const repository = new InMemoryErrorLogRepository();
  const entry = buildEntry(1);

  await repository.appendErrorLog(entry);
  await repository.updateRetryResult(entry.errorLogId, "retry_failed");

  const recent = await repository.listRecentErrorLogs();
  assert.equal(recent.length, 1);
  assert.equal(recent[0]?.retryResult, "retry_failed");

  await repository.clearAllErrorLogs();

  assert.deepEqual(await repository.listRecentErrorLogs(), []);
});
