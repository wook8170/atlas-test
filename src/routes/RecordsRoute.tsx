import { FormEvent, useEffect, useState } from "react";
import {
  createEmptyTodaySummary,
  sessionElapsedSeconds,
  sessionSubjectLabel,
  sortSessionsNewestFirst,
} from "@/domain/sessionUtils";
import type { CompletionReason, SessionRecord, TodaySummary } from "@/domain/types";
import { SessionRepository } from "@/repositories";

type SessionFormStatus = "completed" | "interrupted" | "cancelled";

type SessionFormState = {
  label: string;
  startedAt: string;
  endedAt: string;
  status: SessionFormStatus;
};

const STATUS_LABELS: Record<SessionFormStatus, string> = {
  completed: "완료",
  interrupted: "중단",
  cancelled: "취소",
};

function toCompletionReason(status: SessionFormStatus): CompletionReason {
  if (status === "completed") {
    return "finished";
  }
  return status === "interrupted" ? "user_stopped" : "abandoned";
}

function toSessionFormStatus(session: SessionRecord): SessionFormStatus {
  if (session.completed) {
    return "completed";
  }
  return session.completionReason === "abandoned" ? "cancelled" : "interrupted";
}

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createDefaultForm(): SessionFormState {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 25 * 60 * 1000);

  return {
    label: "",
    startedAt: toDateTimeInputValue(startedAt),
    endedAt: toDateTimeInputValue(endedAt),
    status: "completed",
  };
}

function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00`));
}

function formatClock(value: string | undefined): string {
  if (!value) {
    return "--:--";
  }

  const [, time = ""] = value.split("T");
  return time.slice(0, 5);
}

function formatDuration(session: SessionRecord): string {
  return `${Math.round(sessionElapsedSeconds(session) / 60)}분`;
}

export function RecordsRoute() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [summary, setSummary] = useState<TodaySummary>(() => createEmptyTodaySummary(todayKey()));
  const [form, setForm] = useState<SessionFormState>(() => createDefaultForm());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const date = todayKey();
    const [todaySessions, todaySummary, recentRecords] = await Promise.all([
      SessionRepository.listByDate(date),
      SessionRepository.todaySummary(date),
      SessionRepository.listRecent(8),
    ]);

    setSessions(sortSessionsNewestFirst(todaySessions));
    setRecentSessions(recentRecords);
    setSummary(todaySummary);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const label = form.label.trim();
    if (!label) {
      setError("과목 또는 자유 과제명을 입력하세요.");
      return;
    }

    const startedAt = new Date(form.startedAt);
    const endedAt = new Date(form.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      setError("시작 시각과 종료 시각을 정확히 입력하세요.");
      return;
    }

    if (endedAt <= startedAt) {
      setError("종료 시각은 시작 시각보다 뒤여야 합니다.");
      return;
    }

    setSaving(true);

    try {
      await SessionRepository.append({
        id: crypto.randomUUID(),
        scheduleEntryId: null,
        freeTaskTitle: label,
        sessionType: "focus",
        startedAt: form.startedAt,
        endedAt: form.endedAt,
        completed: form.status === "completed",
        localDateKey: todayKey(startedAt),
        createdAt: new Date().toISOString(),
        elapsedSeconds: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
        completionReason: toCompletionReason(form.status),
        schemaVersion: 1,
      });
      await loadData();
      setForm(createDefaultForm());
    } catch (submitError) {
      console.error(submitError);
      setError("세션 기록을 저장하지 못했습니다. 다시 시도하세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="route route--records">
      <div className="section-heading">
        <div>
          <h1>오늘의 세션 기록</h1>
          <p>{formatDayLabel(summary.date)}에 남긴 집중 세션과 완료 수를 확인합니다.</p>
        </div>
      </div>

      <div className="summary-grid">
        <article className="metric-card metric-card--strong">
          <span className="metric-card__label">오늘 완료한 집중 세션</span>
          <strong>{loading ? "-" : `${summary.completedSessions}회`}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">누적 집중 시간</span>
          <strong>{loading ? "-" : `${summary.totalFocusMinutes}분`}</strong>
        </article>
      </div>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>세션 남기기</h2>
            <p>완료된 집중 세션마다 과목 또는 자유 과제명을 기록해 오늘 진행 상황을 쌓습니다.</p>
          </div>
        </div>
        <form className="session-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>과목 또는 자유 과제명</span>
            <input
              type="text"
              placeholder="예: 수학, 영어 단어 복습"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>시작 시각</span>
              <input
                type="datetime-local"
                value={form.startedAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startedAt: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>종료 시각</span>
              <input
                type="datetime-local"
                value={form.endedAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endedAt: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="field">
            <span>완료 여부</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as SessionFormStatus,
                }))
              }
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "저장 중..." : "세션 기록 저장"}
          </button>
        </form>
      </section>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>오늘 기록</h2>
            <p>완료 여부와 함께 시작/종료 시각을 남겨 오늘의 집중 흐름을 확인합니다.</p>
          </div>
        </div>

        {summary.bySubject.length > 0 ? (
          <div className="tag-row">
            {summary.bySubject.map((item) => (
              <span className="tag-chip" key={item.subject}>
                {item.subject} {item.count}회
              </span>
            ))}
          </div>
        ) : null}

        {sessions.length > 0 ? (
          <ul className="session-list">
            {sessions.map((session) => (
              <li className="session-list__item" key={session.id}>
                <div>
                  <strong>{sessionSubjectLabel(session)}</strong>
                  <p>
                    {formatClock(session.startedAt)} - {formatClock(session.endedAt)} ·{" "}
                    {formatDuration(session)}
                  </p>
                </div>
                <span className={`status-pill status-pill--${toSessionFormStatus(session)}`}>
                  {STATUS_LABELS[toSessionFormStatus(session)]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            아직 오늘 기록이 없습니다. 첫 세션을 저장하면 완료 수와 목록이 바로 갱신됩니다.
          </p>
        )}
      </section>

      <section className="stack-card">
        <div className="section-heading">
          <div>
            <h2>최근 기록</h2>
            <p>기기에 저장된 집중 세션을 최신 순서로 확인합니다.</p>
          </div>
        </div>

        {recentSessions.length > 0 ? (
          <ul className="session-list">
            {recentSessions.map((session) => (
              <li className="session-list__item" key={session.id}>
                <div>
                  <strong>{sessionSubjectLabel(session)}</strong>
                  <p>
                    {formatDayLabel(session.localDateKey)} · {formatClock(session.startedAt)} -{" "}
                    {formatClock(session.endedAt)} · {formatDuration(session)}
                  </p>
                </div>
                <span className={`status-pill status-pill--${toSessionFormStatus(session)}`}>
                  {STATUS_LABELS[toSessionFormStatus(session)]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            아직 저장된 세션 기록이 없습니다. 세션을 저장하면 최근 기록이 쌓입니다.
          </p>
        )}
      </section>
    </section>
  );
}
