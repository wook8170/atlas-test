import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { PomodoroSession, TodaySummary, WeeklyScheduleEntry } from "@/domain/types";
import { WEEKDAY_LABELS, createDefaultSettings } from "@/lib/constants";
import { getErrorMessage, markLatestRetryResult, recordError } from "@/lib/errors";
import {
  createId,
  formatDateTime,
  formatMinuteLabel,
  formatMinutes,
  getLocalDateKey,
} from "@/lib/time";
import { LocalStateRepository, ScheduleRepository, SessionRepository } from "@/repositories";

type ActiveSession = {
  id: string;
  scheduleEntryId: string;
  subjectLabel: string;
  startedAt: string;
  localDateKey: string;
  focusMinutes: number;
  breakMinutes: number;
  color: string;
};

export function HomeRoute() {
  const [agenda, setAgenda] = useState<WeeklyScheduleEntry[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [settings, setSettings] = useState(createDefaultSettings());

  useEffect(() => {
    void loadHome();
  }, []);

  async function loadHome(): Promise<void> {
    const now = new Date();
    const weekday = now.getDay();
    const dateKey = getLocalDateKey(now);
    setLoading(true);

    try {
      const [entries, todaySummary, currentSettings] = await Promise.all([
        ScheduleRepository.listByWeekday(weekday),
        SessionRepository.todaySummary(dateKey),
        LocalStateRepository.getSettings(),
      ]);
      setAgenda(entries.filter((entry) => entry.isActive));
      setSummary(todaySummary);
      setSettings(currentSettings);
      setError(null);
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      await recordError("home_load", loadError);
    } finally {
      setLoading(false);
    }
  }

  function handleStart(entry: WeeklyScheduleEntry): void {
    if (activeSession) {
      setStatus("이미 진행 중인 집중 세션이 있어요.");
      return;
    }

    const startedAt = new Date();
    setActiveSession({
      id: createId("session"),
      scheduleEntryId: entry.id,
      subjectLabel: entry.subject,
      startedAt: startedAt.toISOString(),
      localDateKey: getLocalDateKey(startedAt),
      focusMinutes: entry.focusMinutes ?? settings.focusMinutes,
      breakMinutes: entry.breakMinutes ?? settings.breakMinutes,
      color: entry.color,
    });
    setStatus(`${entry.subject} 집중 세션을 시작했어요.`);
  }

  async function finalizeSession(
    completionStatus: PomodoroSession["status"],
  ): Promise<void> {
    if (!activeSession) return;

    const action = "home_session_save";
    const endedAt = new Date();
    const elapsedSeconds = Math.max(
      60,
      Math.floor(
        (endedAt.getTime() - new Date(activeSession.startedAt).getTime()) / 1000,
      ),
    );
    const durationSec =
      completionStatus === "completed"
        ? activeSession.focusMinutes * 60
        : elapsedSeconds;
    const session: PomodoroSession = {
      id: activeSession.id,
      sessionType: "focus",
      scheduleEntryId: activeSession.scheduleEntryId,
      subjectLabel: activeSession.subjectLabel,
      localDateKey: activeSession.localDateKey,
      startedAt: activeSession.startedAt,
      endedAt: endedAt.toISOString(),
      plannedFocusMinutes: activeSession.focusMinutes,
      plannedBreakMinutes: activeSession.breakMinutes,
      durationSec,
      status: completionStatus,
      rewardEarned: completionStatus === "completed" ? 1 : 0,
      schemaVersion: 1,
    };

    try {
      await SessionRepository.save(session);
      await markLatestRetryResult(action, "retry_succeeded");
      setStatus(
        completionStatus === "completed"
          ? "세션을 완료했고 스티커 1개를 지급했어요."
          : completionStatus === "interrupted"
            ? "세션을 중단으로 기록했어요."
            : "세션을 취소로 기록했어요."
      );
      setActiveSession(null);
      await loadHome();
    } catch (saveError) {
      await markLatestRetryResult(action, "retry_failed");
      await recordError(action, saveError);
      setError(getErrorMessage(saveError));
    }
  }

  const todayLabel = WEEKDAY_LABELS[new Date().getDay()];

  return (
    <section className="route route--home">
      <div className="route-hero">
        <div>
          <p className="route-eyebrow">오늘의 학습 흐름</p>
          <h1>{todayLabel} 시간표에서 바로 집중 시작</h1>
        </div>
        <Link className="ghost-link" to="/records">
          오늘 기록 보기
        </Link>
      </div>

      {status ? <div className="inline-banner inline-banner--success">{status}</div> : null}
      {error ? <div className="inline-banner inline-banner--danger">{error}</div> : null}

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-card__label">완료 세션</span>
          <strong>{summary?.completedSessions ?? 0}건</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">집중 시간</span>
          <strong>{formatMinutes(summary?.totalFocusMinutes ?? 0)}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">오늘 스티커</span>
          <strong>{summary?.todayStickerCount ?? 0}개</strong>
        </article>
      </div>

      {activeSession ? (
        <section className="panel panel--active-session">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">진행 중</p>
              <h2>{activeSession.subjectLabel}</h2>
            </div>
            <span
              className="color-chip"
              style={{ backgroundColor: activeSession.color }}
              aria-hidden
            />
          </div>
          <p className="panel__meta">
            시작 시각 {formatDateTime(activeSession.startedAt)} · 집중 {activeSession.focusMinutes}
            분 / 휴식 {activeSession.breakMinutes}분
          </p>
          <div className="action-row">
            <button className="button button--primary" onClick={() => void finalizeSession("completed")}>
              완료 처리
            </button>
            <button className="button button--subtle" onClick={() => void finalizeSession("interrupted")}>
              중단
            </button>
            <button className="button button--ghost" onClick={() => void finalizeSession("cancelled")}>
              취소
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{todayLabel}</p>
            <h2>오늘 시간표</h2>
          </div>
          <Link className="ghost-link" to="/timetable">
            시간표 수정
          </Link>
        </div>

        {loading ? <p className="muted-copy">오늘 시간표를 불러오는 중입니다.</p> : null}
        {!loading && agenda.length === 0 ? (
          <div className="empty-card">
            <h3>오늘 등록된 학습 칸이 없어요.</h3>
            <p>시간표 화면에서 과목, 시작/종료 시각, 집중/휴식 시간을 먼저 등록하세요.</p>
            <Link className="button button--primary" to="/timetable">
              시간표 보러 가기
            </Link>
          </div>
        ) : null}

        <div className="card-list">
          {agenda.map((entry) => {
            const running = activeSession?.scheduleEntryId === entry.id;
            return (
              <article key={entry.id} className="schedule-card">
                <div className="schedule-card__header">
                  <div>
                    <h3>{entry.subject}</h3>
                    <p>
                      {formatMinuteLabel(entry.startMinute)} - {formatMinuteLabel(entry.endMinute)}
                    </p>
                  </div>
                  <span className={`status-pill ${running ? "status-pill--active" : ""}`}>
                    {running ? "진행 중" : "준비"}
                  </span>
                </div>
                <div className="schedule-card__details">
                  <span>집중 {entry.focusMinutes}분</span>
                  <span>휴식 {entry.breakMinutes}분</span>
                  <span>누적 {summary?.bySubject.find((item) => item.subject === entry.subject)?.count ?? 0}회</span>
                </div>
                <button
                  className="button button--primary button--block"
                  disabled={running}
                  onClick={() => handleStart(entry)}
                >
                  집중 시작
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
