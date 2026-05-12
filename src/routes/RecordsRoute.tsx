import { useEffect, useState } from "react";
import type { PomodoroSession, TodaySummary } from "@/domain/types";
import { formatDuration, getPhaseLabel } from "@/domain/timer";
import { toLocalDateKey } from "@/domain/time";
import { SessionRepository } from "@/repositories";

export function RecordsRoute() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);

  useEffect(() => {
    const dateKey = toLocalDateKey(new Date());
    void Promise.all([
      SessionRepository.todaySummary(dateKey),
      SessionRepository.listRecent(dateKey),
    ]).then(([nextSummary, nextSessions]) => {
      setSummary(nextSummary);
      setSessions(nextSessions);
    });
  }, []);

  return (
    <section className="route route--records">
      <div className="route__stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h1>오늘 기록</h1>
              <p>집중을 끝내거나 중간에 멈춘 기록을 날짜별로 다시 볼 수 있어요.</p>
            </div>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <span>완료한 집중</span>
              <strong>{summary?.completedSessions ?? 0}번</strong>
            </article>
            <article className="summary-card">
              <span>집중한 시간</span>
              <strong>{summary?.totalFocusMinutes ?? 0}분</strong>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>세션 이력</h2>
              <p>앱을 닫았다가 다시 열어도 로컬 저장소에 남아 있어요.</p>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-card">
              <p className="empty-card__title">아직 저장된 기록이 없어요.</p>
              <p className="route__muted">
                홈에서 집중을 한 번 시작하고 끝내면 이 화면에 바로 쌓입니다.
              </p>
            </div>
          ) : (
            <ul className="history-list">
              {sessions.map((session) => (
                <li className="history-card" key={session.id}>
                  <div>
                    <strong>{session.label}</strong>
                    <p>{getPhaseLabel(session.phase)}</p>
                  </div>
                  <div className="history-card__meta">
                    <span>{formatDuration(session.durationSec)}</span>
                    <span>{session.status === "completed" ? "완료" : "중단"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
