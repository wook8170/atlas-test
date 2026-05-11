import { useOfflineApp } from "@/state/OfflineAppContext";
import { formatMinute, localDateKey } from "@/state/time";

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}.${date.getDate()} ${formatMinute(
    date.getHours() * 60 + date.getMinutes(),
  )}`;
}

export function RecordsRoute() {
  const { schedules, sessions } = useOfflineApp();
  const labelMap = new Map(schedules.map((entry) => [entry.id, entry.subject]));
  const today = localDateKey(new Date());
  const completedToday = sessions.filter(
    (session) => localDateKey(session.startedAt) === today && session.status === "completed",
  );
  const todayMinutes = Math.round(
    completedToday.reduce((sum, session) => sum + session.durationSec, 0) / 60,
  );

  return (
    <section className="route route--records">
      <div className="hero-card hero-card--compact">
        <p className="hero-card__eyebrow">로컬 학습 기록</p>
        <h1>오늘 {completedToday.length}번 집중했고 {todayMinutes}분을 채웠어요.</h1>
        <p>완료한 세션은 서버 없이도 이 기기 안에 남습니다.</p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>최근 세션</h2>
            <p>완료/취소 기록을 모두 표시합니다.</p>
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="empty-state">아직 저장된 세션 기록이 없습니다.</p>
        ) : (
          <div className="stack-list">
            {sessions.map((session) => (
              <article key={session.id} className="record-card">
                <div>
                  <strong>{session.scheduleEntryId ? labelMap.get(session.scheduleEntryId) ?? "연결된 과목" : "자율 집중"}</strong>
                  <span>{formatDateTime(session.startedAt)} 시작</span>
                </div>
                <div className="record-card__meta">
                  <span className={`status-pill status-pill--${session.status}`}>
                    {session.status === "completed"
                      ? "완료"
                      : session.status === "cancelled"
                        ? "취소"
                        : "중단"}
                  </span>
                  <strong>{Math.round(session.durationSec / 60)}분</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
