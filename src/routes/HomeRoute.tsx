import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { createEmptyTodaySummary, isCompletedFocusSession, sortSessionsNewestFirst } from "@/domain/sessionUtils";
import type { PomodoroSession, TodaySummary } from "@/domain/types";
import { SessionRepository } from "@/repositories";

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatClock(value: string | undefined): string {
  if (!value) {
    return "--:--";
  }

  const [, time = ""] = value.split("T");
  return time.slice(0, 5);
}

export function HomeRoute() {
  const [summary, setSummary] = useState<TodaySummary>(() => createEmptyTodaySummary(todayKey()));
  const [recentCompleted, setRecentCompleted] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const date = todayKey();
      const sessions = await SessionRepository.listByDate(date);
      const todaySummary = await SessionRepository.todaySummary(date);

      if (!active) {
        return;
      }

      setSummary(todaySummary);
      setRecentCompleted(sortSessionsNewestFirst(sessions).filter(isCompletedFocusSession).slice(0, 3));
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="route route--home">
      <div className="hero-card">
        <p className="hero-card__eyebrow">오늘의 집중 기록</p>
        <h1>{loading ? "불러오는 중..." : `${summary.completedSessions}회 완료`}</h1>
        <p>
          완료한 집중 세션 수와 최근 기록을 한눈에 확인하고, 기록 화면에서 새 세션을
          바로 남길 수 있습니다.
        </p>
        <div className="hero-card__stats">
          <div className="metric-card">
            <span className="metric-card__label">집중 시간</span>
            <strong>{loading ? "-" : `${summary.totalFocusMinutes}분`}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">과목/과제 수</span>
            <strong>{loading ? "-" : `${summary.byLabel.length}개`}</strong>
          </div>
        </div>
        <Link className="cta-link" to="/records">
          기록 화면 열기
        </Link>
      </div>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>최근 완료 세션</h2>
            <p>완료 처리된 집중 세션만 최근 순서로 보여줍니다.</p>
          </div>
        </div>
        {recentCompleted.length > 0 ? (
          <ul className="session-list">
            {recentCompleted.map((session) => (
              <li className="session-list__item" key={session.id}>
                <div>
                  <strong>{session.label}</strong>
                  <p>
                    {formatClock(session.startedAt)} - {formatClock(session.endedAt)}
                  </p>
                </div>
                <span className="status-pill status-pill--completed">완료</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            오늘 완료된 집중 세션이 아직 없습니다. 기록 탭에서 첫 세션을 남겨보세요.
          </p>
        )}
      </section>
    </section>
  );
}
