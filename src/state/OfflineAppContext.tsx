import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  PomodoroSession,
  PomodoroSettings,
  WeeklyScheduleEntry,
} from "@/domain/types";
import {
  ErrorLogRepository,
  LocalStateRepository,
  ScheduleRepository,
  SessionRepository,
} from "@/repositories";
import { compareSchedules, currentWeekday } from "./time";
import {
  createTimerSnapshot,
  getElapsedSec,
  getRemainingSec,
  isExpired,
  pauseTimer,
  resumeTimer,
  snapshotToSession,
  type TimerSnapshot,
} from "./timer";

const TIMER_STORAGE_KEY = "atlas-test.active-timer";

const DEFAULT_SETTINGS: PomodoroSettings = {
  id: "default",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  schemaVersion: 1,
};

type ScheduleDraft = {
  weekday: WeeklyScheduleEntry["weekday"];
  startMinute: number;
  endMinute: number;
  subject: string;
  color: string;
};

type TimerView =
  | {
      phase: "idle";
      sessionId: null;
      label: null;
      scheduleEntryId?: undefined;
      startedAt?: undefined;
      totalSec: 0;
      remainingSec: 0;
      elapsedSec: 0;
    }
  | {
      phase: "running" | "paused";
      sessionId: string;
      label: string;
      scheduleEntryId?: string;
      startedAt: string;
      totalSec: number;
      remainingSec: number;
      elapsedSec: number;
    };

type OfflineAppContextValue = {
  ready: boolean;
  online: boolean;
  schedules: WeeklyScheduleEntry[];
  settings: PomodoroSettings;
  sessions: PomodoroSession[];
  timer: TimerView;
  addSchedule: (draft: ScheduleDraft) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  seedSchedule: () => Promise<void>;
  updateSettings: (patch: Partial<PomodoroSettings>) => Promise<void>;
  startTimer: (input: { label: string; scheduleEntryId?: string }) => Promise<void>;
  pauseActiveTimer: () => void;
  resumeActiveTimer: () => void;
  completeActiveTimer: () => Promise<void>;
  cancelActiveTimer: () => Promise<void>;
};

const OfflineAppContext = createContext<OfflineAppContextValue | null>(null);

function getInitialOnlineState(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function readStoredTimer(): TimerSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerSnapshot;
  } catch {
    return null;
  }
}

function persistTimer(snapshot: TimerSnapshot | null): void {
  if (typeof window === "undefined") return;
  if (!snapshot) {
    window.localStorage.removeItem(TIMER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(snapshot));
}

function sortSchedules(rows: WeeklyScheduleEntry[]): WeeklyScheduleEntry[] {
  return [...rows].sort(compareSchedules);
}

function sortSessions(rows: PomodoroSession[]): PomodoroSession[] {
  return [...rows].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

async function logLocalError(action: string, error: unknown): Promise<void> {
  const reason = error instanceof Error ? error.message : String(error);
  try {
    await ErrorLogRepository.append({
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      action,
      reason,
      schemaVersion: 1,
    });
  } catch {
    // 로컬 오류 기록조차 실패하면 사용자 흐름을 더 막지 않는다.
  }
}

export function OfflineAppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(getInitialOnlineState);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerSnapshot | null>(null);
  const [timerNow, setTimerNow] = useState(() => new Date());
  const finishingTimerRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function hydrate() {
      try {
        const [scheduleRows, savedSettings, sessionRows] = await Promise.all([
          ScheduleRepository.listAll(),
          LocalStateRepository.getSettings(),
          SessionRepository.listAll(),
        ]);

        if (disposed) return;

        const restoredTimer = readStoredTimer();
        let nextSessions = sortSessions(sessionRows);

        if (restoredTimer && isExpired(restoredTimer, new Date())) {
          persistTimer(null);
          const completedSession = snapshotToSession(restoredTimer, "completed");
          await SessionRepository.append(completedSession);
          nextSessions = sortSessions([completedSession, ...sessionRows]);
        } else {
          setActiveTimer(restoredTimer);
        }

        setSchedules(sortSchedules(scheduleRows));
        setSettings(savedSettings);
        setSessions(nextSessions);
      } catch (error) {
        await logLocalError("hydrate_offline_app", error);
      } finally {
        if (!disposed) {
          setReady(true);
        }
      }
    }

    void hydrate();

    function handleOnlineStatus() {
      setOnline(getInitialOnlineState());
    }

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!activeTimer || activeTimer.mode !== "running") return;
    const intervalId = window.setInterval(() => {
      setTimerNow(new Date());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  async function refreshSchedules() {
    setSchedules(sortSchedules(await ScheduleRepository.listAll()));
  }

  async function refreshSessions() {
    setSessions(sortSessions(await SessionRepository.listAll()));
  }

  async function finalizeTimer(status: PomodoroSession["status"]) {
    if (!activeTimer) return;
    const snapshot = activeTimer;
    persistTimer(null);
    setActiveTimer(null);
    setTimerNow(new Date());

    try {
      await SessionRepository.append(snapshotToSession(snapshot, status, new Date()));
      await refreshSessions();
    } catch (error) {
      await logLocalError("save_timer_session", error);
    }
  }

  useEffect(() => {
    if (!activeTimer || activeTimer.mode !== "running") return;
    if (finishingTimerRef.current) return;
    if (getRemainingSec(activeTimer, timerNow) > 0) return;

    finishingTimerRef.current = true;
    void finalizeTimer("completed").finally(() => {
      finishingTimerRef.current = false;
    });
  }, [activeTimer, timerNow]);

  const timer: TimerView = activeTimer
    ? {
        phase: activeTimer.mode,
        sessionId: activeTimer.id,
        label: activeTimer.label,
        scheduleEntryId: activeTimer.scheduleEntryId,
        startedAt: activeTimer.startedAt,
        totalSec: activeTimer.totalSec,
        remainingSec: getRemainingSec(activeTimer, timerNow),
        elapsedSec: getElapsedSec(activeTimer, timerNow),
      }
    : {
        phase: "idle",
        sessionId: null,
        label: null,
        totalSec: 0,
        remainingSec: 0,
        elapsedSec: 0,
      };

  async function addSchedule(draft: ScheduleDraft) {
    try {
      await ScheduleRepository.upsert({
        id: crypto.randomUUID(),
        weekday: draft.weekday,
        startMinute: draft.startMinute,
        endMinute: draft.endMinute,
        subject: draft.subject.trim(),
        color: draft.color,
        schemaVersion: 1,
      });
      await refreshSchedules();
    } catch (error) {
      await logLocalError("add_schedule", error);
    }
  }

  async function removeSchedule(id: string) {
    try {
      await ScheduleRepository.remove(id);
      await refreshSchedules();
    } catch (error) {
      await logLocalError("remove_schedule", error);
    }
  }

  async function seedSchedule() {
    const weekday = currentWeekday();
    const samples: ScheduleDraft[] = [
      { weekday, startMinute: 9 * 60, endMinute: 9 * 60 + 40, subject: "국어", color: "#ff7a59" },
      { weekday, startMinute: 10 * 60, endMinute: 10 * 60 + 40, subject: "수학", color: "#1fa971" },
      { weekday, startMinute: 11 * 60, endMinute: 11 * 60 + 40, subject: "과학", color: "#3566e2" },
    ];

    try {
      for (const sample of samples) {
        await ScheduleRepository.upsert({
          id: crypto.randomUUID(),
          weekday: sample.weekday,
          startMinute: sample.startMinute,
          endMinute: sample.endMinute,
          subject: sample.subject,
          color: sample.color,
          schemaVersion: 1,
        });
      }
      await refreshSchedules();
    } catch (error) {
      await logLocalError("seed_schedule", error);
    }
  }

  async function updateSettings(patch: Partial<PomodoroSettings>) {
    try {
      await LocalStateRepository.updateSettings(patch);
      setSettings(await LocalStateRepository.getSettings());
    } catch (error) {
      await logLocalError("update_settings", error);
    }
  }

  async function startTimer(input: { label: string; scheduleEntryId?: string }) {
    if (activeTimer) return;
    const snapshot = createTimerSnapshot({
      id: crypto.randomUUID(),
      label: input.label,
      scheduleEntryId: input.scheduleEntryId,
      totalSec: Math.max(1, settings.focusMinutes) * 60,
    });
    persistTimer(snapshot);
    setActiveTimer(snapshot);
    setTimerNow(new Date());
  }

  function pauseActiveTimer() {
    if (!activeTimer || activeTimer.mode !== "running") return;
    const nextTimer = pauseTimer(activeTimer, new Date());
    persistTimer(nextTimer);
    setActiveTimer(nextTimer);
    setTimerNow(new Date());
  }

  function resumeActiveTimer() {
    if (!activeTimer || activeTimer.mode !== "paused") return;
    const nextTimer = resumeTimer(activeTimer, new Date());
    persistTimer(nextTimer);
    setActiveTimer(nextTimer);
    setTimerNow(new Date());
  }

  async function completeActiveTimer() {
    await finalizeTimer("completed");
  }

  async function cancelActiveTimer() {
    await finalizeTimer("cancelled");
  }

  return (
    <OfflineAppContext.Provider
      value={{
        ready,
        online,
        schedules,
        settings,
        sessions,
        timer,
        addSchedule,
        removeSchedule,
        seedSchedule,
        updateSettings,
        startTimer,
        pauseActiveTimer,
        resumeActiveTimer,
        completeActiveTimer,
        cancelActiveTimer,
      }}
    >
      {children}
    </OfflineAppContext.Provider>
  );
}

export function useOfflineApp() {
  const context = useContext(OfflineAppContext);
  if (!context) {
    throw new Error("useOfflineApp must be used within OfflineAppProvider");
  }
  return context;
}
