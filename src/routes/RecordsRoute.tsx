import { useStudyTimer } from "@/context/StudyTimerContext";
import type { PomodoroSession } from "@/domain/types";

function getSessionTypeLabel(session: PomodoroSession) {
  if (session.sessionType === "focus") {
    return "집중";
  }

  return session.sessionType === "long-break" ? "긴 휴식" : "짧은 휴식";
}

function getSessionLabel(
  session: PomodoroSession,
  scheduleLabels: Map<string, string>,
) {
  if (session.sessionType !== "focus") {
    return "휴식 세션";
  }

  return (
    session.freeTaskTitle ??
    (session.scheduleEntryId
      ? scheduleLabels.get(session.scheduleEntryId) ?? "시간표 활동"
      : "자유 과제")
  );
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function RecordsRoute() {
  const { schedules, todaySummary, todaySessions } = useStudyTimer();
  const scheduleLabels = new Map(
    schedules.map((entry) => [entry.id, entry.subject] as const),
  );

  return (
    <section className="route route--records">
      <div className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">오늘의 기록</p>
            <h2>{todaySummary.completedSessions}개 세션 완료</h2>
          </div>
          <span className="mini-badge">{Math.round(todaySummary.totalFocusMinutes)}분 집중</span>
        </div>

        {todaySummary.bySubject.length ? (
          <div className="subject-summary">
            {todaySummary.bySubject.map((subject) => (
              <article key={subject.subject} className="subject-pill">
                <strong>{subject.subject}</strong>
                <span>{subject.count}회 완료</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="support-text">
            아직 저장된 완료 세션이 없어요. 홈에서 집중을 시작하면 기록이 쌓입니다.
          </p>
        )}
      </div>

      <div className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">세션 타임라인</p>
            <h2>완료와 중도 종료를 구분해서 저장</h2>
          </div>
        </div>

        {todaySessions.length ? (
          <div className="record-list">
            {todaySessions.map((session) => (
              <article key={session.id} className="record-card">
                <div className="record-card__row">
                  <div>
                    <span
                      className={
                        session.completed
                          ? "status-pill status-pill--complete"
                          : "status-pill status-pill--stopped"
                      }
                    >
                      {session.completed ? "완료" : "중도 종료"}
                    </span>
                    <h3>{getSessionLabel(session, scheduleLabels)}</h3>
                  </div>
                  <strong>{getSessionTypeLabel(session)}</strong>
                </div>
                <div className="record-card__meta">
                  <span>
                    {formatTime(session.startedAt)} - {formatTime(session.endedAt)}
                  </span>
                  <span>{Math.max(1, Math.round(session.elapsedSeconds / 60))}분</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="support-text">
            아직 오늘 기록이 없습니다. 시작 후 종료하거나 완료하면 여기에 바로 보입니다.
          </p>
        )}
      </div>
    </section>
  );
}
