import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { createFocusTimerSnapshot } from "@/domain/timer";
import {
  clockToMinutes,
  minutesToClock,
  WEEKDAY_LABELS,
} from "@/domain/time";
import { LocalStateRepository, ScheduleRepository } from "@/repositories";

const DEFAULT_WEEKDAY = new Date().getDay() as WeeklyScheduleEntry["weekday"];

export function TimetableRoute() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [weekday, setWeekday] = useState<WeeklyScheduleEntry["weekday"]>(
    DEFAULT_WEEKDAY,
  );
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("16:25");
  const [color, setColor] = useState("#f59e0b");
  const [notice, setNotice] = useState<string | null>(null);

  async function loadEntries(): Promise<void> {
    setEntries(await ScheduleRepository.listAll());
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedSubject = subject.trim();
    const startMinute = clockToMinutes(startTime);
    const endMinute = clockToMinutes(endTime);

    if (!trimmedSubject) {
      setNotice("과목 이름을 먼저 적어 주세요.");
      return;
    }

    if (startMinute >= endMinute) {
      setNotice("끝나는 시간이 시작보다 늦어야 해요.");
      return;
    }

    await ScheduleRepository.upsert({
      id: crypto.randomUUID(),
      weekday,
      startMinute,
      endMinute,
      subject: trimmedSubject,
      color,
      schemaVersion: 1,
    });

    setSubject("");
    setStartTime("16:00");
    setEndTime("16:25");
    setNotice("시간표를 저장했어요. 새로고침해도 그대로 남아요.");
    await loadEntries();
  }

  async function handleDelete(id: string): Promise<void> {
    await ScheduleRepository.remove(id);
    setNotice("시간표에서 삭제했어요.");
    await loadEntries();
  }

  async function handleStart(entry: WeeklyScheduleEntry): Promise<void> {
    const active = await LocalStateRepository.getActiveTimer();
    if (active) {
      setNotice("이미 진행 중인 타이머가 있어요. 홈 화면에서 먼저 정리해 주세요.");
      navigate("/home");
      return;
    }

    const settings = await LocalStateRepository.getSettings();
    const snapshot = createFocusTimerSnapshot({
      durationMinutes: settings.focusMinutes,
      label: entry.subject,
      scheduleEntryId: entry.id,
    });

    await LocalStateRepository.saveActiveTimer(snapshot);
    navigate("/home");
  }

  const visibleEntries = entries.filter((entry) => entry.weekday === weekday);

  return (
    <section className="route route--timetable">
      <div className="route__stack">
        {notice ? <div className="notice-card">{notice}</div> : null}

        <section className="panel">
          <div className="section-heading">
            <div>
              <h1>시간표 저장</h1>
              <p>로컬 저장소에 저장한 시간표는 새로고침 뒤에도 다시 보입니다.</p>
            </div>
          </div>

          <div className="weekday-tabs" role="tablist" aria-label="요일 선택">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                className={`weekday-tab${weekday === index ? " weekday-tab--active" : ""}`}
                key={label}
                onClick={() => setWeekday(index as WeeklyScheduleEntry["weekday"])}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>과목 이름</span>
              <input
                onChange={(event) => setSubject(event.target.value)}
                placeholder="예: 수학 문제집"
                type="text"
                value={subject}
              />
            </label>
            <label className="field">
              <span>시작 시각</span>
              <input
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                value={startTime}
              />
            </label>
            <label className="field">
              <span>끝나는 시각</span>
              <input
                onChange={(event) => setEndTime(event.target.value)}
                type="time"
                value={endTime}
              />
            </label>
            <label className="field">
              <span>카드 색</span>
              <input
                onChange={(event) => setColor(event.target.value)}
                type="color"
                value={color}
              />
            </label>
            <button className="button button--primary" type="submit">
              시간표 저장
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>{WEEKDAY_LABELS[weekday]}요일 시간표</h2>
              <p>이 화면에서 저장한 데이터가 홈 화면과 새로고침 복구에 그대로 쓰여요.</p>
            </div>
          </div>

          {visibleEntries.length === 0 ? (
            <div className="empty-card">
              <p className="empty-card__title">아직 저장된 항목이 없어요.</p>
              <p className="route__muted">
                위 입력창에서 오늘 공부할 과목과 시간을 하나 추가해 보세요.
              </p>
            </div>
          ) : (
            <ul className="schedule-list">
              {visibleEntries.map((entry) => (
                <li className="schedule-card" key={entry.id}>
                  <div className="schedule-card__swatch" style={{ background: entry.color }} />
                  <div className="schedule-card__content">
                    <strong>{entry.subject}</strong>
                    <p>
                      {minutesToClock(entry.startMinute)} - {minutesToClock(entry.endMinute)}
                    </p>
                  </div>
                  <div className="schedule-card__actions">
                    <button
                      className="button button--secondary"
                      onClick={() => void handleStart(entry)}
                      type="button"
                    >
                      바로 시작
                    </button>
                    <button
                      className="button button--ghost"
                      onClick={() => void handleDelete(entry.id)}
                      type="button"
                    >
                      삭제
                    </button>
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
