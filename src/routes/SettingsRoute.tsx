import { useEffect, useState } from "react";

import type { ErrorLog } from "@/domain/types";
import {
  BREAK_RANGE,
  FOCUS_RANGE,
  createDefaultSettings,
} from "@/lib/constants";
import { getErrorMessage, markLatestRetryResult, recordError } from "@/lib/errors";
import { formatDateTime } from "@/lib/time";
import { LocalStateRepository, ErrorLogRepository } from "@/repositories";

export function SettingsRoute() {
  const [focusMinutes, setFocusMinutes] = useState(createDefaultSettings().focusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(createDefaultSettings().breakMinutes);
  const [stickerCount, setStickerCount] = useState(0);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings(): Promise<void> {
    try {
      const [settings, rewardState, recentLogs] = await Promise.all([
        LocalStateRepository.getSettings(),
        LocalStateRepository.getRewardState(),
        ErrorLogRepository.recent(20),
      ]);
      setFocusMinutes(settings.focusMinutes);
      setBreakMinutes(settings.breakMinutes);
      setStickerCount(rewardState.stickerCount);
      setLogs(recentLogs);
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      await recordError("settings_load", loadError);
    }
  }

  async function handleSave(): Promise<void> {
    const action = "settings_save";
    if (focusMinutes < FOCUS_RANGE.min || focusMinutes > FOCUS_RANGE.max) {
      setError(`집중 시간은 ${FOCUS_RANGE.min}~${FOCUS_RANGE.max}분 사이여야 합니다.`);
      return;
    }
    if (breakMinutes < BREAK_RANGE.min || breakMinutes > BREAK_RANGE.max) {
      setError(`휴식 시간은 ${BREAK_RANGE.min}~${BREAK_RANGE.max}분 사이여야 합니다.`);
      return;
    }

    try {
      await LocalStateRepository.updateSettings({ focusMinutes, breakMinutes });
      await markLatestRetryResult(action, "retry_succeeded");
      setStatus("기본 설정을 저장했습니다. 이후 시작하는 세션부터 새 값이 적용됩니다.");
      await loadSettings();
    } catch (saveError) {
      await markLatestRetryResult(action, "retry_failed");
      await recordError(action, saveError);
      setError(getErrorMessage(saveError));
    }
  }

  async function handleReset(): Promise<void> {
    const action = "settings_reset";
    if (resetConfirmText !== "RESET") {
      setError("초기화를 진행하려면 RESET 을 정확히 입력하세요.");
      return;
    }

    try {
      await LocalStateRepository.resetLearningData();
      await markLatestRetryResult(action, "retry_succeeded");
      setResetConfirmText("");
      setResetOpen(false);
      setStatus("학습 데이터(시간표, 세션, 보상, 오류 로그)를 초기화했습니다.");
      await loadSettings();
    } catch (resetError) {
      await markLatestRetryResult(action, "retry_failed");
      await recordError(action, resetError);
      setError(getErrorMessage(resetError));
    }
  }

  return (
    <section className="route route--settings">
      <div className="route-hero">
        <div>
          <p className="route-eyebrow">기본 시간과 복구</p>
          <h1>세션 기본값, 누적 보상, 오류 로그를 관리</h1>
        </div>
      </div>

      {status ? <div className="inline-banner inline-banner--success">{status}</div> : null}
      {error ? <div className="inline-banner inline-banner--danger">{error}</div> : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">기본 설정</p>
            <h2>집중 / 휴식 시간</h2>
          </div>
          <span className="status-pill">{stickerCount} 스티커</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>집중 시간</span>
            <input
              type="number"
              min={FOCUS_RANGE.min}
              max={FOCUS_RANGE.max}
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>휴식 시간</span>
            <input
              type="number"
              min={BREAK_RANGE.min}
              max={BREAK_RANGE.max}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="action-row">
          <button className="button button--primary" onClick={() => void handleSave()}>
            저장
          </button>
          <button className="button button--ghost" onClick={() => setResetOpen((open) => !open)}>
            학습 데이터 초기화
          </button>
        </div>

        {resetOpen ? (
          <div className="danger-box">
            <p>시간표, 세션, 보상, 오류 로그를 초기화합니다. profile/settings 는 유지됩니다.</p>
            <label className="field">
              <span>확인을 위해 RESET 입력</span>
              <input
                value={resetConfirmText}
                onChange={(event) => setResetConfirmText(event.target.value)}
                placeholder="RESET"
              />
            </label>
            <button className="button button--danger" onClick={() => void handleReset()}>
              최종 확인
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">최근 오류 기록</p>
            <h2>저장 실패와 재시도 결과</h2>
          </div>
        </div>
        <p className="muted-copy">
          동일 동작을 다시 시도해 성공하면 가장 최근의 미해결 오류가 자동으로 성공 처리됩니다.
        </p>
        <div className="log-list">
          {logs.length === 0 ? (
            <p className="muted-copy">아직 기록된 오류가 없습니다.</p>
          ) : null}
          {logs.map((log) => (
            <article key={log.id} className="log-card">
              <div className="log-card__header">
                <strong>{log.action}</strong>
                <span className={`status-pill status-pill--${log.retryResult}`}>{log.retryResult}</span>
              </div>
              <p>{log.reason}</p>
              <small>{formatDateTime(log.occurredAt)}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
