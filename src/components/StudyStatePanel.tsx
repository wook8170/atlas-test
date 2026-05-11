export type StudyVisualFamily = "start" | "break" | "complete";
export type StudyUiMode = "ready" | "focus" | "short-break" | "long-break" | "completed";

export interface StudyVisualState {
  family: StudyVisualFamily;
  headline: string;
  statusChipLabel: "시작 전" | "집중 중" | "쉬는 시간" | "완료";
  helperText: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  timerText: string;
}

interface DeriveStudyVisualStateInput {
  mode: StudyUiMode;
  isRunning: boolean;
  remainingSec: number;
  completedSessionsToday: number;
  progressValue: number;
  progressTarget: number;
  taskLabel: string;
}

interface StudyStatePanelProps {
  state: StudyVisualState;
  taskLabel: string;
  completedSessionsToday: number;
  progressLabel: string;
  onPrimaryAction(): void;
  onSecondaryAction?(): void;
}

function formatRemaining(remainingSec: number) {
  const minutes = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const seconds = String(remainingSec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function deriveStudyVisualState(
  input: DeriveStudyVisualStateInput,
): StudyVisualState {
  if (input.mode === "completed") {
    return {
      family: "complete",
      headline: "한 사이클 완료!",
      statusChipLabel: "완료",
      helperText: `오늘 완료한 집중 ${input.completedSessionsToday}번을 기록 화면에서 확인해 보세요.`,
      primaryActionLabel: "오늘 기록 보기",
      secondaryActionLabel: "다시 시작",
      timerText: "축하해요",
    };
  }

  if (input.mode === "focus") {
    return {
      family: "start",
      headline: input.isRunning ? "지금은 집중 시간" : "잠깐 멈춘 집중 시간",
      statusChipLabel: "집중 중",
      helperText: `${input.taskLabel}에 집중하고 있어요. 긴 휴식까지 ${Math.max(input.progressTarget - input.progressValue, 0)}번 남았어요.`,
      primaryActionLabel: input.isRunning ? "잠깐 멈춤" : "계속하기",
      secondaryActionLabel: "그만할래",
      timerText: formatRemaining(input.remainingSec),
    };
  }

  if (input.mode === "short-break" || input.mode === "long-break") {
    return {
      family: "break",
      headline: input.isRunning ? "쉬는 시간이에요" : "쉬는 시간을 이어가요",
      statusChipLabel: "쉬는 시간",
      helperText:
        input.mode === "long-break"
          ? "긴 휴식이 끝나면 한 사이클이 마무리돼요."
          : "짧게 쉬고 다음 집중으로 넘어갈 준비를 해요.",
      primaryActionLabel: input.isRunning ? "잠깐 멈춤" : "계속하기",
      secondaryActionLabel: "그만할래",
      timerText: formatRemaining(input.remainingSec),
    };
  }

  return {
    family: "start",
    headline:
      input.progressValue > 0 ? "다음 집중을 시작할 시간" : "집중 시작할 시간",
    statusChipLabel: "시작 전",
    helperText:
      input.progressValue > 0
        ? `${input.taskLabel} 다음 회차를 시작하면 반복 ${input.progressValue + 1}단계예요.`
        : "집중, 짧은 휴식, 긴 휴식 순서로 뽀모도로를 이어갈 수 있어요.",
    primaryActionLabel: "집중 시작",
    timerText: formatRemaining(input.remainingSec),
  };
}

export function StudyStatePanel({
  state,
  taskLabel,
  completedSessionsToday,
  progressLabel,
  onPrimaryAction,
  onSecondaryAction,
}: StudyStatePanelProps) {
  return (
    <article className="study-panel" data-family={state.family}>
      <div className="study-panel__header">
        <span className="status-pill">{state.statusChipLabel}</span>
        <span className="mini-badge">{progressLabel}</span>
      </div>

      <div className="study-panel__body">
        <div>
          <p className="study-panel__eyebrow">{taskLabel}</p>
          <h2 className="study-panel__title">{state.headline}</h2>
          <p className="study-panel__helper">{state.helperText}</p>
        </div>
        <div className="study-panel__timer">{state.timerText}</div>
      </div>

      <div className="study-panel__footer">
        <div className="mini-stat">
          <span className="mini-stat__label">오늘 완료</span>
          <strong>{completedSessionsToday}회</strong>
        </div>
        <div className="study-panel__actions">
          {onSecondaryAction ? (
            <button type="button" className="action-button action-button--ghost" onClick={onSecondaryAction}>
              {state.secondaryActionLabel}
            </button>
          ) : null}
          <button type="button" className="action-button" onClick={onPrimaryAction}>
            {state.primaryActionLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
