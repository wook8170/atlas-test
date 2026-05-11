const { randomUUID } = require("node:crypto");

function startPomodoroFromTimetableCell(cell, options = {}) {
  if (!cell) {
    throw new Error("A timetable cell is required.");
  }

  if (!cell.subjectName || !cell.subjectId) {
    throw new Error("The timetable cell must include subject information.");
  }

  if (!cell.pomodoro) {
    throw new Error("The timetable cell is not connected to a pomodoro timer.");
  }

  const {
    focusMinutes,
    shortBreakMinutes = 5,
    longBreakMinutes = 15,
    longBreakInterval = 4,
  } = cell.pomodoro;

  if (!Number.isInteger(focusMinutes) || focusMinutes <= 0) {
    throw new Error("The connected pomodoro timer must define focusMinutes.");
  }

  const now = options.now ?? new Date();
  const sessionIdFactory = options.sessionIdFactory ?? randomUUID;

  return {
    sessionId: sessionIdFactory(),
    subjectId: cell.subjectId,
    subjectName: cell.subjectName,
    source: {
      type: "timetable-cell",
      timetableCellId: cell.id ?? null,
    },
    status: "running",
    startedAt: now.toISOString(),
    timer: {
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval,
      currentPhase: "focus",
    },
  };
}

module.exports = {
  startPomodoroFromTimetableCell,
};
