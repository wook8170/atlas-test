import { useEffect, useState } from "react";
import {
  formatEntryRange,
  formatMinuteLabel,
  getCurrentOrNextEntry,
  getMinuteOfDay,
  getNextEntryAfterSelected,
  sortScheduleEntries,
} from "@/domain/schedule";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository } from "@/repositories";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" },
] as const;

const DEMO_SCHEDULE: WeeklyScheduleEntry[] = [
  { id: "demo-mon-math", weekday: 1, startMinute: 9 * 60, endMinute: 9 * 60 + 40, subject: "수학", color: "#ffb703", schemaVersion: 1 },
  { id: "demo-mon-korean", weekday: 1, startMinute: 10 * 60, endMinute: 10 * 60 + 40, subject: "국어", color: "#8ecae6", schemaVersion: 1 },
  { id: "demo-mon-science", weekday: 1, startMinute: 11 * 60, endMinute: 11 * 60 + 40, subject: "과학", color: "#90be6d", schemaVersion: 1 },
  { id: "demo-tue-english", weekday: 2, startMinute: 9 * 60 + 30, endMinute: 10 * 60 + 10, subject: "영어", color: "#f28482", schemaVersion: 1 },
  { id: "demo-tue-music", weekday: 2, startMinute: 10 * 60 + 30, endMinute: 11 * 60 + 10, subject: "음악", color: "#cdb4db", schemaVersion: 1 },
  { id: "demo-wed-social", weekday: 3, startMinute: 9 * 60, endMinute: 9 * 60 + 40, subject: "사회", color: "#84a59d", schemaVersion: 1 },
  { id: "demo-wed-art", weekday: 3, startMinute: 10 * 60, endMinute: 10 * 60 + 40, subject: "미술", color: "#f6bd60", schemaVersion: 1 },
  { id: "demo-th-pe", weekday: 4, startMinute: 9 * 60, endMinute: 9 * 60 + 50, subject: "체육", color: "#52b788", schemaVersion: 1 },
  { id: "demo-fri-reading", weekday: 5, startMinute: 9 * 60 + 20, endMinute: 10 * 60, subject: "독서", color: "#577590", schemaVersion: 1 },
];

function pickDefaultWeekday(entries: WeeklyScheduleEntry[], todayWeekday: number): number {
  if (entries.some((entry) => entry.weekday === todayWeekday)) {
    return todayWeekday;
  }

  return sortScheduleEntries(entries)[0]?.weekday ?? todayWeekday;
}

function pickDefaultEntryId(entries: WeeklyScheduleEntry[], minuteOfDay?: number): string | undefined {
  if (minuteOfDay === undefined) {
    return entries[0]?.id;
  }

  const { current, next } = getCurrentOrNextEntry(entries, minuteOfDay);
  return current?.id ?? next?.id ?? entries[0]?.id;
}

function getRelativeStartLabel(startMinute: number, minuteOfDay: number): string {
  const diff = startMinute - minuteOfDay;
  if (diff <= 0) {
    return "곧 시작해요.";
  }
  if (diff < 60) {
    return `${diff}분 뒤에 시작해요.`;
  }

  const hour = Math.floor(diff / 60);
  const minute = diff % 60;
  return minute === 0 ? `${hour}시간 뒤에 시작해요.` : `${hour}시간 ${minute}분 뒤에 시작해요.`;
}

function getSelectedSummary(args: {
  selectedEntry: WeeklyScheduleEntry;
  selectedNext?: WeeklyScheduleEntry;
  isToday: boolean;
  minuteOfDay: number;
}): string {
  const { selectedEntry, selectedNext, isToday, minuteOfDay } = args;

  if (isToday && selectedEntry.startMinute <= minuteOfDay && minuteOfDay < selectedEntry.endMinute) {
    return selectedNext
      ? `이 수업은 지금 진행 중이고, 끝나면 ${selectedNext.subject} 수업이에요.`
      : "이 수업은 지금 진행 중이고, 끝나면 오늘 수업도 마무리돼요.";
  }

  if (isToday && minuteOfDay < selectedEntry.startMinute) {
    return selectedNext
      ? `이 수업은 아직 시작 전이에요. 그다음은 ${selectedNext.subject} 수업이에요.`
      : "이 수업이 시작하면 그날 마지막 공부가 돼요.";
  }

  if (selectedNext) {
    return `이 수업 다음 순서는 ${selectedNext.subject}이에요.`;
  }

  return "이 칸이 그날 마지막 수업이에요.";
}

export function TimetableRoute() {
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(new Date().getDay());
  const [selectedEntryId, setSelectedEntryId] = useState<string>();
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEntries() {
      setIsLoading(true);
      const allEntries = await ScheduleRepository.listAll();
      if (!alive) {
        return;
      }
      setEntries(allEntries);
      setIsLoading(false);
    }

    void loadEntries();

    return () => {
      alive = false;
    };
  }, []);

  const todayWeekday = now.getDay();
  const minuteOfDay = getMinuteOfDay(now);

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }

    setSelectedWeekday((currentWeekday) => {
      if (entries.some((entry) => entry.weekday === currentWeekday)) {
        return currentWeekday;
      }

      return pickDefaultWeekday(entries, todayWeekday);
    });
  }, [entries, todayWeekday]);

  useEffect(() => {
    const weekdayEntries = sortScheduleEntries(entries.filter((entry) => entry.weekday === selectedWeekday));
    if (weekdayEntries.length === 0) {
      setSelectedEntryId(undefined);
      return;
    }

    setSelectedEntryId((currentEntryId) => {
      if (currentEntryId && weekdayEntries.some((entry) => entry.id === currentEntryId)) {
        return currentEntryId;
      }

      const referenceMinute = selectedWeekday === todayWeekday ? minuteOfDay : undefined;
      return pickDefaultEntryId(weekdayEntries, referenceMinute);
    });
  }, [entries, minuteOfDay, selectedWeekday, todayWeekday]);

  async function refreshEntries() {
    setEntries(await ScheduleRepository.listAll());
  }

  async function handleSeedDemoSchedule() {
    setIsSeedingDemo(true);
    try {
      await ScheduleRepository.replaceAll(DEMO_SCHEDULE);
      await refreshEntries();
      setSelectedWeekday(pickDefaultWeekday(DEMO_SCHEDULE, todayWeekday));
    } finally {
      setIsSeedingDemo(false);
    }
  }

  const todayEntries = sortScheduleEntries(entries.filter((entry) => entry.weekday === todayWeekday));
  const weekdayEntries = sortScheduleEntries(entries.filter((entry) => entry.weekday === selectedWeekday));
  const { current, next } = getCurrentOrNextEntry(todayEntries, minuteOfDay);
  const selectedEntry = weekdayEntries.find((entry) => entry.id === selectedEntryId);
  const selectedNext = selectedEntry ? getNextEntryAfterSelected(weekdayEntries, selectedEntry.id) : undefined;
  const totalEntries = entries.length;

  return (
    <section className="route route--timetable">
      <div className="route__intro">
        <h1>오늘 시간표</h1>
        <p>지금 수업이 무엇인지, 그리고 다음 수업이 무엇인지 한눈에 볼 수 있어요.</p>
      </div>

      <article className="status-card">
        <span className="status-card__eyebrow">현재 시각 기준</span>
        {current ? (
          <>
            <h2>{current.subject} 수업이 진행 중이에요.</h2>
            <p className="status-card__time">{formatEntryRange(current)}</p>
            <p>
              {next ? `끝나면 다음은 ${next.subject} 수업이에요.` : "이 수업이 끝나면 오늘 수업도 끝나요."}
            </p>
          </>
        ) : next ? (
          <>
            <h2>다음 수업은 {next.subject}이에요.</h2>
            <p className="status-card__time">
              {formatMinuteLabel(next.startMinute)} 시작
            </p>
            <p>{getRelativeStartLabel(next.startMinute, minuteOfDay)}</p>
          </>
        ) : todayEntries.length > 0 ? (
          <>
            <h2>오늘 수업은 모두 끝났어요.</h2>
            <p className="status-card__time">오늘 등록된 수업 {todayEntries.length}개</p>
            <p>내일 시간표를 미리 보고 싶다면 아래 요일을 눌러 보세요.</p>
          </>
        ) : (
          <>
            <h2>오늘 등록된 수업이 없어요.</h2>
            <p className="status-card__time">시간표를 만들면 여기서 바로 알려드릴게요.</p>
          </>
        )}
      </article>

      <div className="weekday-picker" role="tablist" aria-label="요일별 시간표">
        {WEEKDAY_OPTIONS.map((day) => (
          <button
            key={day.value}
            type="button"
            role="tab"
            className={day.value === selectedWeekday ? "weekday-pill weekday-pill--active" : "weekday-pill"}
            aria-selected={day.value === selectedWeekday}
            onClick={() => setSelectedWeekday(day.value)}
          >
            {day.label}
          </button>
        ))}
      </div>

      {selectedEntry ? (
        <article className="status-card status-card--selected">
          <span className="status-card__eyebrow">선택한 칸 기준</span>
          <h2>{selectedEntry.subject}</h2>
          <p className="status-card__time">{formatEntryRange(selectedEntry)}</p>
          <p>
            {getSelectedSummary({
              selectedEntry,
              selectedNext,
              isToday: selectedWeekday === todayWeekday,
              minuteOfDay,
            })}
          </p>
        </article>
      ) : null}

      {isLoading ? (
        <p>시간표를 불러오는 중이에요.</p>
      ) : weekdayEntries.length > 0 ? (
        <div className="schedule-list">
          {weekdayEntries.map((entry, index) => {
            const isSelected = entry.id === selectedEntryId;
            const isToday = selectedWeekday === todayWeekday;
            const isCurrent = isToday && current?.id === entry.id;
            const isNext = isToday && next?.id === entry.id;

            return (
              <button
                key={entry.id}
                type="button"
                className={
                  isSelected
                    ? "schedule-card schedule-card--selected"
                    : "schedule-card"
                }
                onClick={() => setSelectedEntryId(entry.id)}
              >
                <span className="schedule-card__color" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <div className="schedule-card__content">
                  <div className="schedule-card__meta">
                    <span className="schedule-card__order">{index + 1}번째</span>
                    {isCurrent ? <span className="schedule-card__badge">지금</span> : null}
                    {!isCurrent && isNext ? <span className="schedule-card__badge schedule-card__badge--ghost">다음</span> : null}
                  </div>
                  <strong>{entry.subject}</strong>
                  <span>{formatEntryRange(entry)}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : totalEntries === 0 ? (
        <div className="empty-card">
          <h2>아직 저장된 시간표가 없어요.</h2>
          <p>예시 시간표를 넣으면 현재 수업과 다음 수업 안내를 바로 확인할 수 있어요.</p>
          <button type="button" className="primary-button" onClick={handleSeedDemoSchedule} disabled={isSeedingDemo}>
            {isSeedingDemo ? "예시 시간표 넣는 중..." : "예시 시간표 넣기"}
          </button>
        </div>
      ) : (
        <div className="empty-card">
          <h2>이 요일에는 수업이 없어요.</h2>
          <p>다른 요일을 누르거나, 나중에 시간표를 더 추가해 보세요.</p>
        </div>
      )}
    </section>
  );
}
