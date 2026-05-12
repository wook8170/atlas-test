import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { LocalStateRepository } from "@/repositories";

type TimerPhase = "focus";

interface ActiveTimer {
  id: string;
  scheduleEntryId: string;
  subject: string;
  color: string;
  phase: TimerPhase;
  startedAt: string;
  endsAt: string;
  totalSeconds: number;
}

interface TimerFlowContextValue {
  activeTimer: ActiveTimer | null;
  remainingSeconds: number;
  isStarting: boolean;
  startTimerForSchedule: (entry: WeeklyScheduleEntry) => Promise<void>;
  clearActiveTimer: () => void;
}

const TimerFlowContext = createContext<TimerFlowContextValue | null>(null);

export function TimerFlowProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!activeTimer) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  const remainingSeconds = activeTimer
    ? Math.max(0, Math.ceil((Date.parse(activeTimer.endsAt) - nowMs) / 1000))
    : 0;

  const startTimerForSchedule = async (entry: WeeklyScheduleEntry) => {
    setIsStarting(true);

    try {
      const settings = await LocalStateRepository.getSettings();
      const startedAt = new Date();
      const totalSeconds = settings.focusMinutes * 60;

      setActiveTimer({
        id: crypto.randomUUID(),
        scheduleEntryId: entry.id,
        subject: entry.subjectName,
        color: entry.subjectColor,
        phase: "focus",
        startedAt: startedAt.toISOString(),
        endsAt: new Date(startedAt.getTime() + totalSeconds * 1000).toISOString(),
        totalSeconds,
      });
      setNowMs(Date.now());
    } finally {
      setIsStarting(false);
    }
  };

  const clearActiveTimer = () => {
    setActiveTimer(null);
  };

  return (
    <TimerFlowContext.Provider
      value={{
        activeTimer,
        remainingSeconds,
        isStarting,
        startTimerForSchedule,
        clearActiveTimer,
      }}
    >
      {children}
    </TimerFlowContext.Provider>
  );
}

export function useTimerFlow() {
  const value = useContext(TimerFlowContext);

  if (!value) {
    throw new Error("useTimerFlow must be used inside TimerFlowProvider");
  }

  return value;
}
