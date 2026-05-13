import { useEffect, useState, type FormEvent } from "react";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository } from "@/repositories";
import {
  DEFAULT_TIMETABLE_DRAFT,
  WEEKDAY_OPTIONS,
  formatMinutes,
  sortScheduleEntries,
  toTimetableDraft,
  toWeeklyScheduleEntry,
  validateTimetableDraft,
  type TimetableDraft,
} from "./timetableForm";

export function TimetableRoute() {
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [draft, setDraft] = useState<TimetableDraft>(DEFAULT_TIMETABLE_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const savedEntries = await ScheduleRepository.listAll();
      setEntries(sortScheduleEntries(savedEntries));
      setErrorMessage(null);
    } catch {
      setErrorMessage("시간표를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
    } finally {
      setIsLoaded(true);
    }
  }

  function updateDraft<Key extends keyof TimetableDraft>(
    key: Key,
    value: TimetableDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrorMessage(null);
  }

  function resetForm() {
    setDraft(DEFAULT_TIMETABLE_DRAFT);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateTimetableDraft(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setStatusMessage(null);
      return;
    }

    setIsSaving(true);

    try {
      await ScheduleRepository.upsert(toWeeklyScheduleEntry(draft, editingId ?? undefined));
      await loadEntries();
      resetForm();
      setStatusMessage(
        editingId ? "시간표 항목을 수정했어요." : "시간표 항목을 저장했어요.",
      );
    } catch {
      setErrorMessage("시간표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setStatusMessage(null);
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(entry: WeeklyScheduleEntry) {
    setDraft(toTimetableDraft(entry));
    setEditingId(entry.id);
    setStatusMessage(`${entry.subject} 항목을 수정하고 있어요.`);
    setErrorMessage(null);
  }

  async function handleDelete(entry: WeeklyScheduleEntry) {
    if (!window.confirm(`${entry.subject} 시간표 항목을 삭제할까요?`)) {
      return;
    }

    try {
      await ScheduleRepository.remove(entry.id);
      await loadEntries();

      if (editingId === entry.id) {
        resetForm();
      }

      setStatusMessage("시간표 항목을 삭제했어요.");
    } catch {
      setErrorMessage("시간표를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setStatusMessage(null);
    }
  }

  return (
    <section className="route route--timetable">
      <div className="timetable-hero">
        <div>
          <p className="route__eyebrow">Weekly Study Blocks</p>
          <h1>시간표</h1>
          <p className="timetable-hero__body">
            과목명, 시작 시각, 종료 시각을 모두 입력한 항목만 저장돼요.
          </p>
        </div>
        <div className="timetable-hero__badge">
          <strong>{entries.length}</strong>
          <span>saved</span>
        </div>
      </div>

      <div className="timetable-layout">
        <form className="timetable-card timetable-form" onSubmit={handleSubmit}>
          <div className="timetable-card__header">
            <div>
              <h2>{editingId ? "시간표 수정" : "시간표 추가"}</h2>
              <p>하루 학습 칸을 저장해 오늘 공부 루틴을 정리해 보세요.</p>
            </div>
            {editingId ? (
              <button
                className="button button--ghost"
                type="button"
                onClick={() => {
                  resetForm();
                  setStatusMessage("새 시간표를 추가할 수 있도록 입력 폼을 초기화했어요.");
                }}
              >
                새로 입력
              </button>
            ) : null}
          </div>

          <div className="timetable-form__grid">
            <label className="field">
              <span>요일</span>
              <select
                value={draft.weekday}
                onChange={(event) =>
                  updateDraft(
                    "weekday",
                    Number(event.target.value) as TimetableDraft["weekday"],
                  )
                }
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>과목명</span>
              <input
                type="text"
                value={draft.subject}
                placeholder="예: 수학, 영어"
                onChange={(event) => updateDraft("subject", event.target.value)}
              />
            </label>

            <label className="field">
              <span>시작 시각</span>
              <input
                type="time"
                value={draft.startTime}
                onChange={(event) => updateDraft("startTime", event.target.value)}
              />
            </label>

            <label className="field">
              <span>종료 시각</span>
              <input
                type="time"
                value={draft.endTime}
                onChange={(event) => updateDraft("endTime", event.target.value)}
              />
            </label>
          </div>

          <label className="field field--color">
            <span>대표 색상</span>
            <div className="field__color-row">
              <input
                aria-label="대표 색상"
                type="color"
                value={draft.color}
                onChange={(event) => updateDraft("color", event.target.value)}
              />
              <span>{draft.color}</span>
            </div>
          </label>

          {statusMessage ? (
            <p className="feedback feedback--success" aria-live="polite">
              {statusMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="feedback feedback--error" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}

          <div className="timetable-form__actions">
            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : editingId ? "수정 저장" : "시간표 저장"}
            </button>
            <p className="timetable-form__hint">
              저장 전에 과목명, 시작 시각, 종료 시각이 모두 들어갔는지 확인해요.
            </p>
          </div>
        </form>

        <div className="timetable-card">
          <div className="timetable-card__header">
            <div>
              <h2>저장된 시간표</h2>
              <p>요일별로 정렬된 학습 칸이에요.</p>
            </div>
          </div>

          {!isLoaded ? (
            <p className="timetable-empty">시간표를 불러오는 중이에요.</p>
          ) : entries.length === 0 ? (
            <p className="timetable-empty">
              아직 저장된 시간표가 없어요. 첫 학습 칸을 만들어 보세요.
            </p>
          ) : (
            <div className="timetable-groups">
              {WEEKDAY_OPTIONS.map((day) => {
                const dayEntries = entries.filter((entry) => entry.weekday === day.value);

                return (
                  <section key={day.value} className="day-group">
                    <div className="day-group__header">
                      <h3>{day.label}</h3>
                      <span>{dayEntries.length}개</span>
                    </div>

                    {dayEntries.length === 0 ? (
                      <p className="day-group__empty">등록된 항목이 없어요.</p>
                    ) : (
                      <div className="day-group__list">
                        {dayEntries.map((entry) => (
                          <article key={entry.id} className="schedule-entry">
                            <div className="schedule-entry__summary">
                              <span
                                className="schedule-entry__swatch"
                                style={{ backgroundColor: entry.color }}
                                aria-hidden="true"
                              />
                              <div>
                                <strong>{entry.subject}</strong>
                                <p>
                                  {formatMinutes(entry.startMinute)} -{" "}
                                  {formatMinutes(entry.endMinute)}
                                </p>
                              </div>
                            </div>

                            <div className="schedule-entry__actions">
                              <button
                                className="button button--ghost"
                                type="button"
                                onClick={() => handleEdit(entry)}
                              >
                                수정
                              </button>
                              <button
                                className="button button--danger"
                                type="button"
                                onClick={() => void handleDelete(entry)}
                              >
                                삭제
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
