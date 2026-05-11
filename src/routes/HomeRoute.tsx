import { useEffect, useMemo, useState } from "react";
import { LocalStateRepository, ScheduleRepository } from "@/repositories";
import type { WeeklyScheduleEntry } from "@/domain/types";

export interface HomeRouteProps {
  activeSession: {
    id: string;
    freeTaskTitle: string;
    startedAt: string;
    focusMinutes: number;
  } | null;
  onStartFreeTask: (taskTitle: string, focusMinutes: number) => void;
  onFinishActiveSession: (reason: "finished" | "user_stopped") => Promise<void>;
}

function formatMinuteClock(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = `${minute % 60}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatStartedAt(input: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(input));
}

function formatElapsed(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = `${safeSeconds % 60}`.padStart(2, "0");
  return `${minutes}:${remainSeconds}`;
}

export function HomeRoute({
  activeSession,
  onStartFreeTask,
  onFinishActiveSession,
}: HomeRouteProps) {
  const [todayEntries, setTodayEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [freeTaskTitle, setFreeTaskTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      ScheduleRepository.listByWeekday(new Date().getDay()),
      LocalStateRepository.getSettings(),
    ]).then(([entries, settings]) => {
      if (cancelled) {
        return;
      }
      setTodayEntries(entries);
      setFocusMinutes(settings.focusMinutes);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const tick = (): void => {
      const startedAt = new Date(activeSession.startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [activeSession]);

  const helperText = useMemo(() => {
    if (activeSession) {
      return "진행 중인 세션을 먼저 완료하거나 중단해 주세요.";
    }
    return "시간표를 고르지 않아도 자유 과제명만 입력하면 바로 집중을 시작할 수 있어요.";
  }, [activeSession]);

  function handleStart(): void {
    const trimmed = freeTaskTitle.trim();
    if (!trimmed) {
      setErrorMessage("자유 과제명을 입력해 주세요.");
      setStatusMessage("");
      return;
    }

    setErrorMessage("");
    onStartFreeTask(trimmed, focusMinutes);
    setFreeTaskTitle("");
    setStatusMessage(`"${trimmed}" 세션을 시작했어요.`);
  }

  async function handleFinish(reason: "finished" | "user_stopped"): Promise<void> {
    setIsSubmitting(true);
    try {
      await onFinishActiveSession(reason);
      setStatusMessage(
        reason === "finished"
          ? "세션을 완료로 기록했어요."
          : "세션을 중단으로 기록했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="route route--home">
      <div className="screen-header">
        <div>
          <h1>오늘의 집중 시작</h1>
          <p>시간표가 비어 있어도 자유 과제명으로 바로 뽀모도로를 시작할 수 있어요.</p>
        </div>
        <span className="pill">{focusMinutes}분 집중</span>
      </div>

      <section className="card hero-card">
        <p className="eyebrow">오늘 시간표</p>
        {todayEntries.length > 0 ? (
          <ul className="agenda-list">
            {todayEntries.map((entry) => (
              <li key={entry.id} className="agenda-item">
                <span className="agenda-item__time">
                  {formatMinuteClock(entry.startMinute)} - {formatMinuteClock(entry.endMinute)}
                </span>
                <strong>{entry.title}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">
            아직 등록된 시간표가 없어요. 자율학습, 숙제, 독서처럼 원하는 이름으로 바로 시작하세요.
          </p>
        )}
      </section>

      <section className="card composer-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">자유 과제</p>
            <h2>과제명을 직접 입력해 집중 시작</h2>
          </div>
        </div>
        <label className="field">
          <span className="field__label">과제명</span>
          <input
            className="text-input"
            type="text"
            placeholder="예: 수학 숙제, 독서 20분"
            value={freeTaskTitle}
            onChange={(event) => setFreeTaskTitle(event.target.value)}
            disabled={Boolean(activeSession)}
            aria-invalid={Boolean(errorMessage)}
          />
        </label>
        <p className="field__hint">{helperText}</p>
        {errorMessage ? (
          <p className="feedback feedback--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? <p className="feedback feedback--success">{statusMessage}</p> : null}
        <button
          type="button"
          className="button button--primary"
          onClick={handleStart}
          disabled={Boolean(activeSession)}
        >
          자유 과제로 시작
        </button>
      </section>

      {activeSession ? (
        <section className="card active-session-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">진행 중 세션</p>
              <h2>{activeSession.freeTaskTitle}</h2>
            </div>
            <span className="status-badge status-badge--live">집중 중</span>
          </div>
          <dl className="stats-grid">
            <div className="stat-tile">
              <dt>시작 시각</dt>
              <dd>{formatStartedAt(activeSession.startedAt)}</dd>
            </div>
            <div className="stat-tile">
              <dt>경과 시간</dt>
              <dd>{formatElapsed(elapsedSeconds)}</dd>
            </div>
            <div className="stat-tile">
              <dt>목표 시간</dt>
              <dd>{activeSession.focusMinutes}분</dd>
            </div>
          </dl>
          <div className="action-row">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void handleFinish("finished")}
              disabled={isSubmitting}
            >
              완료로 기록
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => void handleFinish("user_stopped")}
              disabled={isSubmitting}
            >
              중단으로 기록
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
