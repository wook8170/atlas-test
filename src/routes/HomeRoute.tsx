import { Link } from "react-router-dom";
import { useTimerFlow } from "@/timer/TimerFlowProvider";

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function HomeRoute() {
  const { activeTimer, remainingSeconds, clearActiveTimer } = useTimerFlow();

  return (
    <section className="route route--home">
      <div className="route__intro">
        <h1>지금 집중할 내용</h1>
        <p className="route__lead">시간표에서 시작한 학습 블록이 여기로 바로 이어집니다.</p>
      </div>

      {activeTimer ? (
        <article className="timer-card" style={{ borderColor: activeTimer.color }}>
          <div className="timer-card__header">
            <span className="pill pill--focus">
              {remainingSeconds > 0 ? "집중 중" : "집중 완료"}
            </span>
            <span className="timer-card__subject">{activeTimer.subject}</span>
          </div>

          <div className="timer-card__clock">{formatTimer(remainingSeconds)}</div>

          <p className="timer-card__meta">
            {formatClock(activeTimer.startedAt)} 시작 · {formatClock(activeTimer.endsAt)} 종료 예정
          </p>

          <div className="timer-card__progress" aria-hidden="true">
            <span
              className="timer-card__progress-bar"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    ((activeTimer.totalSeconds - remainingSeconds) / activeTimer.totalSeconds) * 100,
                  ),
                )}%`,
                backgroundColor: activeTimer.color,
              }}
            />
          </div>

          <div className="action-row">
            <Link to="/timetable" className="button">
              시간표로 돌아가기
            </Link>
            <button type="button" className="button button--ghost" onClick={clearActiveTimer}>
              이 블록 종료
            </button>
          </div>
        </article>
      ) : (
        <article className="empty-state">
          <h2>아직 시작한 학습이 없어요.</h2>
          <p>오늘 시간표에서 과목을 누르면 홈 화면이 바로 타이머 보기로 바뀝니다.</p>
          <Link to="/timetable" className="button">
            시간표 보러 가기
          </Link>
        </article>
      )}
    </section>
  );
}
