import { useEffect, useState } from "react";

import type { PomodoroSession, TodaySummary } from "@/domain/types";
import { getErrorMessage, recordError } from "@/lib/errors";
import { formatDateTime, formatMinutes, getLocalDateKey } from "@/lib/time";
import { SessionRepository } from "@/repositories";

export function RecordsRoute() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords(): Promise<void> {
    const today = getLocalDateKey(new Date());
    try {
      const [todaySummary, todaySessions] = await Promise.all([
        SessionRepository.todaySummary(today),
        SessionRepository.listByDate(today),
      ]);
      setSummary(todaySummary);
      setSessions(todaySessions.slice().reverse());
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      await recordError("records_load", loadError);
    }
  }

  return (
    <section className="route route--records">
      <div className="route-hero">
        <div>
          <p className="route-eyebrow">오늘 학습 회고</p>
          <h1>집중 결과와 과목별 누적을 한 번에 확인</h1>
        </div>
      </div>

      {error ? <div className="inline-banner inline-banner--danger">{error}</div> : null}

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-card__label">완료 세션</span>
          <strong>{summary?.completedSessions ?? 0}건</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">총 집중 시간</span>
          <strong>{formatMinutes(summary?.totalFocusMinutes ?? 0)}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">오늘 스티커</span>
          <strong>{summary?.todayStickerCount ?? 0}개</strong>
        </article>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">과목별 완료 횟수</p>
            <h2>오늘 요약</h2>
          </div>
        </div>

        {summary && summary.bySubject.length > 0 ? (
          <div className="subject-breakdown">
            {summary.bySubject.map((item) => (
              <article key={item.subject} className="subject-breakdown__item">
                <strong>{item.subject}</strong>
                <span>{item.count}회 완료</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <h3>오늘 완료된 세션이 아직 없어요.</h3>
            <p>홈 화면에서 집중 세션을 완료하면 여기 요약이 바로 채워집니다.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">오늘 세션 기록</p>
            <h2>최근 완료 및 중단 내역</h2>
          </div>
        </div>

        <div className="session-list">
          {sessions.length === 0 ? (
            <p className="muted-copy">오늘은 아직 저장된 세션 기록이 없습니다.</p>
          ) : null}
          {sessions.map((session) => (
            <article key={session.id} className="session-card">
              <div className="session-card__header">
                <div>
                  <h3>{session.subjectLabel}</h3>
                  <p>{formatDateTime(session.startedAt)}</p>
                </div>
                <span className={`status-pill status-pill--${session.status}`}>
                  {session.status}
                </span>
              </div>
              <div className="session-card__details">
                <span>집중 {session.plannedFocusMinutes}분</span>
                <span>실제 기록 {Math.round(session.durationSec / 60)}분</span>
                <span>스티커 {session.rewardEarned}개</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
