import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository } from "@/repositories";
import { useTimerFlow } from "@/timer/TimerFlowProvider";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const DEMO_COLORS = ["#ffb703", "#58a6ff", "#7bd389"];

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  const restMinute = minute % 60;

  return `${String(hour).padStart(2, "0")}:${String(restMinute).padStart(2, "0")}`;
}

function buildDemoSchedule(weekday: number): WeeklyScheduleEntry[] {
  return [
    {
      id: `demo-${weekday}-1`,
      weekday: weekday as WeeklyScheduleEntry["weekday"],
      startMinute: 9 * 60,
      endMinute: 9 * 60 + 40,
      subject: "국어 독서",
      color: DEMO_COLORS[0],
      schemaVersion: 1,
    },
    {
      id: `demo-${weekday}-2`,
      weekday: weekday as WeeklyScheduleEntry["weekday"],
      startMinute: 10 * 60,
      endMinute: 10 * 60 + 40,
      subject: "수학 연산",
      color: DEMO_COLORS[1],
      schemaVersion: 1,
    },
    {
      id: `demo-${weekday}-3`,
      weekday: weekday as WeeklyScheduleEntry["weekday"],
      startMinute: 11 * 60,
      endMinute: 11 * 60 + 40,
      subject: "영어 단어",
      color: DEMO_COLORS[2],
      schemaVersion: 1,
    },
  ];
}

export function TimetableRoute() {
  const navigate = useNavigate();
  const todayWeekday = new Date().getDay();
  const { activeTimer, isStarting, startTimerForSchedule } = useTimerFlow();
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<"saved" | "demo" | "empty">("empty");

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      setIsLoading(true);

      try {
        const [todayEntries, allEntries] = await Promise.all([
          ScheduleRepository.listByWeekday(todayWeekday),
          ScheduleRepository.listAll(),
        ]);

        if (cancelled) {
          return;
        }

        if (todayEntries.length > 0) {
          setEntries(todayEntries);
          setSourceMode("saved");
        } else if (allEntries.length === 0) {
          setEntries(buildDemoSchedule(todayWeekday));
          setSourceMode("demo");
        } else {
          setEntries([]);
          setSourceMode("empty");
        }
      } catch {
        if (!cancelled) {
          setEntries(buildDemoSchedule(todayWeekday));
          setSourceMode("demo");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [todayWeekday]);

  const handleStart = async (entry: WeeklyScheduleEntry) => {
    setStartingId(entry.id);

    try {
      await startTimerForSchedule(entry);
      startTransition(() => {
        navigate("/home");
      });
    } finally {
      setStartingId(null);
    }
  };

  return (
    <section className="route route--timetable">
      <div className="route__intro">
        <h1>{WEEKDAY_LABELS[todayWeekday]}요일 시간표</h1>
        <p className="route__lead">과목 카드에서 바로 집중을 시작하면 홈 화면 타이머로 곧장 이어집니다.</p>
      </div>

      {activeTimer ? (
        <article className="callout callout--active">
          <span className="pill pill--focus">진행 중</span>
          <strong>{activeTimer.subject}</strong>
          <p>이미 시작한 블록이 있어요. 다른 과목을 누르면 새 블록으로 바로 전환됩니다.</p>
        </article>
      ) : null}

      {sourceMode === "demo" ? (
        <article className="callout">
          <strong>샘플 시간표를 보여주고 있어요.</strong>
          <p>아직 저장된 시간표가 없어서 시작 흐름을 바로 확인할 수 있는 예시 블록을 준비했습니다.</p>
        </article>
      ) : null}

      {isLoading ? (
        <article className="empty-state">
          <h2>오늘 시간표를 불러오는 중이에요.</h2>
          <p>저장된 시간표가 있으면 오늘 블록만 정렬해서 보여줍니다.</p>
        </article>
      ) : entries.length > 0 ? (
        <div className="schedule-list">
          {entries.map((entry) => {
            const isCurrentTimer = activeTimer?.scheduleEntryId === entry.id;
            const isBusy = isStarting || startingId === entry.id;
            const buttonLabel = isCurrentTimer
              ? "이 블록 다시 보기"
              : isBusy
                ? "시작 준비 중..."
                : "이 블록 집중 시작";

            return (
              <article key={entry.id} className="schedule-card" style={{ borderColor: entry.color }}>
                <div className="schedule-card__time">
                  {formatMinute(entry.startMinute)} - {formatMinute(entry.endMinute)}
                </div>
                <h2 className="schedule-card__title">{entry.subject}</h2>
                <p className="schedule-card__hint">바로 집중 시작을 누르면 홈 화면 타이머가 이 과목으로 바뀝니다.</p>
                <button
                  type="button"
                  className="button"
                  disabled={isBusy}
                  onClick={() => {
                    if (isCurrentTimer) {
                      navigate("/home");
                      return;
                    }
                    void handleStart(entry);
                  }}
                >
                  {buttonLabel}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <article className="empty-state">
          <h2>오늘 등록된 시간표가 없어요.</h2>
          <p>다른 요일 시간표는 저장돼 있지만, 오늘은 바로 시작할 학습 블록이 아직 없습니다.</p>
        </article>
      )}
    </section>
  );
}
