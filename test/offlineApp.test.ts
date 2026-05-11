import test from "node:test";
import assert from "node:assert/strict";

import { MemoryStorage, OfflineStudyApp } from "../src/index.ts";

test("returns cached schedule entries for offline date lookups", async () => {
  const app = new OfflineStudyApp({ storage: new MemoryStorage() });

  app.seedSchedule([
    {
      id: "math-1",
      date: "2026-05-11",
      title: "Math",
      startTime: "09:00",
      endTime: "10:00",
    },
    {
      id: "eng-1",
      date: "2026-05-12",
      title: "English",
      startTime: "11:00",
      endTime: "12:00",
    },
  ]);

  const syncResult = await app.syncSchedule(async () => {
    throw new Error("offline");
  });

  assert.equal(syncResult.source, "cache");
  assert.equal(syncResult.entries.length, 2);
  assert.deepEqual(app.getScheduleForDate("2026-05-11"), [
    {
      id: "math-1",
      date: "2026-05-11",
      title: "Math",
      startTime: "09:00",
      endTime: "10:00",
    },
  ]);
});

test("timer completion writes a study record without any network dependency", () => {
  const storage = new MemoryStorage();
  const app = new OfflineStudyApp({ storage });

  app.startTimer({
    scheduleId: "math-1",
    label: "Math self-study",
    startedAt: "2026-05-11T09:00:00.000Z",
  });

  const record = app.stopTimer({
    endedAt: "2026-05-11T09:25:00.000Z",
  });

  assert.equal(app.getActiveTimer(), null);
  assert.equal(record.durationMs, 25 * 60 * 1000);
  assert.equal(record.scheduleId, "math-1");
});

test("records remain queryable after the app is recreated from the same local storage", () => {
  const storage = new MemoryStorage();
  const firstRun = new OfflineStudyApp({ storage });

  firstRun.saveRecord({
    id: "record-1",
    scheduleId: "math-1",
    label: "Math self-study",
    startedAt: "2026-05-11T09:00:00.000Z",
    endedAt: "2026-05-11T09:25:00.000Z",
    durationMs: 25 * 60 * 1000,
    outcome: "completed",
  });

  const secondRun = new OfflineStudyApp({ storage });
  const records = secondRun.listRecords({ scheduleId: "math-1" });

  assert.equal(records.length, 1);
  assert.equal(records[0].id, "record-1");
  assert.equal(records[0].label, "Math self-study");
});
