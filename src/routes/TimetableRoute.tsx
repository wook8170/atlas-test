import { FormEvent, useState } from "react";
import { useOfflineApp } from "@/state/OfflineAppContext";
import {
  formatMinute,
  minuteFromTime,
  timeFromMinute,
  WEEKDAY_LABELS,
} from "@/state/time";
import type { WeeklyScheduleEntry } from "@/domain/types";

export function TimetableRoute() {
  const { schedules, addSchedule, removeSchedule, seedSchedule } = useOfflineApp();
  const [weekday, setWeekday] = useState<WeeklyScheduleEntry["weekday"]>(1);
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:40");
  const [color, setColor] = useState("#3566e2");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startMinute = minuteFromTime(startTime);
    const endMinute = minuteFromTime(endTime);
    if (!subject.trim() || endMinute <= startMinute) return;

    await addSchedule({
      weekday,
      subject,
      startMinute,
      endMinute,
      color,
    });

    setSubject("");
  }

  return (
    <section className="route route--timetable">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h1>로컬 시간표</h1>
            <p>모든 항목은 기기 안에 저장되므로 네트워크가 없어도 그대로 조회됩니다.</p>
          </div>
          {schedules.length === 0 ? (
            <button className="button button--ghost" onClick={() => void seedSchedule()}>
              샘플 채우기
            </button>
          ) : null}
        </div>

        <form className="editor-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>요일</span>
            <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value) as WeeklyScheduleEntry["weekday"])}>
              {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}요일
                </option>
              ))}
            </select>
          </label>

          <label className="field field--wide">
            <span>과목</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="예: 수학"
              required
            />
          </label>

          <label className="field">
            <span>시작</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>

          <label className="field">
            <span>종료</span>
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </label>

          <label className="field">
            <span>색상</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>

          <button className="button button--primary field field--cta" type="submit">
            로컬에 저장
          </button>
        </form>
      </div>

      <div className="stack-list">
        {Object.entries(WEEKDAY_LABELS).map(([value, label]) => {
          const daySchedules = schedules.filter((entry) => entry.weekday === Number(value));
          return (
            <section key={value} className="panel">
              <div className="panel__header">
                <div>
                  <h2>{label}요일</h2>
                  <p>{daySchedules.length === 0 ? "아직 저장된 항목이 없습니다." : `${daySchedules.length}개 저장됨`}</p>
                </div>
              </div>
              {daySchedules.length === 0 ? (
                <p className="empty-state">이 요일은 비어 있습니다.</p>
              ) : (
                <div className="stack-list">
                  {daySchedules.map((entry) => (
                    <article key={entry.id} className="schedule-card">
                      <span className="schedule-card__swatch" style={{ backgroundColor: entry.color }} />
                      <div className="schedule-card__body">
                        <strong>{entry.subject}</strong>
                        <span>{formatMinute(entry.startMinute)} - {formatMinute(entry.endMinute)}</span>
                        <small>{timeFromMinute(entry.startMinute)} 시작</small>
                      </div>
                      <button className="button button--ghost button--small" onClick={() => void removeSchedule(entry.id)}>
                        삭제
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
