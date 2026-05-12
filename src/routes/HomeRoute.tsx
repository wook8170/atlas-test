import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  ActiveTimerSnapshot,
  PomodoroSettings,
  WeeklyScheduleEntry,
} from "@/domain/types";
import {
  buildSessionFromSnapshot,
  createFocusTimerSnapshot,
  formatDuration,
  getElapsedSeconds,
  getPhaseLabel,
  getRemainingSeconds,
  isTimerComplete,
  isTimerPaused,
  pauseActiveTimer,
  resumeActiveTimer,
} from "@/domain/timer";
import {
  getCurrentScheduleEntry,
  minutesToClock,
  WEEKDAY_LABELS,
} from "@/domain/time";
import {
  LocalStateRepository,
  ScheduleRepository,
  SessionRepository,
} from "@/repositories";

export function HomeRoute() {
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [todayEntries, setTodayEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [snapshot, setSnapshot] = useState<ActiveTimerSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  async function refreshTodayEntries(referenceDate = new Date()): Promise<void> {
    const weekday = referenceDate.getDay() as WeeklyScheduleEntry["weekday"];
    const entries = await ScheduleRepository.listByWeekday(weekday);
    setTodayEntries(entries);
  }

  async function finishTimer(
    currentSnapshot: ActiveTimerSnapshot,
    status: "completed" | "interrupted" | "cancelled",
    endedAtMs = Date.now(),
  ): Promise<void> {
    if (
      currentSnapshot.phase === "focus" &&
      (status === "completed" || getElapsedSeconds(currentSnapshot, endedAtMs) > 0)
    ) {
      await SessionRepository.append(
        buildSessionFromSnapshot(currentSnapshot, status, endedAtMs),
      );
    }

    await LocalStateRepository.clearActiveTimer();
    setSnapshot(null);
    setNowMs(Date.now());
    setNotice(
      status === "completed"
        ? `${currentSnapshot.label} 집중을 끝까지 해냈어요.`
        : "진행 중이던 타이머를 정리했어요.",
    );
  }

  async function loadHome(): Promise<void> {
    setLoading(true);
    const [nextSettings, savedSnapshot] = await Promise.all([
      LocalStateRepository.getSettings(),
      LocalStateRepository.getActiveTimer(),
      refreshTodayEntries(new Date()),
    ]);
    setSettings(nextSettings);

    if (savedSnapshot) {
      if (isTimerComplete(savedSnapshot, Date.now())) {
        await finishTimer(savedSnapshot, "completed");
        setNotice("앱을 다시 열었을 때 이미 끝난 집중 시간을 기록으로 옮겼어요.");
      } else {
        setSnapshot(savedSnapshot);
        setNotice("진행 중이던 타이머를 이어서 불러왔어요.");
      }
    } else {
      setSnapshot(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadHome();
  }, []);

  useEffect(() => {
    if (!snapshot || isTimerPaused(snapshot)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      if (isTimerComplete(snapshot, nextNow)) {
        window.clearInterval(intervalId);
        void finishTimer(snapshot, "completed", nextNow);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [snapshot]);

  const currentEntry = getCurrentScheduleEntry(todayEntries, new Date(nowMs));
  const recommendedEntry = currentEntry ?? todayEntries[0];
  const remainingSeconds = snapshot
    ? getRemainingSeconds(snapshot, nowMs)
    : (settings?.focusMinutes ?? 25) * 60;
  const progressPercent = snapshot
    ? Math.min(
        100,
        Math.round(
          (getElapsedSeconds(snapshot, nowMs) / snapshot.targetDurationSec) * 100,
        ),
      )
    : 0;

  async function startFocus(entry?: WeeklyScheduleEntry): Promise<void> {
    if (snapshot) {
      setNotice("먼저 진행 중인 타이머를 끝내거나 멈춰 주세요.");
      return;
    }

    const nextSettings = settings ?? (await LocalStateRepository.getSettings());
    const nextSnapshot = createFocusTimerSnapshot({
      durationMinutes: nextSettings.focusMinutes,
      label: entry?.subject ?? "자유 집중",
      scheduleEntryId: entry?.id ?? null,
    });

    await LocalStateRepository.saveActiveTimer(nextSnapshot);
    setSettings(nextSettings);
    setSnapshot(nextSnapshot);
    setNowMs(Date.now());
    setNotice(
      entry ? `${entry.subject} 집중을 시작했어요.` : "자유 집중을 시작했어요.",
    );
  }

  async function handlePause(): Promise<void> {
    if (!snapshot) return;
    const paused = pauseActiveTimer(snapshot);
    await LocalStateRepository.saveActiveTimer(paused);
    setSnapshot(paused);
    setNotice("잠깐 멈추고 있어요.");
  }

  async function handleResume(): Promise<void> {
    if (!snapshot) return;
    const resumed = resumeActiveTimer(snapshot);
    await LocalStateRepository.saveActiveTimer(resumed);
    setSnapshot(resumed);
    setNowMs(Date.now());
    setNotice("다시 이어서 하고 있어요.");
  }

  async function handleStop(): Promise<void> {
    if (!snapshot) return;
    await finishTimer(snapshot, "cancelled");
  }

  if (loading) {
    return (
      <section className="route route--home">
        <div className="panel">
          <p className="route__muted">저장된 시간표와 타이머를 불러오는 중이에요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="route route--home">
      <div className="route__stack">
        {notice ? <div className="notice-card">{notice}</div> : null}

        <section className="hero-card">
          <p className="hero-card__eyebrow">
            {snapshot ? getPhaseLabel(snapshot.phase) : "지금 시작할 준비"}
          </p>
          <h1 className="hero-card__title">
            {snapshot
              ? snapshot.label
              : currentEntry
                ? `${currentEntry.subject} 전 집중 준비`
                : "오늘의 첫 집중을 시작해 볼까요?"}
          </h1>
          <p className="hero-card__subtitle">
            {snapshot
              ? isTimerPaused(snapshot)
                ? "잠깐 멈춘 상태예요. 다시 이어서 할 수 있어요."
                : "앱을 닫았다가 다시 열어도 같은 타이머를 이어서 복원해요."
              : "기본 저장 방식은 그대로 두고, 진행 중 타이머만 별도 스냅샷으로 기억해요."}
          </p>

          <div className="timer-readout">{formatDuration(remainingSeconds)}</div>
          <div
            aria-hidden="true"
            className="progress-bar"
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="timer-meta">
            <span>기본 집중 {settings?.focusMinutes ?? 25}분</span>
            <span>오늘 {WEEKDAY_LABELS[new Date(nowMs).getDay()]}요일 시간표</span>
          </div>

          <div className="action-row">
            {!snapshot ? (
              <button
                className="button button--primary"
                onClick={() => void startFocus(recommendedEntry)}
                type="button"
              >
                {recommendedEntry ? `${recommendedEntry.subject} 집중 시작` : "집중 시작"}
              </button>
            ) : isTimerPaused(snapshot) ? (
              <button
                className="button button--primary"
                onClick={() => void handleResume()}
                type="button"
              >
                계속하기
              </button>
            ) : (
              <button
                className="button button--primary"
                onClick={() => void handlePause()}
                type="button"
              >
                잠깐 멈춤
              </button>
            )}

            {snapshot ? (
              <button
                className="button button--ghost"
                onClick={() => void handleStop()}
                type="button"
              >
                여기서 종료
              </button>
            ) : (
              <Link className="button button--ghost" to="/settings">
                시간 바꾸기
              </Link>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>오늘 시간표</h2>
              <p>
                저장된 시간표는 새로고침 후에도 같은 Dexie 저장소에서 다시 읽어와요.
              </p>
            </div>
            <Link className="text-link" to="/timetable">
              시간표 수정
            </Link>
          </div>

          {todayEntries.length === 0 ? (
            <div className="empty-card">
              <p className="empty-card__title">아직 오늘 시간표가 없어요.</p>
              <p className="route__muted">
                시간표 탭에서 과목과 시간을 저장해 두면 이 화면이 그대로 복원돼요.
              </p>
            </div>
          ) : (
            <ul className="schedule-list">
              {todayEntries.map((entry) => {
                const isCurrent = currentEntry?.id === entry.id;
                const isLinked = snapshot?.scheduleEntryId === entry.id;
                return (
                  <li
                    className={`schedule-card${isCurrent ? " schedule-card--current" : ""}`}
                    key={entry.id}
                  >
                    <div className="schedule-card__time">
                      {minutesToClock(entry.startMinute)} - {minutesToClock(entry.endMinute)}
                    </div>
                    <div className="schedule-card__content">
                      <strong>{entry.subject}</strong>
                      <p>
                        {isLinked
                          ? "현재 타이머와 연결되어 있어요."
                          : isCurrent
                            ? "지금 이 시간표에 맞춰 집중하기 좋아요."
                            : "저장된 시간표 항목이에요."}
                      </p>
                    </div>
                    <button
                      className="button button--secondary"
                      disabled={Boolean(snapshot)}
                      onClick={() => void startFocus(entry)}
                      type="button"
                    >
                      {snapshot ? "진행 중" : "이 과목으로 시작"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
