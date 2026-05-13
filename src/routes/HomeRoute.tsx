import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ErrorLogRepository,
  LocalStateRepository,
  ScheduleRepository,
  SessionRepository,
} from "@/repositories";
import type {
  ErrorLog,
  PomodoroSettings,
  PomodoroSession,
  TodaySummary,
  WeeklyScheduleEntry,
} from "@/domain/types";

const FALLBACK_SETTINGS: PomodoroSettings = {
  id: "default",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  schemaVersion: 1,
};

const EMPTY_SUMMARY: TodaySummary = {
  date: "",
  completedSessions: 0,
  totalFocusMinutes: 0,
  bySubject: [],
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type TimerPhase = "idle" | "running" | "paused" | "completed";
type FeedbackMode = "visual" | "sound" | "vibration";

type SessionDraft = {
  id: string;
  startedAt: string;
  plannedDurationSec: number;
  remainingAtRunStartSec: number;
  runStartedAtMs: number | null;
  scheduleEntryId?: string;
};

type CompletionBanner = {
  title: string;
  description: string;
  feedback: FeedbackMode;
};

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinuteOfDay(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getScheduleLabel(entry?: WeeklyScheduleEntry): string {
  if (!entry) return "자유 집중";
  return `${entry.subject} · ${formatMinuteOfDay(entry.startMinute)}-${formatMinuteOfDay(entry.endMinute)}`;
}

export function getDefaultScheduleEntry(
  entries: WeeklyScheduleEntry[],
  currentMinute: number,
): WeeklyScheduleEntry | undefined {
  return (
    entries.find(
      (entry) =>
        entry.startMinute <= currentMinute && currentMinute < entry.endMinute,
    ) ??
    entries.find((entry) => entry.startMinute >= currentMinute) ??
    entries[0]
  );
}

export function getRemainingSeconds(draft: SessionDraft, nowMs: number): number {
  if (!draft.runStartedAtMs) return draft.remainingAtRunStartSec;
  const elapsedSeconds = Math.floor((nowMs - draft.runStartedAtMs) / 1000);
  return Math.max(0, draft.remainingAtRunStartSec - elapsedSeconds);
}

export function createSessionRecord(
  draft: SessionDraft,
  status: PomodoroSession["status"],
  remainingSeconds: number,
): PomodoroSession {
  return {
    id: draft.id,
    scheduleEntryId: draft.scheduleEntryId,
    startedAt: draft.startedAt,
    endedAt: new Date().toISOString(),
    durationSec:
      status === "completed"
        ? draft.plannedDurationSec
        : Math.max(0, draft.plannedDurationSec - remainingSeconds),
    status,
    schemaVersion: 1,
  };
}

function buildErrorLog(action: string, reason: string): ErrorLog {
  return {
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    action,
    reason,
    schemaVersion: 1,
  };
}

export function HomeRoute() {
  const today = useMemo(() => new Date(), []);
  const weekday = today.getDay();
  const todayKey = today.toISOString().slice(0, 10);

  const [settings, setSettings] = useState<PomodoroSettings>(FALLBACK_SETTINGS);
  const [summary, setSummary] = useState<TodaySummary>(EMPTY_SUMMARY);
  const [scheduleEntries, setScheduleEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [selectedScheduleEntryId, setSelectedScheduleEntryId] = useState("");
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(
    FALLBACK_SETTINGS.focusMinutes * 60,
  );
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completionBanner, setCompletionBanner] = useState<CompletionBanner | null>(
    null,
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const completionGuardRef = useRef(false);

  const focusDurationSeconds = settings.focusMinutes * 60;
  const progress = draft
    ? (draft.plannedDurationSec - remainingSeconds) / draft.plannedDurationSec
    : phase === "completed"
      ? 1
      : 0;

  const selectedScheduleEntry =
    scheduleEntries.find((entry) => entry.id === selectedScheduleEntryId) ??
    undefined;

  const phaseTitle =
    phase === "running"
      ? "집중 중"
      : phase === "paused"
        ? "잠깐 쉬는 중"
        : phase === "completed"
          ? "집중 완료"
          : "집중 시작 준비";

  const phaseDescription =
    phase === "running"
      ? "버튼 한 번으로 일시정지하거나 종료할 수 있어요."
      : phase === "paused"
        ? "재개해서 이어 하거나 종료 또는 리셋할 수 있어요."
        : phase === "completed"
          ? "완료 피드백을 보냈어요. 다시 시작하거나 리셋하세요."
          : "준비가 되면 바로 시작하세요.";

  useEffect(() => {
    void loadHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      setRemainingSeconds(focusDurationSeconds);
    }
  }, [focusDurationSeconds, phase]);

  useEffect(() => {
    if (phase !== "running" || !draft) return;

    const tick = () => {
      const nextRemaining = getRemainingSeconds(draft, Date.now());
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0 && !completionGuardRef.current) {
        completionGuardRef.current = true;
        void handleCompletion(draft);
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [draft, phase]);

  async function loadHomeData(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [loadedSettings, loadedScheduleEntries, loadedSummary] =
        await Promise.all([
          LocalStateRepository.getSettings(),
          ScheduleRepository.listByWeekday(weekday),
          SessionRepository.todaySummary(todayKey),
        ]);

      setSettings(loadedSettings);
      setSummary(loadedSummary);
      setScheduleEntries(loadedScheduleEntries);
      setSelectedScheduleEntryId((current) => {
        if (
          current &&
          loadedScheduleEntries.some((entry) => entry.id === current)
        ) {
          return current;
        }
        return (
          getDefaultScheduleEntry(
            loadedScheduleEntries,
            today.getHours() * 60 + today.getMinutes(),
          )?.id ?? ""
        );
      });
    } catch (error) {
      await reportError(
        "home.load",
        error,
        "홈 화면 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function reportError(
    action: string,
    error: unknown,
    message: string,
  ): Promise<void> {
    setErrorMessage(message);
    const reason =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    try {
      await ErrorLogRepository.append(buildErrorLog(action, reason));
    } catch {
      // IndexedDB 자체가 실패하면 추가 기록은 포기하고 화면 안내만 유지한다.
    }
  }

  function getAudioContext(): AudioContext | null {
    const AudioContextCtor =
      globalThis.AudioContext ??
      (globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }

  async function primeAudio(): Promise<void> {
    const context = getAudioContext();
    if (context && context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        // 완료 시점에 다시 시도한다.
      }
    }
  }

  async function playCompletionBeep(): Promise<boolean> {
    const context = getAudioContext();
    if (!context) return false;
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(784, context.currentTime);
    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.32);
    return true;
  }

  async function deliverCompletionFeedback(): Promise<FeedbackMode> {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([180, 120, 180]);
      return "vibration";
    }
    return (await playCompletionBeep()) ? "sound" : "visual";
  }

  async function persistSession(
    sessionDraft: SessionDraft,
    status: PomodoroSession["status"],
    remainingSec: number,
  ): Promise<void> {
    const record = createSessionRecord(sessionDraft, status, remainingSec);
    try {
      await SessionRepository.append(record);
      setSummary(await SessionRepository.todaySummary(todayKey));
    } catch (error) {
      await reportError(
        "session.persist",
        error,
        "세션 기록 저장에 실패했어요. 그래도 타이머는 계속 사용할 수 있어요.",
      );
    }
  }

  async function handleCompletion(sessionDraft: SessionDraft): Promise<void> {
    const feedback = await deliverCompletionFeedback();
    await persistSession(sessionDraft, "completed", 0);
    setPhase("completed");
    setDraft(null);
    setRemainingSeconds(0);
    setCompletionBanner({
      title: "집중 시간이 끝났어요!",
      description:
        feedback === "vibration"
          ? "기기가 진동으로 완료를 알려줬어요."
          : feedback === "sound"
            ? "짧은 소리로 완료를 알려줬어요."
            : "화면 알림으로 완료를 알려주고 있어요.",
      feedback,
    });
  }

  async function handleStart(): Promise<void> {
    completionGuardRef.current = false;
    setCompletionBanner(null);
    setErrorMessage(null);
    await primeAudio();

    const newDraft: SessionDraft = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      plannedDurationSec: focusDurationSeconds,
      remainingAtRunStartSec: focusDurationSeconds,
      runStartedAtMs: Date.now(),
      scheduleEntryId: selectedScheduleEntry?.id,
    };

    setDraft(newDraft);
    setRemainingSeconds(focusDurationSeconds);
    setPhase("running");
  }

  function handlePause(): void {
    if (!draft || phase !== "running") return;
    const pausedRemaining = getRemainingSeconds(draft, Date.now());
    setDraft({
      ...draft,
      remainingAtRunStartSec: pausedRemaining,
      runStartedAtMs: null,
    });
    setRemainingSeconds(pausedRemaining);
    setPhase("paused");
  }

  function handleResume(): void {
    if (!draft || phase !== "paused") return;
    completionGuardRef.current = false;
    setDraft({
      ...draft,
      runStartedAtMs: Date.now(),
    });
    setPhase("running");
  }

  async function handleStop(): Promise<void> {
    if (!draft) return;
    const latestRemaining =
      phase === "running" ? getRemainingSeconds(draft, Date.now()) : remainingSeconds;
    await persistSession(draft, "interrupted", latestRemaining);
    setDraft(null);
    setPhase("idle");
    setRemainingSeconds(focusDurationSeconds);
    setCompletionBanner(null);
    completionGuardRef.current = false;
  }

  async function handleReset(): Promise<void> {
    if (draft) {
      const latestRemaining =
        phase === "running"
          ? getRemainingSeconds(draft, Date.now())
          : remainingSeconds;
      await persistSession(draft, "cancelled", latestRemaining);
    }
    setDraft(null);
    setPhase("idle");
    setRemainingSeconds(focusDurationSeconds);
    setCompletionBanner(null);
    completionGuardRef.current = false;
  }

  return (
    <section className="route route--home home-route">
      <article className="home-card home-card--timer">
        <div className="home-card__eyebrow">
          {WEEKDAY_LABELS[weekday]}요일 루틴
        </div>
        <h1>{phaseTitle}</h1>
        <p className="home-card__description">{phaseDescription}</p>

        <div
          className="timer-ring"
          style={
            {
              "--timer-progress": `${Math.max(0, Math.min(1, progress))}`,
            } as CSSProperties
          }
        >
          <div className="timer-ring__inner">
            <div className="timer-ring__time">{formatClock(remainingSeconds)}</div>
            <div className="timer-ring__label">
              {getScheduleLabel(selectedScheduleEntry)}
            </div>
          </div>
        </div>

        {completionBanner ? (
          <div className="completion-banner" aria-live="polite">
            <strong>{completionBanner.title}</strong>
            <p>{completionBanner.description}</p>
          </div>
        ) : null}

        <div className="timer-controls">
          {phase === "idle" || phase === "completed" ? (
            <button className="button button--primary" onClick={() => void handleStart()}>
              시작
            </button>
          ) : null}
          {phase === "running" ? (
            <button className="button button--secondary" onClick={handlePause}>
              일시정지
            </button>
          ) : null}
          {phase === "paused" ? (
            <button className="button button--secondary" onClick={handleResume}>
              재개
            </button>
          ) : null}
          {phase === "running" || phase === "paused" ? (
            <>
              <button className="button button--ghost" onClick={() => void handleStop()}>
                종료
              </button>
              <button className="button button--ghost" onClick={() => void handleReset()}>
                리셋
              </button>
            </>
          ) : null}
          {phase === "completed" ? (
            <button className="button button--ghost" onClick={() => void handleReset()}>
              다시 준비
            </button>
          ) : null}
        </div>
      </article>

      <div className="home-grid">
        <article className="home-card">
          <div className="home-card__eyebrow">오늘의 연결 블록</div>
          <h2>시간표와 연결해서 기록하기</h2>
          <p className="home-card__description">
            시간표가 비어 있으면 자유 집중으로 저장돼요.
          </p>

          {isLoading ? (
            <p className="home-card__muted">오늘 시간표를 불러오는 중이에요.</p>
          ) : scheduleEntries.length === 0 ? (
            <p className="home-card__muted">
              오늘 등록된 시간표가 없어요. 바로 자유 집중을 시작할 수 있어요.
            </p>
          ) : (
            <label className="field">
              <span className="field__label">세션을 연결할 시간표</span>
              <select
                className="field__control"
                value={selectedScheduleEntryId}
                onChange={(event) => setSelectedScheduleEntryId(event.target.value)}
                disabled={phase === "running"}
              >
                {scheduleEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {getScheduleLabel(entry)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </article>

        <article className="home-card">
          <div className="home-card__eyebrow">오늘 요약</div>
          <h2>완료한 집중</h2>
          <div className="stats-grid">
            <div className="stat-pill">
              <strong>{summary.completedSessions}</strong>
              <span>완료 횟수</span>
            </div>
            <div className="stat-pill">
              <strong>{summary.totalFocusMinutes}</strong>
              <span>집중 분</span>
            </div>
          </div>
          <p className="home-card__muted">
            {summary.completedSessions > 0
              ? "집중 세션이 끝나면 기록이 바로 갱신돼요."
              : "첫 세션을 마치면 여기서 오늘 기록을 볼 수 있어요."}
          </p>
        </article>

        <article className="home-card">
          <div className="home-card__eyebrow">현재 설정</div>
          <h2>이번 세션 길이</h2>
          <div className="settings-chips">
            <span className="settings-chip">
              집중 {settings.focusMinutes}분
            </span>
            <span className="settings-chip">
              휴식 {settings.breakMinutes}분
            </span>
          </div>
          <p className="home-card__muted">
            완료되면 화면 안내와 함께 가능한 기기에서는 소리 또는 진동으로 알려줘요.
          </p>
        </article>
      </div>

      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
    </section>
  );
}
