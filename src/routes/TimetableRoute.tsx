import { useEffect, useState, type CSSProperties } from "react";
import { ScheduleRepository } from "@/repositories";
import {
  formatTimeLabel,
  toViewEntries,
  WEEKDAYS,
  type TimetableWeekday,
  type TimetableViewEntry,
} from "./timetable";

export function TimetableRoute() {
  const [selectedWeekday, setSelectedWeekday] = useState<TimetableWeekday>(1);
  const [entries, setEntries] = useState<TimetableViewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTimetable() {
      setIsLoading(true);
      setError(null);

      try {
        await ScheduleRepository.ensureSeedData();
        const nextEntries = await ScheduleRepository.listByWeekday(selectedWeekday);

        if (cancelled) {
          return;
        }

        setEntries(toViewEntries(nextEntries));
      } catch {
        if (!cancelled) {
          setError("시간표를 불러오지 못했어요. 앱을 다시 열어 주세요.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTimetable();

    return () => {
      cancelled = true;
    };
  }, [selectedWeekday]);

  const selectedDay = WEEKDAYS.find((day) => day.value === selectedWeekday)!;

  return (
    <section className="route route--timetable">
      <div className="timetable__hero">
        <div>
          <h1>{selectedDay.fullLabel} 시간표</h1>
          <p>수업을 시작 시각 순서대로 확인할 수 있어요.</p>
        </div>
        <strong className="timetable__count">{entries.length}개 수업</strong>
      </div>

      <div className="timetable__weekday-strip" aria-label="요일별 시간표">
        {WEEKDAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            className={`timetable__weekday-button${day.value === selectedWeekday ? " is-active" : ""}`}
            aria-pressed={day.value === selectedWeekday}
            onClick={() => setSelectedWeekday(day.value)}
          >
            <span className="timetable__weekday-short">{day.shortLabel}</span>
            <span className="timetable__weekday-full">{day.fullLabel}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="timetable__panel timetable__panel--status">
          <p>시간표를 불러오는 중이에요.</p>
        </div>
      ) : error ? (
        <div className="timetable__panel timetable__panel--status">
          <p>{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="timetable__panel timetable__panel--status">
          <p>{selectedDay.fullLabel}에는 등록된 수업이 없어요.</p>
        </div>
      ) : (
        <ol className="timetable__list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="timetable__entry"
              style={{ "--entry-color": entry.color } as CSSProperties}
            >
              <div className="timetable__entry-order">
                <span>{entry.order}</span>
                <small>순서</small>
              </div>
              <div className="timetable__entry-body">
                <div className="timetable__entry-subject-row">
                  <strong className="timetable__entry-subject">{entry.subject}</strong>
                  <span className="timetable__entry-period">{entry.order}교시</span>
                </div>
                <p className="timetable__entry-time">
                  {formatTimeLabel(entry.startMinute)} - {formatTimeLabel(entry.endMinute)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
