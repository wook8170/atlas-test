import { useOfflineApp } from "@/state/OfflineAppContext";
import { currentWeekday, formatMinute, localDateKey } from "@/state/time";
import { formatTimer } from "@/state/timer";

export function HomeRoute() {
  const {
    ready,
    online,
    schedules,
    sessions,
    settings,
    timer,
    startTimer,
    pauseActiveTimer,
    resumeActiveTimer,
    completeActiveTimer,
    cancelActiveTimer,
  } = useOfflineApp();
  const weekday = currentWeekday();
  const todaySchedules = schedules.filter((entry) => entry.weekday === weekday);
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const todayKey = localDateKey(now);
  const currentEntry = todaySchedules.find(
    (entry) => currentMinute >= entry.startMinute && currentMinute < entry.endMinute,
  );
  const nextEntry = todaySchedules.find((entry) => entry.startMinute > currentMinute);
  const completedToday = sessions.filter(
    (session) => localDateKey(session.startedAt) === todayKey && session.status === "completed",
  ).length;

  return (
    <section className="route route--home">
      <div className="hero-card">
        <p className="hero-card__eyebrow">오늘의 집중 흐름</p>
        <h1>네트워크 없이도 오늘 할 일을 이어가요.</h1>
        <p>
          시간표 조회, 집중 타이머, 세션 기록 저장이 모두 이 기기 안에서 동작합니다.
          {online ? " 연결이 끊겨도 현재 화면은 그대로 유지됩니다." : " 지금은 오프라인 모드로 실행 중입니다."}
        </p>
        <div className="hero-card__stats">
          <div className="metric-card">
            <span className="metric-card__label">오늘 시간표</span>
            <strong>{todaySchedules.length}개</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">완료 기록</span>
            <strong>{completedToday}회</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">집중 길이</span>
            <strong>{settings.focusMinutes}분</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>집중 타이머</h2>
            <p>앱을 새로 열어도 현재 세션을 복원합니다.</p>
          </div>
        </div>
        {!ready ? (
          <p className="empty-state">로컬 데이터를 불러오는 중입니다.</p>
        ) : timer.phase === "idle" ? (
          <div className="timer-card timer-card--idle">
            <div>
              <p className="timer-card__label">대기 중</p>
              <h3>{formatTimer(settings.focusMinutes * 60)}</h3>
              <p>오늘 시간표나 자율 집중으로 바로 시작할 수 있습니다.</p>
            </div>
            <button className="button button--primary" onClick={() => void startTimer({ label: "자율 집중" })}>
              자율 집중 시작
            </button>
          </div>
        ) : (
          <div className="timer-card">
            <p className="timer-card__label">{timer.phase === "running" ? "집중 중" : "일시정지"}</p>
            <h3>{formatTimer(timer.remainingSec)}</h3>
            <p>{timer.label}</p>
            <div className="progress-bar" aria-hidden="true">
              <span
                className="progress-bar__fill"
                style={{ width: `${Math.min(100, (timer.elapsedSec / timer.totalSec) * 100)}%` }}
              />
            </div>
            <div className="timer-card__actions">
              {timer.phase === "running" ? (
                <button className="button button--secondary" onClick={pauseActiveTimer}>
                  일시정지
                </button>
              ) : (
                <button className="button button--secondary" onClick={resumeActiveTimer}>
                  재개
                </button>
              )}
              <button className="button button--ghost" onClick={() => void cancelActiveTimer()}>
                취소
              </button>
              <button className="button button--primary" onClick={() => void completeActiveTimer()}>
                지금 완료
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>오늘 시간표</h2>
            <p>오프라인일 때도 마지막 로컬 저장본을 그대로 조회합니다.</p>
          </div>
        </div>
        {currentEntry ? (
          <div className="callout">
            <span className="callout__label">지금 수업</span>
            <strong>{currentEntry.subject}</strong>
            <span>{formatMinute(currentEntry.startMinute)} - {formatMinute(currentEntry.endMinute)}</span>
          </div>
        ) : nextEntry ? (
          <div className="callout callout--muted">
            <span className="callout__label">다음 수업</span>
            <strong>{nextEntry.subject}</strong>
            <span>{formatMinute(nextEntry.startMinute)} 시작</span>
          </div>
        ) : null}
        {todaySchedules.length === 0 ? (
          <p className="empty-state">
            오늘 저장된 시간표가 없습니다. 시간표 탭에서 항목을 만들면 여기서 바로 조회할 수 있습니다.
          </p>
        ) : (
          <div className="stack-list">
            {todaySchedules.map((entry) => (
              <article key={entry.id} className="schedule-card">
                <span className="schedule-card__swatch" style={{ backgroundColor: entry.color }} />
                <div className="schedule-card__body">
                  <strong>{entry.subject}</strong>
                  <span>{formatMinute(entry.startMinute)} - {formatMinute(entry.endMinute)}</span>
                </div>
                <button
                  className="button button--small"
                  onClick={() => void startTimer({ label: entry.subject, scheduleEntryId: entry.id })}
                  disabled={timer.phase !== "idle"}
                >
                  집중 시작
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
