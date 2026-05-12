import { startTransition, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { StudyStatePanel } from "@/components/StudyStatePanel";
import { LocalStateRepository, ScheduleRepository, SessionRepository } from "@/repositories";
import { buildHomeDashboard, getLocalDateKey, type HomeDashboardView } from "./homeDashboard";

type HomeRouteState =
  | { status: "loading" }
  | { status: "ready"; view: HomeDashboardView }
  | { status: "error"; message: string };

async function loadHomeDashboardView(): Promise<HomeDashboardView> {
  const now = new Date();
  const [profile, settings, entries, sessions] = await Promise.all([
    LocalStateRepository.getProfile(),
    LocalStateRepository.getSettings(),
    ScheduleRepository.listByWeekday(now.getDay()),
    SessionRepository.listByDate(getLocalDateKey(now)),
  ]);

  return buildHomeDashboard({
    profile,
    settings,
    entries,
    sessions,
    now,
  });
}

export function HomeRoute() {
  const [state, setState] = useState<HomeRouteState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const syncHome = async () => {
      try {
        const view = await loadHomeDashboardView();
        if (cancelled) return;
        startTransition(() => setState({ status: "ready", view }));
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "홈 화면 정보를 불러오지 못했습니다.";
        startTransition(() => setState({ status: "error", message }));
      }
    };

    void syncHome();
    const intervalId = window.setInterval(() => {
      void syncHome();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (state.status === "loading") {
    return (
      <section className="route route--home">
        <div className="home-hero home-hero--loading">
          <p className="home-hero__eyebrow">오늘 공부를 준비하는 중</p>
          <h1>메인 화면을 불러오고 있어요.</h1>
          <p>타이머 상태와 오늘 시간표를 한 번에 볼 수 있게 데이터를 모으는 중입니다.</p>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="route route--home">
        <div className="home-empty">
          <p className="home-empty__eyebrow">홈 화면 오류</p>
          <h1>정보를 불러오지 못했어요.</h1>
          <p>{state.message}</p>
          <Link className="home-inline-link" to="/settings">
            설정 화면 보기
          </Link>
        </div>
      </section>
    );
  }

  const { view } = state;

  return (
    <section className="route route--home">
      <div className="home-hero">
        <div>
          <p className="home-hero__eyebrow">{view.dateLabel}</p>
          <h1>{view.profileLabel}</h1>
          <p>현재 타이머 상태, 남은 시간, 현재 단계, 오늘 시간표를 한 화면에 모았습니다.</p>
        </div>
        <div className="home-hero__summary">
          <span>{view.todaySummaryLabel}</span>
          <strong>{view.totalFocusLabel}</strong>
        </div>
      </div>

      <StudyStatePanel state={view.state} />

      <section className="home-section">
        <div className="home-section__header">
          <div>
            <p className="home-section__eyebrow">{view.scheduleHeadline}</p>
            <h2>오늘 시간표</h2>
          </div>
          <div className="home-section__meta">{view.progressLabel}</div>
        </div>

        {view.hasAgenda ? (
          <div className="home-agenda-list">
            {view.agenda.map((item) => (
              <article
                key={item.id}
                className={`home-agenda-card home-agenda-card--${item.status}`}
                style={{ "--agenda-accent": item.color } as CSSProperties}
              >
                <div className="home-agenda-card__header">
                  <div>
                    <p className="home-agenda-card__time">{item.timeRangeLabel}</p>
                    <h3>{item.subject}</h3>
                  </div>
                  <span className="home-agenda-card__status">{item.statusLabel}</span>
                </div>
                <dl className="home-agenda-card__details">
                  <div>
                    <dt>집중</dt>
                    <dd>{item.focusLabel}</dd>
                  </div>
                  <div>
                    <dt>휴식</dt>
                    <dd>{item.breakLabel}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <p className="home-empty__eyebrow">오늘 시간표 비어 있음</p>
            <h3>오늘 예정된 공부가 없어요.</h3>
            <p>{view.emptyMessage}</p>
            <Link className="home-inline-link" to="/timetable">
              시간표 보러 가기
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
