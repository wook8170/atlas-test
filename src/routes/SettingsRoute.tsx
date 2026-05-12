import { FormEvent, useEffect, useState } from "react";
import type { PomodoroSettings } from "@/domain/types";
import { LocalStateRepository } from "@/repositories";

export function SettingsRoute() {
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void LocalStateRepository.getSettings().then(setSettings);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!settings) return;

    await LocalStateRepository.updateSettings({
      focusMinutes: Math.max(1, settings.focusMinutes),
      breakMinutes: Math.max(1, settings.breakMinutes),
      longBreakMinutes: Math.max(1, settings.longBreakMinutes),
      longBreakEvery: Math.max(1, settings.longBreakEvery),
    });
    setNotice("다음 타이머부터 새 시간을 사용할게요.");
  }

  if (!settings) {
    return (
      <section className="route route--settings">
        <div className="panel">
          <p className="route__muted">설정을 불러오는 중이에요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="route route--settings">
      <div className="route__stack">
        {notice ? <div className="notice-card">{notice}</div> : null}

        <section className="panel">
          <div className="section-heading">
            <div>
              <h1>기본 시간 설정</h1>
              <p>여기서 바꾼 값은 로컬에 저장되어 새로고침 후에도 유지돼요.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>집중 시간(분)</span>
              <input
                min={1}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, focusMinutes: Number(event.target.value) }
                      : current,
                  )
                }
                type="number"
                value={settings.focusMinutes}
              />
            </label>
            <label className="field">
              <span>짧은 휴식(분)</span>
              <input
                min={1}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, breakMinutes: Number(event.target.value) }
                      : current,
                  )
                }
                type="number"
                value={settings.breakMinutes}
              />
            </label>
            <label className="field">
              <span>긴 휴식(분)</span>
              <input
                min={1}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, longBreakMinutes: Number(event.target.value) }
                      : current,
                  )
                }
                type="number"
                value={settings.longBreakMinutes}
              />
            </label>
            <label className="field">
              <span>긴 휴식 주기</span>
              <input
                min={1}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, longBreakEvery: Number(event.target.value) }
                      : current,
                  )
                }
                type="number"
                value={settings.longBreakEvery}
              />
            </label>
            <button className="button button--primary" type="submit">
              설정 저장
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
