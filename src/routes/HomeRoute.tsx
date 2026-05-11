import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudyStatePanel, deriveStudyVisualState } from "@/components/StudyStatePanel";
import { useStudyTimer } from "@/context/StudyTimerContext";
import type { WeeklyScheduleEntry } from "@/domain/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatClock(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function HomeRoute() {
  const navigate = useNavigate();
  const {
    settings,
    schedules,
    todaySummary,
    runtime,
    startFocus,
    pauseTimer,
    resumeTimer,
    stopTimer,
    isBootstrapping,
  } = useStudyTimer();
  const [selectionMode, setSelectionMode] = useState<"schedule" | "free">("schedule");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [freeTaskTitle, setFreeTaskTitle] = useState("자율 학습");

  const todayWeekday = new Date().getDay() as WeeklyScheduleEntry["weekday"];
  const todaySchedules = schedules
    .filter((entry) => entry.weekday === todayWeekday)
    .sort((left, right) => left.startMinute - right.startMinute);
  const selectedSchedule = todaySchedules.find((entry) => entry.id === selectedScheduleId);

  useEffect(() => {
    if (!todaySchedules.length) {
      setSelectionMode("free");
      return;
    }

    setSelectionMode((current) => (current === "free" ? current : "schedule"));
    setSelectedScheduleId((current) => current || todaySchedules[0].id);
  }, [todaySchedules]);

  if (!settings) {
    return (
      <section className="route route--home">
        <div className="empty-state">
          <h2>타이머 준비 중</h2>
          <p>로컬 설정과 오늘 기록을 불러오고 있어요.</p>
        </div>
      </section>
    );
  }

  const activeTaskLabel =
    runtime.currentTask?.label ??
    selectedSchedule?.subject ??
    freeTaskTitle.trim() ??
    "자율 학습";
  const progressValue =
    runtime.mode === "completed"
      ? settings.longBreakEvery
      : Math.min(runtime.completedFocusInCycle, settings.longBreakEvery);
  const visualState = deriveStudyVisualState({
    mode: runtime.mode,
    isRunning: runtime.isRunning,
    remainingSec: runtime.remainingSec,
    completedSessionsToday: todaySummary.completedSessions,
    progressValue,
    progressTarget: settings.longBreakEvery,
    taskLabel: activeTaskLabel,
  });

  function handlePrimaryAction() {
    if (runtime.mode === "completed") {
      navigate("/records");
      return;
    }

    if (runtime.mode === "ready") {
      const nextTask =
        selectionMode === "schedule" && selectedSchedule
          ? { scheduleEntryId: selectedSchedule.id, label: selectedSchedule.subject }
          : {
              scheduleEntryId: null,
              label: freeTaskTitle.trim() || "자율 학습",
            };
      void startFocus(nextTask);
      return;
    }

    if (runtime.isRunning) {
      pauseTimer();
      return;
    }

    void resumeTimer();
  }

  function handleSecondaryAction() {
    if (runtime.mode === "completed") {
      const nextTask =
        selectionMode === "schedule" && selectedSchedule
          ? { scheduleEntryId: selectedSchedule.id, label: selectedSchedule.subject }
          : {
              scheduleEntryId: null,
              label: freeTaskTitle.trim() || "자율 학습",
            };
      void startFocus(nextTask);
      return;
    }

    void stopTimer();
  }

  return (
    <section className="route route--home">
      <StudyStatePanel
        state={visualState}
        taskLabel={activeTaskLabel}
        completedSessionsToday={todaySummary.completedSessions}
        progressLabel={`${progressValue}/${settings.longBreakEvery} 반복`}
        onPrimaryAction={handlePrimaryAction}
        onSecondaryAction={visualState.secondaryActionLabel ? handleSecondaryAction : undefined}
      />

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-card__label">집중 시간</span>
          <strong className="metric-card__value">{settings.focusMinutes}분</strong>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">짧은 휴식</span>
          <strong className="metric-card__value">{settings.shortBreakMinutes}분</strong>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">긴 휴식</span>
          <strong className="metric-card__value">{settings.longBreakMinutes}분</strong>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">긴 휴식 전 반복</span>
          <strong className="metric-card__value">{settings.longBreakEvery}회</strong>
        </article>
      </div>

      <div className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">오늘의 시작 활동</p>
            <h2>{WEEKDAY_LABELS[todayWeekday]}요일 학습 선택</h2>
          </div>
          {isBootstrapping ? <span className="mini-badge">새로고침 중</span> : null}
        </div>

        <div className="task-toggle">
          <button
            type="button"
            className={
              selectionMode === "schedule" ? "choice-chip choice-chip--active" : "choice-chip"
            }
            onClick={() => setSelectionMode("schedule")}
            disabled={!todaySchedules.length || runtime.mode !== "ready"}
          >
            오늘 시간표
          </button>
          <button
            type="button"
            className={
              selectionMode === "free" ? "choice-chip choice-chip--active" : "choice-chip"
            }
            onClick={() => setSelectionMode("free")}
            disabled={runtime.mode !== "ready"}
          >
            자유 과제
          </button>
        </div>

        {selectionMode === "schedule" && todaySchedules.length ? (
          <div className="task-list">
            {todaySchedules.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={
                  entry.id === selectedScheduleId
                    ? "task-card task-card--active"
                    : "task-card"
                }
                onClick={() => setSelectedScheduleId(entry.id)}
                disabled={runtime.mode !== "ready"}
              >
                <strong>{entry.subject}</strong>
                <span>
                  {formatClock(entry.startMinute)} - {formatClock(entry.endMinute)}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {selectionMode === "schedule" && !todaySchedules.length ? (
          <p className="support-text">
            오늘 시간표가 아직 없어서 자유 과제로 먼저 시작할 수 있어요.
          </p>
        ) : null}

        {selectionMode === "free" ? (
          <label className="field">
            <span className="field__label">과제 이름</span>
            <input
              value={freeTaskTitle}
              onChange={(event) => setFreeTaskTitle(event.target.value)}
              placeholder="예: 독서, 숙제, 자율 학습"
              disabled={runtime.mode !== "ready"}
            />
          </label>
        ) : null}
      </div>

      <div className="content-card content-card--compact">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">오늘의 성과</p>
            <h2>{todaySummary.completedSessions}번 집중 완료</h2>
          </div>
          <button type="button" className="text-link" onClick={() => navigate("/records")}>
            오늘 기록 보기
          </button>
        </div>
        <p className="support-text">
          총 {Math.round(todaySummary.totalFocusMinutes)}분 집중했고, 긴 휴식까지
          {Math.max(settings.longBreakEvery - progressValue, 0)}번 남았어요.
        </p>
      </div>
    </section>
  );
}
