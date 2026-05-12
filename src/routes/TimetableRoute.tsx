import { useEffect, useMemo, useState } from "react";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { LocalStateRepository } from "@/repositories/LocalStateRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { SessionRepository } from "@/repositories/SessionRepository";

type AgendaStatus = "upcoming" | "completed" | "in_progress";

type AgendaCard = {
  entry: WeeklyScheduleEntry;
  plannedFocusMin: number;
  plannedBreakMin: number;
  todayCompletedCount: number;
  isCurrentSlot: boolean;
  timeRangeLabel: string;
};

type ActiveFocusSession = {
  sessionId: string;
  scheduleEntryId: string;
  subjectName: string;
  subjectColor: string;
  plannedFocusMin: number;
  plannedBreakMin: number;
  startedAtMs: number;
  endsAtMs: number;
};

const WEEKDAY_LABELS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const STATUS_LABELS: Record<AgendaStatus, string> = {
  upcoming: "예정",
  completed: "완료",
  in_progress: "진행 중",
};

export function TimetableRoute() {
  const [agenda, setAgenda] = useState<AgendaCard[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveFocusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [todaySnapshot] = useState(() => new Date());

  useEffect(() => {
    let isDisposed = false;

    async function loadTodayAgenda() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const today = todaySnapshot;
        const weekday = today.getDay();
        const localDateKey = toLocalDateKey(today);
        const nowMinute = today.getHours() * 60 + today.getMinutes();

        const [settings, entries, sessions] = await Promise.all([
          LocalStateRepository.getSettings(),
          ScheduleRepository.listByWeekday(weekday),
          SessionRepository.listByDate(localDateKey),
        ]);

        if (isDisposed) {
          return;
        }

        const completedCountByEntryId = new Map<string, number>();

        sessions.forEach((session) => {
          if (!session.completed || session.sessionType !== "focus" || !session.scheduleEntryId) {
            return;
          }

          completedCountByEntryId.set(
            session.scheduleEntryId,
            (completedCountByEntryId.get(session.scheduleEntryId) ?? 0) + 1,
          );
        });

        const cards = entries
          .map((entry) => ({
            entry,
            plannedFocusMin: entry.focusDurationMin ?? settings.focusMinutes,
            plannedBreakMin: entry.breakDurationMin ?? settings.breakMinutes,
            todayCompletedCount: completedCountByEntryId.get(entry.id) ?? 0,
            isCurrentSlot: nowMinute >= entry.startMinute && nowMinute < entry.endMinute,
            timeRangeLabel: `${formatMinuteOfDay(entry.startMinute)} - ${formatMinuteOfDay(entry.endMinute)}`,
          }))
          .sort((left, right) => left.entry.startMinute - right.entry.startMinute);

        setAgenda(cards);
        setSelectedEntryId((current) => {
          if (current && cards.some((card) => card.entry.id === current)) {
            return current;
          }
          return cards[0]?.entry.id ?? null;
        });
      } catch (error) {
        if (!isDisposed) {
          setAgenda([]);
          setSelectedEntryId(null);
          setErrorMessage("오늘 시간표를 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
        }
      } finally {
        if (!isDisposed) {
          setLoading(false);
        }
      }
    }

    void loadTodayAgenda();

    return () => {
      isDisposed = true;
    };
  }, [todaySnapshot]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeSession]);

  const agendaWithStatus = useMemo<Array<AgendaCard & { status: AgendaStatus }>>(
    () =>
      agenda.map((card) => ({
        ...card,
        status:
          activeSession?.scheduleEntryId === card.entry.id
            ? "in_progress"
            : card.todayCompletedCount > 0
              ? "completed"
              : "upcoming",
      })),
    [activeSession?.scheduleEntryId, agenda],
  );

  const selectedCard = agendaWithStatus.find((card) => card.entry.id === selectedEntryId) ?? null;
  const remainingSeconds = activeSession
    ? Math.max(0, Math.ceil((activeSession.endsAtMs - nowMs) / 1000))
    : 0;
  const isFocusFinished = Boolean(activeSession) && remainingSeconds === 0;

  async function handleStartFocus() {
    if (!selectedCard) {
      return;
    }

    if (activeSession) {
      setErrorMessage("이미 다른 활동에 집중 중이에요. 현재 세션을 먼저 정리해 주세요.");
      return;
    }

    const latestEntry = await ScheduleRepository.getById(selectedCard.entry.id);

    if (!latestEntry || latestEntry.isActive === false) {
      setErrorMessage("선택한 활동을 다시 불러오지 못했어요. 새로 고른 뒤 다시 시작해 주세요.");
      return;
    }

    const startedAtMs = Date.now();

    setActiveSession({
      sessionId: createSessionId(latestEntry.id, startedAtMs),
      scheduleEntryId: latestEntry.id,
      subjectName: latestEntry.subjectName,
      subjectColor: latestEntry.subjectColor,
      plannedFocusMin: latestEntry.focusDurationMin ?? selectedCard.plannedFocusMin,
      plannedBreakMin: latestEntry.breakDurationMin ?? selectedCard.plannedBreakMin,
      startedAtMs,
      endsAtMs: startedAtMs + (latestEntry.focusDurationMin ?? selectedCard.plannedFocusMin) * 60 * 1000,
    });
    setNowMs(startedAtMs);
    setErrorMessage(null);
  }

  function handleClearActiveSession() {
    setActiveSession(null);
    setNowMs(Date.now());
    setErrorMessage(null);
  }

  return (
    <section className="route route--timetable today-focus">
      <div className="today-focus__hero">
        <div>
          <p className="today-focus__eyebrow">{formatTodayLabel(todaySnapshot)}</p>
          <h1>오늘 시간표</h1>
        </div>
        <p className="today-focus__hero-copy">
          오늘 할 활동을 고르고 한 번에 집중을 시작할 수 있어요.
        </p>
      </div>

      <div className="today-focus__summary">
        <div className="today-focus__summary-item">
          <span>오늘 활동</span>
          <strong>{agendaWithStatus.length}개</strong>
        </div>
        <div className="today-focus__summary-item">
          <span>선택한 활동</span>
          <strong>{selectedCard?.entry.subjectName ?? "없음"}</strong>
        </div>
      </div>

      {activeSession ? (
        <section className="today-focus__active" aria-live="polite">
          <div className="today-focus__active-head">
            <span className="today-focus__badge today-focus__badge--progress">
              {isFocusFinished ? "집중 시간 끝" : "집중 중"}
            </span>
            <span className="today-focus__active-id">{activeSession.sessionId}</span>
          </div>
          <div className="today-focus__active-body">
            <div
              className="today-focus__color"
              style={{ backgroundColor: activeSession.subjectColor }}
              aria-hidden="true"
            />
            <div className="today-focus__active-copy">
              <strong>{activeSession.subjectName}</strong>
              <p>
                {activeSession.plannedFocusMin}분 집중 후 {activeSession.plannedBreakMin}분 쉬어요.
              </p>
            </div>
            <div className="today-focus__countdown">{formatRemaining(remainingSeconds)}</div>
          </div>
          <button
            type="button"
            className="today-focus__secondary-button"
            onClick={handleClearActiveSession}
          >
            {isFocusFinished ? "다음 활동 고르기" : "현재 집중 정리"}
          </button>
        </section>
      ) : null}

      {errorMessage ? <p className="today-focus__error">{errorMessage}</p> : null}

      {loading ? (
        <p className="today-focus__muted">오늘 시간표를 불러오는 중이에요.</p>
      ) : agendaWithStatus.length === 0 ? (
        <div className="today-focus__empty">
          <span className="today-focus__badge">빈 시간표</span>
          <h2>오늘 예정된 공부가 없어요.</h2>
          <p>시간표 항목이 생기면 여기에서 바로 고르고 집중을 시작할 수 있어요.</p>
        </div>
      ) : (
        <>
          <div className="today-focus__agenda" role="list" aria-label="오늘 활동 목록">
            {agendaWithStatus.map((card) => {
              const isSelected = selectedEntryId === card.entry.id;

              return (
                <button
                  key={card.entry.id}
                  type="button"
                  className={[
                    "today-focus__card",
                    isSelected ? "today-focus__card--selected" : "",
                    card.isCurrentSlot ? "today-focus__card--current" : "",
                  ].join(" ").trim()}
                  onClick={() => {
                    setSelectedEntryId(card.entry.id);
                    setErrorMessage(null);
                  }}
                >
                  <div className="today-focus__card-head">
                    <div className="today-focus__card-subject">
                      <span
                        className="today-focus__color"
                        style={{ backgroundColor: card.entry.subjectColor }}
                        aria-hidden="true"
                      />
                      <strong>{card.entry.subjectName}</strong>
                    </div>
                    <span className={`today-focus__badge today-focus__badge--${card.status}`}>
                      {STATUS_LABELS[card.status]}
                    </span>
                  </div>
                  <p className="today-focus__card-time">{card.timeRangeLabel}</p>
                  <div className="today-focus__card-meta">
                    <span>{card.plannedFocusMin}분 집중</span>
                    <span>{card.plannedBreakMin}분 휴식</span>
                    <span>{card.todayCompletedCount}회 완료</span>
                  </div>
                  <div className="today-focus__card-foot">
                    <span>{isSelected ? "선택됨" : "탭해서 선택"}</span>
                    {card.isCurrentSlot ? <span>지금 시간</span> : <span>{nextCue(card.entry.startMinute)}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="today-focus__cta">
            <div>
              <strong>{selectedCard?.entry.subjectName ?? "활동을 선택해 주세요"}</strong>
              <p>
                {selectedCard
                  ? `${selectedCard.plannedFocusMin}분 집중을 시작할 준비가 됐어요.`
                  : "오늘 카드 하나를 먼저 선택해 주세요."}
              </p>
            </div>
            <button
              type="button"
              className="today-focus__primary-button"
              disabled={!selectedCard || Boolean(activeSession)}
              onClick={() => {
                void handleStartFocus();
              }}
            >
              {activeSession ? "집중 진행 중" : "집중 시작"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function formatTodayLabel(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}`;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinuteOfDay(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function nextCue(startMinute: number): string {
  const hour = Math.floor(startMinute / 60);
  return hour < 12 ? "오전 활동" : "오후 활동";
}

function createSessionId(scheduleEntryId: string, startedAtMs: number): string {
  return `focus-${scheduleEntryId}-${startedAtMs}`;
}
