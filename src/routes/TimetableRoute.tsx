import { useEffect, useState } from "react";

import type { WeeklyScheduleEntry } from "@/domain/types";
import {
  BREAK_RANGE,
  FOCUS_RANGE,
  SCHEDULE_COLORS,
  WEEKDAY_LABELS,
  createDefaultSettings,
} from "@/lib/constants";
import { getErrorMessage, markLatestRetryResult, recordError } from "@/lib/errors";
import { createId, formatMinuteLabel, inputValueToMinute, minuteToInputValue } from "@/lib/time";
import { LocalStateRepository, ScheduleRepository } from "@/repositories";

type TimetableFormState = {
  subject: string;
  startTime: string;
  endTime: string;
  color: string;
  focusMinutes: number;
  breakMinutes: number;
  isActive: boolean;
};

function createEmptyForm(
  focusMinutes = createDefaultSettings().focusMinutes,
  breakMinutes = createDefaultSettings().breakMinutes,
): TimetableFormState {
  return {
    subject: "",
    startTime: "15:00",
    endTime: "15:15",
    color: SCHEDULE_COLORS[0]?.value ?? "#2563eb",
    focusMinutes,
    breakMinutes,
    isActive: true,
  };
}

export function TimetableRoute() {
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [selectedWeekday, setSelectedWeekday] = useState(new Date().getDay());
  const [formState, setFormState] = useState<TimetableFormState>(createEmptyForm());
  const [defaults, setDefaults] = useState(createDefaultSettings());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDefaults();
  }, []);

  useEffect(() => {
    void loadEntries(selectedWeekday);
  }, [selectedWeekday]);

  async function loadDefaults(): Promise<void> {
    try {
      const settings = await LocalStateRepository.getSettings();
      setDefaults(settings);
      setFormState(createEmptyForm(settings.focusMinutes, settings.breakMinutes));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      await recordError("timetable_load_defaults", loadError);
    }
  }

  async function loadEntries(weekday: number): Promise<void> {
    try {
      setEntries(await ScheduleRepository.listByWeekday(weekday));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      await recordError("timetable_load", loadError);
    }
  }

  function openCreateForm(): void {
    setEditingId(null);
    setFormState(createEmptyForm(defaults.focusMinutes, defaults.breakMinutes));
    setFormOpen(true);
    setStatus(null);
  }

  function openEditForm(entry: WeeklyScheduleEntry): void {
    setEditingId(entry.id);
    setFormState({
      subject: entry.subject,
      startTime: minuteToInputValue(entry.startMinute),
      endTime: minuteToInputValue(entry.endMinute),
      color: entry.color,
      focusMinutes: entry.focusMinutes,
      breakMinutes: entry.breakMinutes,
      isActive: entry.isActive,
    });
    setFormOpen(true);
    setStatus(null);
  }

  function patchForm(
    patch: Partial<TimetableFormState>,
  ): void {
    setFormState((current) => ({ ...current, ...patch }));
  }

  async function handleSave(): Promise<void> {
    const action = "timetable_save";
    const subject = formState.subject.trim();
    const startMinute = inputValueToMinute(formState.startTime);
    const endMinute = inputValueToMinute(formState.endTime);

    if (!subject) {
      setError("과목명은 필수입니다.");
      return;
    }
    if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || startMinute >= endMinute) {
      setError("종료 시각은 시작 시각보다 뒤여야 합니다.");
      return;
    }
    if (formState.focusMinutes < FOCUS_RANGE.min || formState.focusMinutes > FOCUS_RANGE.max) {
      setError(`집중 시간은 ${FOCUS_RANGE.min}~${FOCUS_RANGE.max}분 범위여야 합니다.`);
      return;
    }
    if (formState.breakMinutes < BREAK_RANGE.min || formState.breakMinutes > BREAK_RANGE.max) {
      setError(`휴식 시간은 ${BREAK_RANGE.min}~${BREAK_RANGE.max}분 범위여야 합니다.`);
      return;
    }

    const entry: WeeklyScheduleEntry = {
      id: editingId ?? createId("schedule"),
      weekday: selectedWeekday as WeeklyScheduleEntry["weekday"],
      startMinute,
      endMinute,
      subject,
      color: formState.color,
      focusMinutes: formState.focusMinutes,
      breakMinutes: formState.breakMinutes,
      isActive: formState.isActive,
      schemaVersion: 1,
    };

    try {
      await ScheduleRepository.upsert(entry);
      await markLatestRetryResult(action, "retry_succeeded");
      setStatus(editingId ? "시간표를 수정했어요." : "새 학습 칸을 추가했어요.");
      setFormOpen(false);
      setEditingId(null);
      await loadEntries(selectedWeekday);
    } catch (saveError) {
      await markLatestRetryResult(action, "retry_failed");
      await recordError(action, saveError);
      setError(getErrorMessage(saveError));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    const action = "timetable_delete";
    if (!window.confirm("이 학습 칸을 삭제할까요?")) return;
    try {
      await ScheduleRepository.remove(id);
      await markLatestRetryResult(action, "retry_succeeded");
      setStatus("학습 칸을 삭제했어요.");
      await loadEntries(selectedWeekday);
    } catch (deleteError) {
      await markLatestRetryResult(action, "retry_failed");
      await recordError(action, deleteError);
      setError(getErrorMessage(deleteError));
    }
  }

  return (
    <section className="route route--timetable">
      <div className="route-hero">
        <div>
          <p className="route-eyebrow">요일별 시간표 관리</p>
          <h1>과목, 시각, 집중/휴식 시간을 직접 구성</h1>
        </div>
        <button className="button button--primary" onClick={openCreateForm}>
          추가
        </button>
      </div>

      {status ? <div className="inline-banner inline-banner--success">{status}</div> : null}
      {error ? <div className="inline-banner inline-banner--danger">{error}</div> : null}

      <div className="chip-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <button
            key={label}
            className={`chip ${selectedWeekday === index ? "chip--active" : ""}`}
            onClick={() => setSelectedWeekday(index)}
          >
            {label.replace("요일", "")}
          </button>
        ))}
      </div>

      {formOpen ? (
        <section className="panel panel--editor">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">{WEEKDAY_LABELS[selectedWeekday]}</p>
              <h2>{editingId ? "학습 칸 수정" : "새 학습 칸 추가"}</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="field field--wide">
              <span>과목명</span>
              <input
                value={formState.subject}
                onChange={(event) => patchForm({ subject: event.target.value })}
                placeholder="예: 수학 문제집"
              />
            </label>
            <label className="field">
              <span>시작 시각</span>
              <input
                type="time"
                value={formState.startTime}
                onChange={(event) => patchForm({ startTime: event.target.value })}
              />
            </label>
            <label className="field">
              <span>종료 시각</span>
              <input
                type="time"
                value={formState.endTime}
                onChange={(event) => patchForm({ endTime: event.target.value })}
              />
            </label>
            <label className="field">
              <span>집중 시간</span>
              <input
                type="number"
                min={FOCUS_RANGE.min}
                max={FOCUS_RANGE.max}
                value={formState.focusMinutes}
                onChange={(event) => patchForm({ focusMinutes: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>휴식 시간</span>
              <input
                type="number"
                min={BREAK_RANGE.min}
                max={BREAK_RANGE.max}
                value={formState.breakMinutes}
                onChange={(event) => patchForm({ breakMinutes: Number(event.target.value) })}
              />
            </label>
            <label className="field field--wide">
              <span>색상</span>
              <div className="color-picker">
                {SCHEDULE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`color-picker__swatch ${
                      formState.color === color.value ? "color-picker__swatch--active" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    onClick={() => patchForm({ color: color.value })}
                  />
                ))}
              </div>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) => patchForm({ isActive: event.target.checked })}
              />
              <span>홈 화면에서 바로 시작할 수 있게 활성화</span>
            </label>
          </div>
          <div className="action-row">
            <button className="button button--primary" onClick={() => void handleSave()}>
              저장
            </button>
            <button className="button button--ghost" onClick={() => setFormOpen(false)}>
              취소
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{WEEKDAY_LABELS[selectedWeekday]}</p>
            <h2>등록된 학습 칸</h2>
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="empty-card">
            <h3>아직 등록된 시간표가 없어요.</h3>
            <p>추가 버튼을 눌러 오늘 학습 칸을 만들어 보세요.</p>
          </div>
        ) : null}
        <div className="card-list">
          {entries.map((entry) => (
            <article key={entry.id} className="schedule-card">
              <div className="schedule-card__header">
                <div>
                  <h3>{entry.subject}</h3>
                  <p>
                    {formatMinuteLabel(entry.startMinute)} - {formatMinuteLabel(entry.endMinute)}
                  </p>
                </div>
                <span className={`status-pill ${entry.isActive ? "status-pill--active" : ""}`}>
                  {entry.isActive ? "활성" : "숨김"}
                </span>
              </div>
              <div className="schedule-card__details">
                <span>집중 {entry.focusMinutes}분</span>
                <span>휴식 {entry.breakMinutes}분</span>
              </div>
              <div className="action-row">
                <button className="button button--subtle" onClick={() => openEditForm(entry)}>
                  수정
                </button>
                <button className="button button--ghost" onClick={() => void handleDelete(entry.id)}>
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
