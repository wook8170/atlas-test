import { useEffect, useState } from "react";
import { LocalStateRepository, SessionRepository } from "@/repositories";
import type { TodaySummary } from "@/domain/types";

type TimerStatus = "idle" | "running" | "paused" | "completed";

interface ActiveSession {
  id: string;
  startedAt: string;
  plannedDurationSec: number;
}

const DEFAULT_FOCUS_MINUTES = 25;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatClock(totalSec: number): string {
  const safeSec = Math.max(0, totalSec);
  const minutes = Math.floor(safeSec / 60);
  const seconds = safeSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(status: TimerStatus): string {
  switch (status) {
    case "running":
      return "집중 중";
    case "paused":
      return "일시정지";
    case "completed":
      return "완료";
    default:
      return "시작 전";
  }
}

export function HomeRoute() {
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_FOCUS_MINUTES * 60);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [statusMessage, setStatusMessage] = useState("시작 버튼을 누르면 집중이 바로 시작됩니다.");

  useEffect(() => {
    let ignore = false;

    async function loadInitialState() {
      const [settings, summary] = await Promise.all([
        LocalStateRepository.getSettings(),
        SessionRepository.todaySummary(todayKey()),
      ]);

      if (ignore) {
        return;
      }

      setFocusMinutes(settings.focusMinutes);
      setRemainingSec(settings.focusMinutes * 60);
      setTodaySummary(summary);
    }

    void loadInitialState();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (timerStatus !== "running" || deadlineMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextRemaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSec(nextRemaining);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deadlineMs, timerStatus]);

  async function refreshTodaySummary(): Promise<void> {
    setTodaySummary(await SessionRepository.todaySummary(todayKey()));
  }

  async function saveSession(status: "completed" | "cancelled", durationSec: number): Promise<void> {
    if (!activeSession) {
      return;
    }

    await SessionRepository.append({
      id: activeSession.id,
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      durationSec,
      status,
      schemaVersion: 1,
    });

    await refreshTodaySummary();
  }

  function getPlannedDurationSec(): number {
    return focusMinutes * 60;
  }

  function getCurrentRemainingSec(): number {
    if (timerStatus === "running" && deadlineMs !== null) {
      return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
    }

    return remainingSec;
  }

  function resetTimer(nextStatus: TimerStatus) {
    setTimerStatus(nextStatus);
    setDeadlineMs(null);
    setActiveSession(null);
  }

  function handleStart() {
    const plannedDurationSec = getPlannedDurationSec();

    setActiveSession({
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      plannedDurationSec,
    });
    setRemainingSec(plannedDurationSec);
    setDeadlineMs(Date.now() + plannedDurationSec * 1000);
    setTimerStatus("running");
    setStatusMessage("타이머를 시작했습니다. 지금은 집중 시간입니다.");
  }

  function handlePause() {
    const nextRemaining = getCurrentRemainingSec();
    setRemainingSec(nextRemaining);
    setDeadlineMs(null);
    setTimerStatus("paused");
    setStatusMessage("타이머를 일시정지했습니다.");
  }

  function handleResume() {
    setDeadlineMs(Date.now() + remainingSec * 1000);
    setTimerStatus("running");
    setStatusMessage("타이머를 재개했습니다.");
  }

  function handleStop() {
    if (!activeSession) {
      return;
    }

    const nextRemaining = getCurrentRemainingSec();
    const elapsedSec = activeSession.plannedDurationSec - nextRemaining;
    const nextPlannedDurationSec = getPlannedDurationSec();

    setRemainingSec(nextPlannedDurationSec);
    resetTimer("idle");
    setStatusMessage("타이머를 종료했습니다. 새 세션을 다시 시작할 수 있습니다.");

    void saveSession("cancelled", elapsedSec);
  }

  useEffect(() => {
    if (timerStatus !== "running" || remainingSec > 0 || !activeSession) {
      return;
    }

    const plannedDurationSec = activeSession.plannedDurationSec;
    resetTimer("completed");
    setStatusMessage("집중 시간이 끝났습니다. 한 세션을 완료했어요.");

    void saveSession("completed", plannedDurationSec);
  }, [activeSession, remainingSec, timerStatus]);

  return (
    <section className="route route--home pomodoro-home">
      <div className="pomodoro-home__hero">
        <div>
          <h1>집중 타이머</h1>
          <p>시작, 일시정지, 재개, 종료를 눌렀을 때 현재 상태가 바로 바뀌는 뽀모도로 타이머입니다.</p>
        </div>
        <span className={`pomodoro-home__badge pomodoro-home__badge--${timerStatus}`}>
          {statusLabel(timerStatus)}
        </span>
      </div>

      <section className="pomodoro-home__timer-card" aria-labelledby="pomodoro-timer-title">
        <p id="pomodoro-timer-title" className="pomodoro-home__eyebrow">
          기본 집중 시간 {focusMinutes}분
        </p>
        <p className="pomodoro-home__clock" aria-live="polite">
          {formatClock(remainingSec)}
        </p>
        <p className="pomodoro-home__status" aria-live="polite">
          현재 상태: {statusLabel(timerStatus)}
        </p>
        <p className="pomodoro-home__message">{statusMessage}</p>

        <div className="pomodoro-home__actions">
          <button type="button" className="pomodoro-home__action pomodoro-home__action--primary" onClick={handleStart} disabled={timerStatus === "running" || timerStatus === "paused"}>
            시작
          </button>
          <button type="button" className="pomodoro-home__action" onClick={handlePause} disabled={timerStatus !== "running"}>
            일시정지
          </button>
          <button type="button" className="pomodoro-home__action" onClick={handleResume} disabled={timerStatus !== "paused"}>
            재개
          </button>
          <button type="button" className="pomodoro-home__action pomodoro-home__action--danger" onClick={handleStop} disabled={timerStatus !== "running" && timerStatus !== "paused"}>
            종료
          </button>
        </div>
      </section>

      <section className="pomodoro-home__summary" aria-labelledby="pomodoro-summary-title">
        <div className="pomodoro-home__summary-header">
          <h2 id="pomodoro-summary-title">오늘 요약</h2>
          <span>{todaySummary?.date ?? todayKey()}</span>
        </div>
        <div className="pomodoro-home__summary-grid">
          <article className="pomodoro-home__summary-card">
            <strong>{todaySummary?.completedSessions ?? 0}</strong>
            <span>완료한 세션</span>
          </article>
          <article className="pomodoro-home__summary-card">
            <strong>{todaySummary?.totalFocusMinutes ?? 0}분</strong>
            <span>집중한 시간</span>
          </article>
        </div>
      </section>
    </section>
  );
}
