import { useEffect, useState } from "react";
import { resolveSessionLabel, getLocalDateKey } from "@/domain/sessionSummary";
import type { PomodoroSession, TodaySummary, WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository, SessionRepository } from "@/repositories";

export interface RecordsRouteProps {
  refreshKey: number;
}

function formatTimestamp(input: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(input));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "1분 미만";
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes}분`;
}

function statusLabel(session: PomodoroSession): string {
  return session.completed ? "완료" : "중단";
}

export function RecordsRoute({ refreshKey }: RecordsRouteProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const todayKey = getLocalDateKey(new Date());

    setIsLoading(true);
    void Promise.all([
      SessionRepository.listByDate(todayKey),
      SessionRepository.todaySummary(todayKey),
      ScheduleRepository.listAll(),
    ]).then(([loadedSessions, loadedSummary, loadedScheduleEntries]) => {
      if (cancelled) {
        return;
      }
      setSessions(loadedSessions.sort((left, right) => right.startedAt.localeCompare(left.startedAt)));
      setSummary(loadedSummary);
      setScheduleEntries(loadedScheduleEntries);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const scheduleTitleMap = new Map(
    scheduleEntries.map((entry) => [entry.id, entry.title] as const),
  );

  return (
    <section className="route route--records">
      <div className="screen-header">
        <div>
          <h1>오늘 기록</h1>
          <p>자유 과제명과 완료/중단 상태가 오늘 요약과 기록 목록에 그대로 남아요.</p>
        </div>
      </div>

      {isLoading ? (
        <section className="card">
          <p className="empty-copy">오늘 기록을 불러오는 중이에요.</p>
        </section>
      ) : null}

      {!isLoading && summary ? (
        <>
          <section className="summary-grid">
            <article className="card summary-card">
              <p className="eyebrow">완료</p>
              <strong>{summary.completedSessions}회</strong>
            </article>
            <article className="card summary-card">
              <p className="eyebrow">중단</p>
              <strong>{summary.interruptedSessions}회</strong>
            </article>
            <article className="card summary-card">
              <p className="eyebrow">집중 시간</p>
              <strong>{summary.totalFocusMinutes}분</strong>
            </article>
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">오늘 요약</p>
                <h2>과제별 세션 수</h2>
              </div>
            </div>
            {summary.bySubject.length > 0 ? (
              <ul className="tag-list">
                {summary.bySubject.map((entry) => (
                  <li key={entry.subject} className="tag-list__item">
                    <span>{entry.subject}</span>
                    <strong>{entry.count}회</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">아직 저장된 세션이 없어요.</p>
            )}
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">세션 기록</p>
                <h2>오늘의 집중 흐름</h2>
              </div>
            </div>
            {sessions.length > 0 ? (
              <ul className="record-list">
                {sessions.map((session) => (
                  <li key={session.id} className="record-item">
                    <div className="record-item__header">
                      <div>
                        <strong>{resolveSessionLabel(session, scheduleTitleMap)}</strong>
                        <p>
                          {formatTimestamp(session.startedAt)} - {formatTimestamp(session.endedAt)}
                        </p>
                      </div>
                      <span
                        className={`status-badge ${
                          session.completed ? "status-badge--done" : "status-badge--stopped"
                        }`}
                      >
                        {statusLabel(session)}
                      </span>
                    </div>
                    <div className="record-item__meta">
                      <span>{formatDuration(session.elapsedSeconds)}</span>
                      <span>{session.sessionType === "focus" ? "집중 세션" : "휴식 세션"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">아직 오늘 기록된 세션이 없어요.</p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
