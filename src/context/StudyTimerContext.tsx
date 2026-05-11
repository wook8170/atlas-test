import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LocalStateRepository } from "@/repositories/LocalStateRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type {
  CompletionReason,
  PomodoroSession,
  PomodoroSettings,
  SessionType,
  TodaySummary,
  WeeklyScheduleEntry,
} from "@/domain/types";

type StudyUiMode = "ready" | "focus" | "short-break" | "long-break" | "completed";

interface ActiveTask {
  scheduleEntryId: string | null;
  label: string;
}

interface StudyRuntimeState {
  mode: StudyUiMode;
  isRunning: boolean;
  remainingSec: number;
  expectedEndAtMs: number | null;
  startedAt: string | null;
  plannedDurationSec: number;
  completedFocusInCycle: number;
  currentTask: ActiveTask | null;
}

interface StudyTimerContextValue {
  settings: PomodoroSettings | null;
  schedules: WeeklyScheduleEntry[];
  todaySummary: TodaySummary;
  todaySessions: PomodoroSession[];
  runtime: StudyRuntimeState;
  isBootstrapping: boolean;
  startFocus(task: ActiveTask): Promise<void>;
  pauseTimer(): void;
  resumeTimer(): Promise<void>;
  stopTimer(): Promise<void>;
}

const DEFAULT_FOCUS_SECONDS = 25 * 60;

const EMPTY_SUMMARY = (): TodaySummary => ({
  date: getLocalDateKey(),
  completedSessions: 0,
  totalFocusMinutes: 0,
  bySubject: [],
});

const INITIAL_RUNTIME: StudyRuntimeState = {
  mode: "ready",
  isRunning: false,
  remainingSec: DEFAULT_FOCUS_SECONDS,
  expectedEndAtMs: null,
  startedAt: null,
  plannedDurationSec: DEFAULT_FOCUS_SECONDS,
  completedFocusInCycle: 0,
  currentTask: null,
};

const StudyTimerContext = createContext<StudyTimerContextValue | null>(null);

function getLocalDateKey(iso?: string) {
  const date = iso ? new Date(iso) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function toSessionType(mode: StudyUiMode): SessionType | null {
  if (mode === "focus") {
    return "focus";
  }

  if (mode === "short-break") {
    return "short-break";
  }

  if (mode === "long-break") {
    return "long-break";
  }

  return null;
}

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary>(EMPTY_SUMMARY);
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
  const [runtime, setRuntime] = useState<StudyRuntimeState>(INITIAL_RUNTIME);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const runtimeRef = useRef(runtime);
  const transitionLockRef = useRef(false);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  async function refreshRecords() {
    const dateKey = getLocalDateKey();
    const [loadedSchedules, loadedSummary, loadedSessions] = await Promise.all([
      ScheduleRepository.listAll(),
      SessionRepository.todaySummary(dateKey),
      SessionRepository.listByDate(dateKey),
    ]);

    setSchedules(loadedSchedules);
    setTodaySummary(loadedSummary);
    setTodaySessions(loadedSessions);
  }

  useEffect(() => {
    async function bootstrap() {
      const loadedSettings = await LocalStateRepository.getSettings();
      setSettings(loadedSettings);
      setRuntime((current) => ({
        ...current,
        remainingSec: loadedSettings.focusMinutes * 60,
        plannedDurationSec: loadedSettings.focusMinutes * 60,
      }));
      await refreshRecords();
      setIsBootstrapping(false);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!runtime.isRunning || runtime.expectedEndAtMs === null) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      const current = runtimeRef.current;
      if (!current.isRunning || current.expectedEndAtMs === null) {
        return;
      }

      const nextRemaining = Math.max(
        0,
        Math.ceil((current.expectedEndAtMs - Date.now()) / 1000),
      );

      setRuntime((snapshot) => ({ ...snapshot, remainingSec: nextRemaining }));

      if (current.expectedEndAtMs <= Date.now() && !transitionLockRef.current) {
        transitionLockRef.current = true;
        void finishRunningSegment();
      }
    }, 250);

    return () => window.clearInterval(timerId);
  }, [runtime.isRunning, runtime.expectedEndAtMs, settings]);

  function focusDurationSec() {
    return (settings?.focusMinutes ?? 25) * 60;
  }

  function buildReadyState(args?: {
    completedFocusInCycle?: number;
    currentTask?: ActiveTask | null;
  }): StudyRuntimeState {
    const duration = focusDurationSec();
    return {
      mode: "ready",
      isRunning: false,
      remainingSec: duration,
      expectedEndAtMs: null,
      startedAt: null,
      plannedDurationSec: duration,
      completedFocusInCycle: args?.completedFocusInCycle ?? 0,
      currentTask: args?.currentTask ?? null,
    };
  }

  function beginSegment(args: {
    mode: "focus" | "short-break" | "long-break";
    durationSec: number;
    completedFocusInCycle: number;
    currentTask: ActiveTask | null;
  }) {
    transitionLockRef.current = false;
    setRuntime({
      mode: args.mode,
      isRunning: true,
      remainingSec: args.durationSec,
      expectedEndAtMs: Date.now() + args.durationSec * 1000,
      startedAt: new Date().toISOString(),
      plannedDurationSec: args.durationSec,
      completedFocusInCycle: args.completedFocusInCycle,
      currentTask: args.currentTask,
    });
  }

  async function appendSessionRecord(args: {
    sessionType: SessionType;
    startedAt: string;
    endedAt: string;
    elapsedSeconds: number;
    completed: boolean;
    completionReason: CompletionReason;
    currentTask: ActiveTask | null;
  }) {
    await SessionRepository.append({
      id: createSessionId(),
      scheduleEntryId: args.sessionType === "focus" ? args.currentTask?.scheduleEntryId ?? null : null,
      freeTaskTitle:
        args.sessionType === "focus" && !args.currentTask?.scheduleEntryId
          ? args.currentTask?.label ?? null
          : null,
      sessionType: args.sessionType,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      elapsedSeconds: args.elapsedSeconds,
      completed: args.completed,
      completionReason: args.completionReason,
      localDateKey: getLocalDateKey(args.startedAt),
      createdAt: args.startedAt,
      schemaVersion: 2,
    });
    await refreshRecords();
  }

  async function finishRunningSegment() {
    const current = runtimeRef.current;
    const currentSettings = settings;

    if (!currentSettings) {
      transitionLockRef.current = false;
      return;
    }

    const sessionType = toSessionType(current.mode);
    if (!sessionType || !current.startedAt) {
      transitionLockRef.current = false;
      return;
    }

    const endedAt = new Date().toISOString();

    try {
      await appendSessionRecord({
        sessionType,
        startedAt: current.startedAt,
        endedAt,
        elapsedSeconds: current.plannedDurationSec,
        completed: true,
        completionReason: "finished",
        currentTask: current.currentTask,
      });

      if (sessionType === "focus") {
        const nextCompletedFocusInCycle = current.completedFocusInCycle + 1;
        const isLongBreakTurn =
          nextCompletedFocusInCycle % currentSettings.longBreakEvery === 0;
        beginSegment({
          mode: isLongBreakTurn ? "long-break" : "short-break",
          durationSec:
            (isLongBreakTurn
              ? currentSettings.longBreakMinutes
              : currentSettings.shortBreakMinutes) * 60,
          completedFocusInCycle: nextCompletedFocusInCycle,
          currentTask: current.currentTask,
        });
        return;
      }

      if (sessionType === "long-break") {
        setRuntime({
          mode: "completed",
          isRunning: false,
          remainingSec: 0,
          expectedEndAtMs: null,
          startedAt: null,
          plannedDurationSec: 0,
          completedFocusInCycle: current.completedFocusInCycle,
          currentTask: current.currentTask,
        });
        return;
      }

      setRuntime(
        buildReadyState({
          completedFocusInCycle: current.completedFocusInCycle,
          currentTask: current.currentTask,
        }),
      );
    } finally {
      transitionLockRef.current = false;
    }
  }

  async function startFocus(task: ActiveTask) {
    const currentSettings = settings;
    if (!currentSettings) {
      return;
    }

    beginSegment({
      mode: "focus",
      durationSec: currentSettings.focusMinutes * 60,
      completedFocusInCycle: runtimeRef.current.mode === "completed" ? 0 : runtimeRef.current.completedFocusInCycle,
      currentTask: task,
    });
  }

  function pauseTimer() {
    const current = runtimeRef.current;
    if (!current.isRunning || current.expectedEndAtMs === null) {
      return;
    }

    setRuntime({
      ...current,
      isRunning: false,
      remainingSec: Math.max(0, Math.ceil((current.expectedEndAtMs - Date.now()) / 1000)),
      expectedEndAtMs: null,
    });
  }

  async function resumeTimer() {
    const current = runtimeRef.current;
    if (current.isRunning || current.mode === "ready" || current.mode === "completed") {
      return;
    }

    transitionLockRef.current = false;
    setRuntime({
      ...current,
      isRunning: true,
      expectedEndAtMs: Date.now() + current.remainingSec * 1000,
    });
  }

  async function stopTimer() {
    const current = runtimeRef.current;
    const sessionType = toSessionType(current.mode);

    if (!sessionType || !current.startedAt) {
      setRuntime(buildReadyState({ currentTask: current.currentTask }));
      return;
    }

    const remainingSec =
      current.expectedEndAtMs === null
        ? current.remainingSec
        : Math.max(0, Math.ceil((current.expectedEndAtMs - Date.now()) / 1000));

    await appendSessionRecord({
      sessionType,
      startedAt: current.startedAt,
      endedAt: new Date().toISOString(),
      elapsedSeconds: Math.max(0, current.plannedDurationSec - remainingSec),
      completed: false,
      completionReason: "user_stopped",
      currentTask: current.currentTask,
    });

    setRuntime(buildReadyState({ currentTask: current.currentTask }));
  }

  return (
    <StudyTimerContext.Provider
      value={{
        settings,
        schedules,
        todaySummary,
        todaySessions,
        runtime,
        isBootstrapping,
        startFocus,
        pauseTimer,
        resumeTimer,
        stopTimer,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const value = useContext(StudyTimerContext);
  if (!value) {
    throw new Error("StudyTimerProvider 가 필요합니다.");
  }

  return value;
}
