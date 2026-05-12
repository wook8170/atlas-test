import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { ScheduleRepository } from "@/repositories";
import {
  COLOR_OPTIONS,
  WEEKDAY_LABELS,
  WEEKDAY_SEQUENCE,
  getNextOrder,
  getScheduleValidationError,
  minuteToTime,
  sortScheduleEntries,
  timeToMinute,
} from "@/lib/timetable";

type EditorState = {
  id?: string;
  weekday: WeeklyScheduleEntry["weekday"];
  order: number;
  subjectName: string;
  startTime: string;
  endTime: string;
  subjectColor: string;
};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_DURATION_MINUTES = 45;

export function TimetableRoute() {
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    setEntries(await ScheduleRepository.listAll());
  }

  function openCreate(weekday: WeeklyScheduleEntry["weekday"]) {
    const dayEntries = entries.filter((entry) => entry.weekday === weekday);
    const lastEntry = sortScheduleEntries(dayEntries).at(-1);
    const startMinute = lastEntry?.endMinute ?? timeToMinute(DEFAULT_START_TIME);
    const endMinute = Math.min(startMinute + DEFAULT_DURATION_MINUTES, 23 * 60 + 59);

    setEditor({
      weekday,
      order: getNextOrder(dayEntries),
      subjectName: "",
      startTime: minuteToTime(startMinute),
      endTime: minuteToTime(endMinute),
      subjectColor: COLOR_OPTIONS[dayEntries.length % COLOR_OPTIONS.length].value,
    });
    setError("");
    setNotice("");
  }

  function openEdit(entry: WeeklyScheduleEntry) {
    setEditor({
      id: entry.id,
      weekday: entry.weekday,
      order: entry.order ?? getNextOrder(entries.filter((candidate) => candidate.weekday === entry.weekday)),
      subjectName: entry.subjectName,
      startTime: minuteToTime(entry.startMinute),
      endTime: minuteToTime(entry.endMinute),
      subjectColor: entry.subjectColor,
    });
    setError("");
    setNotice("");
  }

  function updateEditor<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;

    const subjectName = editor.subjectName.trim();
    const nextEntry: WeeklyScheduleEntry = {
      id: editor.id ?? crypto.randomUUID(),
      weekday: editor.weekday,
      order: editor.order,
      subjectName,
      startMinute: timeToMinute(editor.startTime),
      endMinute: timeToMinute(editor.endTime),
      subjectColor: editor.subjectColor,
      isActive: true,
      createdAt:
        entries.find((entry) => entry.id === editor.id)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    const siblings = entries.filter(
      (entry) => entry.weekday === nextEntry.weekday && entry.id !== nextEntry.id,
    );
    const validationError = getScheduleValidationError(nextEntry, siblings);
    if (validationError) {
      setError(validationError);
      setNotice("");
      return;
    }

    try {
      await ScheduleRepository.upsert(nextEntry);
      await loadEntries();
      setEditor(null);
      setError("");
      setNotice(
        editor.id ? "시간표를 수정했어요." : `${WEEKDAY_LABELS[nextEntry.weekday]} 교시를 추가했어요.`,
      );
    } catch {
      setError("저장 중 문제가 생겼어요. 입력값은 그대로 두었으니 다시 시도해 주세요.");
      setNotice("");
    }
  }

  function getEntryById(id?: string) {
    return entries.find((entry) => entry.id === id);
  }

  async function handleDelete(entry: WeeklyScheduleEntry) {
    if (!window.confirm(`${entry.subjectName} 교시를 삭제할까요?`)) return;

    try {
      await ScheduleRepository.remove(entry.id);
      await loadEntries();
      setEditor((current) => (current?.id === entry.id ? null : current));
      setError("");
      setNotice(`${entry.subjectName} 교시를 삭제했어요.`);
    } catch {
      setError("삭제 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      setNotice("");
    }
  }

  return (
    <section className="route route--timetable">
      <div className="route-hero">
        <span className="route-hero__eyebrow">주간 시간표 편집</span>
        <h1>요일별 교시를 직접 채워요</h1>
        <p>
          교시 순서, 과목명, 시작 시각, 종료 시각을 저장하면 앱을 다시 열어도 그대로
          남아요.
        </p>
      </div>

      {notice ? <p className="feedback feedback--success">{notice}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}

      <section className="editor-card">
        <div className="editor-card__header">
          <div>
            <h2>{editor ? "교시 편집" : "새 교시 추가"}</h2>
            <p>요일을 고른 뒤 과목과 시간을 입력해 주세요.</p>
          </div>
          {editor ? (
            <button className="ghost-button" type="button" onClick={() => setEditor(null)}>
              닫기
            </button>
          ) : null}
        </div>

        {editor ? (
          <form className="editor-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>요일</span>
              <select
                value={editor.weekday}
                onChange={(event) =>
                  updateEditor("weekday", Number(event.target.value) as WeeklyScheduleEntry["weekday"])
                }
              >
                {WEEKDAY_SEQUENCE.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {WEEKDAY_LABELS[weekday]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>교시 순서</span>
              <input
                min={1}
                type="number"
                value={editor.order}
                onChange={(event) => updateEditor("order", Number(event.target.value))}
              />
            </label>

            <label className="field field--wide">
              <span>과목명</span>
              <input
                placeholder="예: 수학"
                type="text"
                value={editor.subjectName}
              onChange={(event) => updateEditor("subjectName", event.target.value)}
              />
            </label>

            <label className="field">
              <span>시작 시각</span>
              <input
                type="time"
                value={editor.startTime}
                onChange={(event) => updateEditor("startTime", event.target.value)}
              />
            </label>

            <label className="field">
              <span>종료 시각</span>
              <input
                type="time"
                value={editor.endTime}
                onChange={(event) => updateEditor("endTime", event.target.value)}
              />
            </label>

            <fieldset className="field field--wide color-field">
              <legend>색상</legend>
              <div className="color-options">
                {COLOR_OPTIONS.map((option) => (
                  <label className="color-option" key={option.value}>
                    <input
                      checked={editor.subjectColor === option.value}
                      name="entry-color"
                      type="radio"
                      value={option.value}
                      onChange={(event) => updateEditor("subjectColor", event.target.value)}
                    />
                    <span
                      aria-hidden="true"
                      className="color-option__swatch"
                      style={{ backgroundColor: option.value }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="editor-actions">
              <button className="primary-button" type="submit">
                {editor.id ? "수정 저장" : "교시 저장"}
              </button>
              {editor.id ? (
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => {
                    const entry = getEntryById(editor.id);
                    if (entry) {
                      void handleDelete(entry);
                    }
                  }}
                >
                  삭제
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="editor-empty">
            <p>아래 요일에서 “교시 추가”를 눌러 바로 입력을 시작해 보세요.</p>
          </div>
        )}
      </section>

      <div className="weekday-grid">
        {WEEKDAY_SEQUENCE.map((weekday) => {
          const dayEntries = entries.filter((entry) => entry.weekday === weekday);

          return (
            <section className="weekday-card" key={weekday}>
              <div className="weekday-card__header">
                <div>
                  <h2>{WEEKDAY_LABELS[weekday]}</h2>
                  <p>{dayEntries.length === 0 ? "아직 비어 있어요" : `${dayEntries.length}개 교시`}</p>
                </div>
                <button className="secondary-button" type="button" onClick={() => openCreate(weekday)}>
                  교시 추가
                </button>
              </div>

              {dayEntries.length === 0 ? (
                <div className="weekday-card__empty">
                  <p>등록된 교시가 없어요. 짧게라도 오늘 공부 계획을 남겨 보세요.</p>
                </div>
              ) : (
                <ol className="entry-list">
                  {sortScheduleEntries(dayEntries).map((entry) => (
                    <li className="entry-card" key={entry.id}>
                      <div
                        aria-hidden="true"
                        className="entry-card__accent"
                        style={{ backgroundColor: entry.subjectColor }}
                      />
                      <div className="entry-card__body">
                        <div className="entry-card__topline">
                          <span className="entry-order">{entry.order ?? "-"}교시</span>
                          <strong>{entry.subjectName}</strong>
                        </div>
                        <p>
                          {minuteToTime(entry.startMinute)} - {minuteToTime(entry.endMinute)}
                        </p>
                      </div>
                      <div className="entry-card__actions">
                        <button className="ghost-button" type="button" onClick={() => openEdit(entry)}>
                          수정
                        </button>
                        <button className="ghost-button ghost-button--danger" type="button" onClick={() => handleDelete(entry)}>
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
