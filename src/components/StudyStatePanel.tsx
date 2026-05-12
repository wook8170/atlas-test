import type { StudyPanelView } from "@/routes/homeDashboard";

export function StudyStatePanel({ state }: { state: StudyPanelView }) {
  return (
    <section
      aria-label="현재 타이머 상태"
      className={`study-panel study-panel--${state.family}`}
    >
      <div aria-hidden="true" className="study-panel__glow" />
      <div className="study-panel__topline">
        <span className="study-panel__chip">{state.chipLabel}</span>
        <span className="study-panel__caption">현재 타이머</span>
      </div>
      <div className="study-panel__headline-wrap">
        <h2 className="study-panel__headline">{state.headline}</h2>
        <p className="study-panel__helper">{state.helperText}</p>
      </div>
      {(state.subjectLabel || state.timeLabel) && (
        <div className="study-panel__context">
          {state.subjectLabel && <span>{state.subjectLabel}</span>}
          {state.timeLabel && <span>{state.timeLabel}</span>}
        </div>
      )}
      <dl className="study-panel__stats">
        <div className="study-panel__stat">
          <dt>남은 시간</dt>
          <dd>{state.remainingLabel}</dd>
        </div>
        <div className="study-panel__stat">
          <dt>현재 단계</dt>
          <dd>{state.currentStepLabel}</dd>
        </div>
        <div className="study-panel__stat">
          <dt>오늘 진행</dt>
          <dd>{state.summaryLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
