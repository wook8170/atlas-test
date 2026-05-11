const test = require("node:test");
const assert = require("node:assert/strict");

const { startPomodoroFromTimetableCell } = require("../src");

test("starts a running pomodoro session from a timetable cell", () => {
  const session = startPomodoroFromTimetableCell(
    {
      id: "cell-math-mon-1",
      subjectId: "subject-math",
      subjectName: "Math",
      pomodoro: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 20,
        longBreakInterval: 4,
      },
    },
    {
      now: new Date("2026-05-11T09:00:00.000Z"),
      sessionIdFactory: () => "session-1",
    },
  );

  assert.deepEqual(session, {
    sessionId: "session-1",
    subjectId: "subject-math",
    subjectName: "Math",
    source: {
      type: "timetable-cell",
      timetableCellId: "cell-math-mon-1",
    },
    status: "running",
    startedAt: "2026-05-11T09:00:00.000Z",
    timer: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 20,
      longBreakInterval: 4,
      currentPhase: "focus",
    },
  });
});

test("rejects timetable cells that are not connected to a pomodoro timer", () => {
  assert.throws(
    () =>
      startPomodoroFromTimetableCell({
        id: "cell-music-mon-1",
        subjectId: "subject-music",
        subjectName: "Music",
      }),
    /not connected to a pomodoro timer/,
  );
});

test("rejects timetable cells without subject information", () => {
  assert.throws(
    () =>
      startPomodoroFromTimetableCell({
        id: "cell-empty",
        pomodoro: {
          focusMinutes: 25,
        },
      }),
    /must include subject information/,
  );
});
