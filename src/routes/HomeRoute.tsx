import { useEffect, useMemo, useRef, useState } from "react";
import type { PomodoroSession, PomodoroSettings, TodaySummary } from "@/domain/types";
import {
  advanceSnapshot,
  createActiveFocusSnapshot,
  createTimerDurations,
  decrementSnapshot,
  formatRemaining,
} from "@/lib/activeTimer";
import type { ActiveTimerSnapshot, TimerPhase } from "@/lib/activeTimer";
import { LocalStateRepository } from "@/repositories/LocalStateRepository";
import { SessionRepository } from "@/repositories/SessionRepository";

const PHASE_LABELS: Record<TimerPhase, string> = {
  focus: "집중",
  shortBreak: "짧은 휴식",
  longBreak: "긴 휴식",
};

const NEXT_ACTION_COPY: Record<TimerPhase, string> = {
  focus: "한 칸을 끝내면 자동으로 쉬는 시간이 시작됩니다.",
  shortBreak: "휴식이 끝나면 다음 집중 세션이 자동으로 이어집니다.",
  longBreak: "긴 휴식 후 다음 집중 세션으로 다시 돌아갑니다.",
};

function todayKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function createSessionRecord(
  snapshot: ActiveTimerSnapshot,
  status: PomodoroSession["status"],
  endedAt: string,
): PomodoroSession | null {
  if (!snapshot.focusSessionId || !snapshot.focusStartedAt) {
    return null;
  }

  const elapsedFocusSec = snapshot.durations.focusSec - snapshot.remainingSec;
  if (status !== "completed" && elapsedFocusSec <= 0) {
    return null;
  }

  return {
    id: snapshot.focusSessionId,
    startedAt: snapshot.focusStartedAt,
    endedAt,
    durationSec: status === "completed" ? snapshot.durations.focusSec : elapsedFocusSec,
    status,
    schemaVersion: 1,
  };
}

function formatSavedAt(timestamp: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function HomeRoute() {
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimerSnapshot | null>(null);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [booted, setBooted] = useState(false);
  const timerRef = useRef<ActiveTimerSnapshot | null>(null);

  useEffect(() => {
    timerRef.current = activeTimer;
  }, [activeTimer]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [nextSettings, todaySummary] = await Promise.all([
        LocalStateRepository.getSettings(),
        SessionRepository.todaySummary(todayKey()),
      ]);
      if (cancelled) {
        return;
      }

      setSettings(nextSettings);
      setActiveTimer(LocalStateRepository.getActiveTimerSnapshot());
      setSummary(todaySummary);
      setBooted(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booted) {
      return;
    }

    if (!activeTimer) {
      LocalStateRepository.clearActiveTimerSnapshot();
      return;
    }

    LocalStateRepository.saveActiveTimerSnapshot(activeTimer);
  }, [activeTimer, booted]);

  useEffect(() => {
    if (activeTimer?.status !== "running") {
      return;
    }

    // Countdown is driven from the persisted snapshot so refresh/relaunch restoration uses
    // the same source of truth that the UI advances each second.
    const intervalId = window.setInterval(() => {
      const current = timerRef.current;
      if (!current || current.status !== "running") {
        return;
      }

      const savedAt = new Date().toISOString();
      if (current.remainingSec > 1) {
        setActiveTimer(decrementSnapshot(current, savedAt));
        return;
      }

      const transition = advanceSnapshot(current, savedAt, crypto.randomUUID());
      setActiveTimer(transition.snapshot);

      if (transition.completedFocus) {
        const completed = createSessionRecord(current, "completed", savedAt);
        if (completed) {
          void SessionRepository.append(completed).then(async () => {
            setSummary(await SessionRepository.todaySummary(todayKey()));
          });
        }
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTimer?.status]);

  const durations = useMemo(
    () => (settings ? createTimerDurations(settings) : null),
    [settings],
  );

  async function refreshSummary() {
    setSummary(await SessionRepository.todaySummary(todayKey()));
  }

  function handleStart(): void {
    if (!durations) {
      return;
    }

    setActiveTimer(
      createActiveFocusSnapshot(durations, {
        startedAt: new Date().toISOString(),
        focusSessionId: crypto.randomUUID(),
      }),
    );
  }

  function handlePause(): void {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            status: "paused",
            lastSavedAt: new Date().toISOString(),
          }
        : current,
    );
  }

  function handleResume(): void {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            status: "running",
            lastSavedAt: new Date().toISOString(),
          }
        : current,
    );
  }

  function handleReset(): void {
    const current = timerRef.current;
    setActiveTimer(null);

    if (!current) {
      return;
    }

    const cancelled = createSessionRecord(current, "cancelled", new Date().toISOString());
    if (cancelled) {
      void SessionRepository.append(cancelled).then(() => {
        void refreshSummary();
      });
    }
  }

  if (!settings || !durations) {
    return (
      <section className="route route--home home-route">
        <p className="home-route__loading">세션 정보를 불러오는 중...</p>
      </section>
    );
  }

  const displayPhase = activeTimer?.phase ?? "focus";
  const displayRemaining = activeTimer?.remainingSec ?? durations.focusSec;
  const phaseTitle = PHASE_LABELS[displayPhase];

  return (
    <section className="route route--home home-route">
      <div className="home-hero">
        <div>
          <p className="home-hero__eyebrow">오늘의 집중 루틴</p>
          <h1>{activeTimer ? `${phaseTitle} 이어서 하기` : "자율 학습 세션 시작"}</h1>
          <p className="home-hero__body">
            {activeTimer
              ? NEXT_ACTION_COPY[displayPhase]
              : "앱을 새로고침해도 마지막으로 저장된 남은 시간과 단계에서 바로 이어집니다."}
          </p>
        </div>
        <div className={`phase-pill phase-pill--${displayPhase}`}>
          {activeTimer?.status === "paused" ? "일시정지" : phaseTitle}
        </div>
      </div>

      <article className="pomodoro-card">
        <p className="pomodoro-card__caption">현재 단계</p>
        <h2>{phaseTitle}</h2>
        <div className="pomodoro-card__clock">{formatRemaining(displayRemaining)}</div>
        <p className="pomodoro-card__meta">
          {activeTimer
            ? `마지막 저장 ${formatSavedAt(activeTimer.lastSavedAt)}`
            : `기본 집중 ${settings.focusMinutes}분 · 짧은 휴식 ${settings.breakMinutes}분`}
        </p>

        <div className="pomodoro-card__actions">
          {!activeTimer && (
            <button type="button" className="button button--primary" onClick={handleStart}>
              집중 시작
            </button>
          )}
          {activeTimer?.status === "running" && (
            <>
              <button type="button" className="button button--primary" onClick={handlePause}>
                일시정지
              </button>
              <button type="button" className="button button--ghost" onClick={handleReset}>
                세션 종료
              </button>
            </>
          )}
          {activeTimer?.status === "paused" && (
            <>
              <button type="button" className="button button--primary" onClick={handleResume}>
                계속하기
              </button>
              <button type="button" className="button button--ghost" onClick={handleReset}>
                세션 종료
              </button>
            </>
          )}
        </div>
      </article>

      <div className="home-grid">
        <article className="stat-card">
          <p className="stat-card__label">오늘 완료한 집중</p>
          <strong>{summary?.completedSessions ?? 0}회</strong>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">오늘 누적 집중</p>
          <strong>{summary?.totalFocusMinutes ?? 0}분</strong>
        </article>
      </div>

      <article className="info-card">
        <h3>복원 방식</h3>
        <p>
          진행 중 세션은 매 초 로컬 스냅샷으로 저장됩니다. 새로고침하거나 앱을 다시 열면
          남은 시간과 현재 단계를 마지막 저장 상태에서 다시 이어갑니다.
        </p>
      </article>
    </section>
  );
}
