import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  createEmptyTodaySummary,
  isCompletedFocusSession,
  sessionElapsedSeconds,
  sessionSubjectLabel,
  sortSessionsNewestFirst,
} from "@/domain/sessionUtils";
import type {
  PomodoroSettings,
  SessionRecord,
  TodaySummary,
  WeeklyScheduleEntry,
} from "@/domain/types";
import { DEFAULT_SETTINGS, LocalStateRepository } from "@/repositories/LocalStateRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import {
  advanceTimerPhase,
  createInitialTimer,
  formatClock,
  getPhaseLabel,
  type TimerSignal,
  type TimerSnapshot,
} from "./homeTimerModel";
import {
  describeEntryTiming,
  findClosestEntry,
  formatScheduleWindow,
  isEntryInProgress,
  minutesSinceMidnight,
} from "./homeRouteUtils";

type TimerStatus = "idle" | "running" | "paused";

interface TimerState extends TimerSnapshot {
  status: TimerStatus;
}

type BrowserAudioContext = AudioContext & { close?: () => Promise<void> };

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function createIdleTimer(settings: PomodoroSettings): TimerState {
  return {
    ...createInitialTimer(settings),
    status: "idle",
  };
}

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSessionClock(value: string): string {
  const [, time = ""] = value.split("T");
  return time.slice(0, 5) || "--:--";
}

export function HomeRoute() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [timer, setTimer] = useState<TimerState>(() => createIdleTimer(DEFAULT_SETTINGS));
  const [signal, setSignal] = useState<TimerSignal | null>(null);
  const [summary, setSummary] = useState<TodaySummary>(() => createEmptyTodaySummary(todayKey()));
  const [recentCompleted, setRecentCompleted] = useState<SessionRecord[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [activeTaskTitle, setActiveTaskTitle] = useState("자유 공부");
  const [now, setNow] = useState(() => new Date());
  const [scheduleEntries, setScheduleEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const timerRef = useRef(timer);
  const settingsRef = useRef(settings);
  const deadlineRef = useRef<number | null>(null);
  const audioContextRef = useRef<BrowserAudioContext | null>(null);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let active = true;

    void LocalStateRepository.getSettings()
      .then((nextSettings) => {
        if (!active) {
          return;
        }
        setSettings(nextSettings);
        setTimer((current) => (current.status === "idle" ? createIdleTimer(nextSettings) : current));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSettings(DEFAULT_SETTINGS);
        setTimer((current) => (current.status === "idle" ? createIdleTimer(DEFAULT_SETTINGS) : current));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    setScheduleLoading(true);

    void ScheduleRepository.listByWeekday(now.getDay())
      .then((entries) => {
        if (!active) return;
        setScheduleEntries(entries);
        setScheduleLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setScheduleEntries([]);
        setScheduleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [now]);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const date = todayKey();
      const [sessions, todaySummary] = await Promise.all([
        SessionRepository.listByDate(date),
        SessionRepository.todaySummary(date),
      ]);

      if (!active) {
        return;
      }

      setSummary(todaySummary);
      setRecentCompleted(sortSessionsNewestFirst(sessions).filter(isCompletedFocusSession).slice(0, 3));
      setSummaryLoading(false);
    }

    void loadSummary().catch(() => {
      if (active) {
        setSummary(createEmptyTodaySummary(todayKey()));
        setRecentCompleted([]);
        setSummaryLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (timer.status !== "running") {
      deadlineRef.current = null;
      return;
    }

    deadlineRef.current = Date.now() + timer.remainingSeconds * 1000;
    const intervalId = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (!deadline) {
        return;
      }
      const nextRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimer((current) => {
        if (current.status !== "running" || current.remainingSeconds === nextRemaining) {
          return current;
        }
        return { ...current, remainingSeconds: nextRemaining };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status !== "running" || timer.remainingSeconds !== 0) {
      return;
    }

    const { next, signal: nextSignal } = advanceTimerPhase(timer, settingsRef.current);
    deadlineRef.current = Date.now() + next.totalSeconds * 1000;
    setSignal(nextSignal);
    playSignalTone(audioContextRef.current, nextSignal.kind);
    setTimer({ ...next, status: "running" });
  }, [timer]);

  useEffect(() => {
    if (!signal) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSignal(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [signal]);

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      if (audioContext && typeof audioContext.close === "function") {
        void audioContext.close();
      }
    };
  }, []);

  const paused = timer.status === "paused";
  const currentMinute = minutesSinceMidnight(now);
  const closestEntry = findClosestEntry(scheduleEntries, currentMinute);

  async function primeAudio() {
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    const currentAudioContext = audioContextRef.current ?? new AudioCtor();
    audioContextRef.current = currentAudioContext;
    if (currentAudioContext.state === "suspended") {
      try {
        await currentAudioContext.resume();
      } catch {
        return;
      }
    }
  }

  function startTimer(nextTaskTitle?: string) {
    void primeAudio();
    const title = nextTaskTitle?.trim() || taskTitle.trim() || "자유 공부";
    setActiveTaskTitle(title);
    setTaskTitle(title === "자유 공부" ? "" : title);
    setSignal(null);
    setTimer({ ...createInitialTimer(settingsRef.current), status: "running" });
  }

  function pauseTimer() {
    const deadline = deadlineRef.current;
    const remainingSeconds = deadline
      ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      : timerRef.current.remainingSeconds;

    setTimer((current) => ({ ...current, status: "paused", remainingSeconds }));
  }

  function resumeTimer() {
    void primeAudio();
    setTimer((current) => ({ ...current, status: "running" }));
  }

  function stopTimer() {
    setSignal(null);
    setActiveTaskTitle("자유 공부");
    setTimer(createIdleTimer(settingsRef.current));
  }

  const nextBreakMinutes =
    (timer.completedFocusSessions + 1) % Math.max(1, Math.round(settings.longBreakEvery)) === 0
      ? settings.longBreakMinutes
      : settings.breakMinutes;

  return (
    <section className={`route route--home home-timer home-timer--${timer.phase}`}>
      <div className="home-timer__panel">
        <p className="home-timer__eyebrow">오늘의 타이머</p>
        <h1 className="home-timer__clock">{formatClock(timer.remainingSeconds)}</h1>
        <p className="home-timer__subject">{activeTaskTitle}</p>
        <p className="home-timer__phase">{getPhaseLabel(timer.phase, paused)}</p>
        <p className="home-timer__hint">
          집중이나 휴식이 끝나면 화면 신호가 바로 뜨고, 브라우저 소리가 허용되면 효과음도
          함께 재생됩니다.
        </p>
      </div>

      {signal ? (
        <div
          className={`home-timer__signal home-timer__signal--${signal.accent}`}
          role="status"
          aria-live="assertive"
        >
          <strong>{signal.title}</strong>
          <span>{signal.message}</span>
        </div>
      ) : null}

      <dl className="home-timer__stats">
        <div>
          <dt>집중</dt>
          <dd>{settings.focusMinutes}분</dd>
        </div>
        <div>
          <dt>짧은 휴식</dt>
          <dd>{settings.breakMinutes}분</dd>
        </div>
        <div>
          <dt>다음 휴식</dt>
          <dd>{timer.phase === "focus" ? `${nextBreakMinutes}분` : `${settings.focusMinutes}분`}</dd>
        </div>
        <div>
          <dt>완료한 집중</dt>
          <dd>{timer.completedFocusSessions}회</dd>
        </div>
      </dl>

      <div className="home-timer__actions">
        <label className="home-timer__field">
          <span>자유 과제명</span>
          <input
            type="text"
            placeholder="예: 수학 숙제, 독서 20분"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            disabled={timer.status !== "idle"}
          />
        </label>
        {timer.status === "idle" ? (
          <button
            type="button"
            className="home-timer__button home-timer__button--primary"
            onClick={() => startTimer()}
          >
            집중 시작
          </button>
        ) : null}
        {timer.status === "running" ? (
          <button type="button" className="home-timer__button home-timer__button--primary" onClick={pauseTimer}>
            일시정지
          </button>
        ) : null}
        {timer.status === "paused" ? (
          <button type="button" className="home-timer__button home-timer__button--primary" onClick={resumeTimer}>
            다시 시작
          </button>
        ) : null}
        {timer.status !== "idle" ? (
          <button type="button" className="home-timer__button home-timer__button--ghost" onClick={stopTimer}>
            끝내기
          </button>
        ) : null}
      </div>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>지금 가까운 시간표</h2>
            <p>
              현재 시각을 기준으로 가장 가까운 블록을 강조하고 바로 집중을 시작합니다.
            </p>
          </div>
          <Link className="cta-link" to="/timetable">
            시간표 열기
          </Link>
        </div>
        {scheduleLoading ? (
          <p className="empty-state">오늘 시간표를 불러오는 중입니다.</p>
        ) : scheduleEntries.length === 0 ? (
          <p className="empty-state">
            오늘 등록된 시간표가 없습니다. 시간표 탭에서 과목을 추가해 보세요.
          </p>
        ) : (
          <div className="home-schedule-list">
            {scheduleEntries.map((entry) => {
              const isClosest = closestEntry?.id === entry.id;
              const isCurrent = isEntryInProgress(entry, currentMinute);
              return (
                <article
                  className={[
                    "home-schedule-card",
                    isClosest ? "home-schedule-card--closest" : "",
                    isCurrent ? "home-schedule-card--current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={entry.id}
                  style={{ "--schedule-color": entry.subjectColor } as CSSProperties}
                >
                  <div className="home-schedule-card__main">
                    <span>{formatScheduleWindow(entry)}</span>
                    <strong>{entry.subjectName}</strong>
                    <p>{describeEntryTiming(entry, currentMinute)}</p>
                  </div>
                  <div className="home-schedule-card__actions">
                    {isClosest ? (
                      <span className="home-schedule-badge">가장 가까움</span>
                    ) : null}
                    {isCurrent ? (
                      <span className="home-schedule-badge home-schedule-badge--solid">
                        지금
                      </span>
                    ) : null}
                    <button
                      className="home-timer__button home-timer__button--ghost"
                      disabled={timer.status !== "idle"}
                      onClick={() => startTimer(entry.subjectName)}
                      type="button"
                    >
                      이 과목으로 시작
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>오늘의 집중 기록</h2>
            <p>완료한 집중 세션과 최근 기록을 한눈에 확인합니다.</p>
          </div>
          <Link className="cta-link" to="/records">
            기록 열기
          </Link>
        </div>
        <div className="summary-grid">
          <article className="metric-card metric-card--strong">
            <span className="metric-card__label">완료 세션</span>
            <strong>{summaryLoading ? "-" : `${summary.completedSessions}회`}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">집중 시간</span>
            <strong>{summaryLoading ? "-" : `${Math.round(summary.totalFocusMinutes)}분`}</strong>
          </article>
        </div>
      </section>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>최근 완료 세션</h2>
            <p>완료된 집중 세션만 최근 순서로 보여줍니다.</p>
          </div>
        </div>
        {recentCompleted.length > 0 ? (
          <ul className="session-list">
            {recentCompleted.map((session) => (
              <li className="session-list__item" key={session.id}>
                <div>
                  <strong>{sessionSubjectLabel(session)}</strong>
                  <p>
                    {formatSessionClock(session.startedAt)} - {formatSessionClock(session.endedAt)} ·{" "}
                    {Math.round(sessionElapsedSeconds(session) / 60)}분
                  </p>
                </div>
                <span className="status-pill status-pill--completed">완료</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            오늘 완료된 집중 세션이 아직 없습니다. 기록 탭에서 첫 세션을 남겨보세요.
          </p>
        )}
      </section>
    </section>
  );
}

function playSignalTone(
  audioContext: BrowserAudioContext | null,
  kind: TimerSignal["kind"],
) {
  if (!audioContext || audioContext.state === "closed") {
    return;
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }

  const notes = kind === "focus-complete" ? [784, 988] : [988, 784];
  notes.forEach((note, index) => {
    const startAt = audioContext.currentTime + index * 0.18;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.16);
  });
}
