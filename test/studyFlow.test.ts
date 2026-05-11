import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPLETED_OUTCOME,
  MemoryStorage,
  StudyFlowApp,
  createWeeklyScheduleEntry,
} from "../src/index.ts";

test("today schedule snapshot exposes sorted entries and current/next guidance", () => {
  const app = new StudyFlowApp({
    storage: new MemoryStorage(),
    now: () => new Date("2026-05-11T15:10:00"),
  });

  app.seedWeeklySchedule([
    createWeeklyScheduleEntry({
      scheduleEntryId: "english",
      weekday: 1,
      subjectName: "영어",
      startTime: "16:00",
      endTime: "16:25",
    }),
    createWeeklyScheduleEntry({
      scheduleEntryId: "math",
      weekday: 1,
      subjectName: "수학",
      startTime: "15:00",
      endTime: "15:25",
    }),
    createWeeklyScheduleEntry({
      scheduleEntryId: "science",
      weekday: 2,
      subjectName: "과학",
      startTime: "15:00",
      endTime: "15:25",
    }),
  ]);

  const snapshot = app.getTodaySnapshot();

  assert.equal(snapshot.entries.length, 2);
  assert.deepEqual(
    snapshot.entries.map((entry) => entry.scheduleEntryId),
    ["math", "english"],
  );
  assert.equal(snapshot.current?.scheduleEntryId, "math");
  assert.equal(snapshot.next?.scheduleEntryId, "english");
});

test("pomodoro starts from a timetable slot and persists the linked session", () => {
  const storage = new MemoryStorage();
  const app = new StudyFlowApp({ storage });

  app.seedWeeklySchedule([
    createWeeklyScheduleEntry({
      scheduleEntryId: "math",
      weekday: 1,
      subjectName: "수학",
      focusDurationMin: 30,
      breakDurationMin: 10,
    }),
  ]);

  const session = app.startPomodoroForScheduleEntry(
    "math",
    "2026-05-11T15:00:00",
  );

  assert.equal(session.subjectName, "수학");
  assert.equal(session.plannedFocusDurationMin, 30);
  assert.equal(app.getActivePomodoroSession()?.scheduleEntryId, "math");
});

test("completed study history summarizes finished pomodoro records for today", () => {
  const storage = new MemoryStorage();
  const app = new StudyFlowApp({ storage });

  app.seedWeeklySchedule([
    createWeeklyScheduleEntry({
      scheduleEntryId: "math",
      weekday: 1,
      subjectName: "수학",
    }),
  ]);

  app.startPomodoroForScheduleEntry("math", "2026-05-11T15:00:00");
  const record = app.completeActivePomodoro({
    endedAt: "2026-05-11T15:25:00",
  });

  const history = app.getCompletedStudyHistory("2026-05-11T20:00:00");

  assert.equal(record.outcome, COMPLETED_OUTCOME);
  assert.equal(history.completedCount, 1);
  assert.equal(history.totalFocusMinutes, 25);
  assert.deepEqual(history.subjects, ["수학"]);
  assert.equal(history.records[0].scheduleEntryId, "math");
});
