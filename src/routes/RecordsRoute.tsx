import { useEffect, useState } from "react";
import { getLocalDateKey, type SessionHistoryItem } from "@/domain/sessionRecords";
import type { TodaySummary } from "@/domain/types";
import { SessionRepository } from "@/repositories";

const summaryDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

const recordDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const recordTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});

const statusLabelMap = {
  completed: "완료",
  interrupted: "중단",
  cancelled: "취소",
} as const;

function getTodayDateKey(): string {
  return getLocalDateKey(new Date().toISOString());
}

function createEmptySummary(dateKey: string): TodaySummary {
  return {
    date: dateKey,
    completedSessions: 0,
    totalFocusMinutes: 0,
    totalFocusSeconds: 0,
    bySubject: [],
  };
}

function formatStudyDuration(durationSec: number): string {
  const totalMinutes = Math.max(0, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function formatSummaryDate(dateKey: string): string {
  return summaryDateFormatter.format(new Date(`${dateKey}T12:00:00`));
}

function formatRecordDate(isoString: string): string {
  return recordDateFormatter.format(new Date(isoString));
}

function formatRecordStatusMoment(record: SessionHistoryItem): string {
  if (!record.endedAt) {
    return "종료 시각 미기록";
  }

  return `${statusLabelMap[record.status]} ${recordTimeFormatter.format(
    new Date(record.endedAt),
  )}`;
}

export function RecordsRoute() {
  const [summary, setSummary] = useState<TodaySummary>(() =>
    createEmptySummary(getTodayDateKey()),
  );
  const [records, setRecords] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      const todayKey = getTodayDateKey();

      if (isActive) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const [nextSummary, nextRecords] = await Promise.all([
          SessionRepository.todaySummary(todayKey),
          SessionRepository.listRecent(8),
        ]);

        if (!isActive) {
          return;
        }

        setSummary(nextSummary);
        setRecords(nextRecords);
      } catch {
        if (!isActive) {
          return;
        }

        setSummary(createEmptySummary(todayKey));
        setRecords([]);
        setError("기록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    const reloadOnFocus = () => {
      void loadRecords();
    };

    const reloadOnVisible = () => {
      if (!document.hidden) {
        void loadRecords();
      }
    };

    void loadRecords();
    window.addEventListener("focus", reloadOnFocus);
    document.addEventListener("visibilitychange", reloadOnVisible);

    return () => {
      isActive = false;
      window.removeEventListener("focus", reloadOnFocus);
      document.removeEventListener("visibilitychange", reloadOnVisible);
    };
  }, []);

  return (
    <section className="route route--records">
      <div className="records-screen">
        <header className="records-hero">
          <p className="records-hero__eyebrow">최근 학습 기록</p>
          <h1>오늘 집중한 만큼 차곡차곡 남겨요</h1>
          <p>
            완료한 세션 수와 집중 시간, 과목별 기록을 이 기기 안에 저장하고 최근
            학습 내역까지 바로 확인할 수 있어요.
          </p>
        </header>

        {error ? <p className="records-banner records-banner--error">{error}</p> : null}

        <section className="records-panel">
          <div className="records-panel__header">
            <div>
              <p className="records-panel__eyebrow">오늘 요약</p>
              <h2>{formatSummaryDate(summary.date)}</h2>
            </div>
            <span className="records-panel__hint">
              {isLoading ? "새 기록을 확인 중" : "로컬 저장소 기준"}
            </span>
          </div>

          <div className="records-stats">
            <article className="records-stat">
              <p className="records-stat__label">완료한 세션</p>
              <strong>{summary.completedSessions}개</strong>
            </article>
            <article className="records-stat">
              <p className="records-stat__label">집중한 시간</p>
              <strong>{formatStudyDuration(summary.totalFocusSeconds)}</strong>
            </article>
            <article className="records-stat">
              <p className="records-stat__label">완료한 과목</p>
              <strong>{summary.bySubject.length}개</strong>
            </article>
          </div>

          <div className="records-subjects">
            <div className="records-subjects__header">
              <h3>과목별 완료 횟수</h3>
              <span>{summary.bySubject.length > 0 ? "오늘 완료한 과목" : "빈 상태"}</span>
            </div>

            {summary.bySubject.length === 0 ? (
              <div className="records-empty">
                <p>아직 완료한 집중 기록이 없어요.</p>
                <p>타이머를 끝까지 완료하면 이곳에 과목별 기록이 쌓여요.</p>
              </div>
            ) : (
              <ul className="records-subjects__list">
                {summary.bySubject.map((item) => (
                  <li key={item.subject} className="records-subjects__item">
                    <span>{item.subject}</span>
                    <strong>{item.count}회</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="records-panel">
          <div className="records-panel__header">
            <div>
              <p className="records-panel__eyebrow">최근 내역</p>
              <h2>최근 집중 기록 8개</h2>
            </div>
            <span className="records-panel__hint">
              {records.length > 0 ? `${records.length}개 표시` : "최근 기록 없음"}
            </span>
          </div>

          {isLoading && records.length === 0 ? (
            <p className="records-loading">최근 기록을 불러오는 중이에요.</p>
          ) : records.length === 0 ? (
            <div className="records-empty">
              <p>저장된 학습 기록이 아직 없어요.</p>
              <p>집중 세션을 완료하거나 중단하면 최근 기록이 여기에 순서대로 보여요.</p>
            </div>
          ) : (
            <ul className="records-list">
              {records.map((record) => (
                <li key={record.id} className="records-list__item">
                  <div className="records-list__row">
                    <div>
                      <strong>{record.subject}</strong>
                      <p>{formatRecordDate(record.startedAt)}</p>
                    </div>
                    <span
                      className={`records-badge records-badge--${record.status}`}
                    >
                      {statusLabelMap[record.status]}
                    </span>
                  </div>
                  <div className="records-list__meta">
                    <span>집중 {formatStudyDuration(record.durationSec)}</span>
                    <span>{formatRecordStatusMoment(record)}</span>
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
