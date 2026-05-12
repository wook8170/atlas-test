import { FormEvent, useEffect, useState } from "react";
import { useOfflineApp } from "@/state/OfflineAppContext";

export function SettingsRoute() {
  const { online, settings, updateSettings } = useOfflineApp();
  const [focusMinutes, setFocusMinutes] = useState(String(settings.focusMinutes));
  const [breakMinutes, setBreakMinutes] = useState(String(settings.breakMinutes));
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(settings.longBreakMinutes));
  const [longBreakEvery, setLongBreakEvery] = useState(String(settings.longBreakEvery));

  useEffect(() => {
    setFocusMinutes(String(settings.focusMinutes));
    setBreakMinutes(String(settings.breakMinutes));
    setLongBreakMinutes(String(settings.longBreakMinutes));
    setLongBreakEvery(String(settings.longBreakEvery));
  }, [settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateSettings({
      focusMinutes: Math.max(1, Number(focusMinutes) || settings.focusMinutes),
      breakMinutes: Math.max(1, Number(breakMinutes) || settings.breakMinutes),
      longBreakMinutes: Math.max(1, Number(longBreakMinutes) || settings.longBreakMinutes),
      longBreakEvery: Math.max(2, Number(longBreakEvery) || settings.longBreakEvery),
    });
  }

  return (
    <section className="route route--settings">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h1>로컬 설정</h1>
            <p>설정값은 IndexedDB에 저장되어 오프라인 상태에서도 그대로 유지됩니다.</p>
          </div>
          <span className={`status-pill ${online ? "status-pill--online" : "status-pill--offline"}`}>
            {online ? "동기화 준비" : "완전 로컬"}
          </span>
        </div>

        <form className="editor-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>집중 시간(분)</span>
            <input
              type="number"
              min="1"
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(event.target.value)}
            />
          </label>
          <label className="field">
            <span>짧은 휴식(분)</span>
            <input
              type="number"
              min="1"
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(event.target.value)}
            />
          </label>
          <label className="field">
            <span>긴 휴식(분)</span>
            <input
              type="number"
              min="1"
              value={longBreakMinutes}
              onChange={(event) => setLongBreakMinutes(event.target.value)}
            />
          </label>
          <label className="field">
            <span>긴 휴식 전 반복</span>
            <input
              type="number"
              min="2"
              value={longBreakEvery}
              onChange={(event) => setLongBreakEvery(event.target.value)}
            />
          </label>
          <button className="button button--primary field field--cta" type="submit">
            로컬 설정 저장
          </button>
        </form>
      </div>
    </section>
  );
}
