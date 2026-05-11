import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository } from "@/repositories";
import {
  WEEKDAY_LABELS,
  formatRemaining,
  getTodayAgenda,
  minuteToTime,
} from "@/lib/timetable";

export function HomeRoute() {
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void loadEntries();
    const timerId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  async function loadEntries() {
    setEntries(await ScheduleRepository.listAll());
  }

  const agenda = getTodayAgenda(entries, now);
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const currentTimeLabel = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);

  return (
    <section className="route route--home">
      <div className="route-hero route-hero--compact">
        <span className="route-hero__eyebrow">오늘 시간표</span>
        <h1>{dateLabel}</h1>
        <p>{currentTimeLabel} 기준으로 오늘 교시를 바로 보여줘요.</p>
      </div>

      <section className="study-panel study-panel--start">
        <div className="study-panel__meta">
          <span className="study-chip">{WEEKDAY_LABELS[agenda.weekday]}</span>
          <span className="study-panel__time">현재 시각 {currentTimeLabel}</span>
        </div>

        {agenda.currentEntry ? (
          <>
            <h2>지금은 {agenda.currentEntry.subject} 시간</h2>
            <p className="study-panel__summary">
              {minuteToTime(agenda.currentEntry.startMinute)} -{" "}
              {minuteToTime(agenda.currentEntry.endMinute)} ·{" "}
              {formatRemaining(agenda.remainingMinutes ?? 0)} 남음
            </p>
            <p className="study-panel__helper">
              {agenda.nextEntry
                ? `다음 교시는 ${agenda.nextEntry.subject} (${minuteToTime(
                    agenda.nextEntry.startMinute,
                  )} 시작) 이에요.`
                : "오늘 남은 다음 교시는 없어요. 지금 교시에 집중해 보세요."}
            </p>
          </>
        ) : agenda.nextEntry ? (
          <>
            <h2>다음 교시를 기다리고 있어요</h2>
            <p className="study-panel__summary">
              {agenda.nextEntry.subject} · {minuteToTime(agenda.nextEntry.startMinute)} 시작
            </p>
            <p className="study-panel__helper">
              {formatRemaining(agenda.minutesUntilNext ?? 0)} 뒤에 시작해요. 지금은 잠깐 쉬거나
              준비물을 챙겨 보세요.
            </p>
          </>
        ) : agenda.todayEntries.length === 0 ? (
          <>
            <h2>오늘 시간표가 비어 있어요</h2>
            <p className="study-panel__summary">
              아직 등록된 교시가 없어요. 시간표 탭에서 오늘 공부 계획을 먼저 채워 주세요.
            </p>
            <Link className="inline-link" to="/timetable">
              시간표 입력하러 가기
            </Link>
          </>
        ) : (
          <>
            <h2>오늘 교시를 모두 마쳤어요</h2>
            <p className="study-panel__summary">
              마지막 교시는 {agenda.todayEntries.at(-1)?.subject}였어요.
            </p>
            <p className="study-panel__helper">
              내일 일정은 시간표 탭에서 미리 정리해 둘 수 있어요.
            </p>
          </>
        )}
      </section>

      <section className="today-list-section">
        <div className="section-heading">
          <div>
            <h2>오늘 교시 목록</h2>
            <p>현재 교시와 다음 교시를 한눈에 구분할 수 있게 정리했어요.</p>
          </div>
          <Link className="text-link" to="/timetable">
            시간표 수정
          </Link>
        </div>

        {agenda.todayEntries.length === 0 ? (
          <div className="weekday-card__empty">
            <p>오늘은 표시할 교시가 없어요. 시간표 탭에서 요일별 교시를 추가해 주세요.</p>
          </div>
        ) : (
          <ol className="today-entry-list">
            {agenda.todayEntries.map((entry) => {
              const variant =
                entry.id === agenda.currentEntry?.id
                  ? "current"
                  : entry.id === agenda.nextEntry?.id
                    ? "next"
                    : entry.endMinute <= minuteOfDay
                      ? "past"
                      : "upcoming";

              return (
                <li
                  className={`today-entry-card today-entry-card--${variant}`}
                  key={entry.id}
                  style={{ "--entry-color": entry.color } as CSSProperties}
                >
                  <div className="today-entry-card__header">
                    <span className="entry-order">{entry.order}교시</span>
                    <span className={`status-pill status-pill--${variant}`}>
                      {variant === "current"
                        ? "진행 중"
                        : variant === "next"
                          ? "다음"
                          : variant === "past"
                            ? "지난 교시"
                            : "예정"}
                    </span>
                  </div>
                  <strong>{entry.subject}</strong>
                  <p>
                    {minuteToTime(entry.startMinute)} - {minuteToTime(entry.endMinute)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}
