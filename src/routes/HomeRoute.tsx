import { useEffect, useRef, useState } from "react";
import type { PomodoroSettings } from "@/domain/types";
import { DEFAULT_SETTINGS, LocalStateRepository } from "@/repositories/LocalStateRepository";
import {
  advanceTimerPhase,
  createInitialTimer,
  formatClock,
  getPhaseLabel,
  type TimerSignal,
  type TimerSnapshot,
} from "./homeTimerModel";

type TimerStatus = "idle" | "running" | "paused";

interface TimerState extends TimerSnapshot {
  status: TimerStatus;
}

type BrowserAudioContext = AudioContext & { close?: () => Promise<void> };

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function createIdleTimer(settings: PomodoroSettings): TimerState {
  return {
    ...createInitialTimer(settings),
    status: "idle",
  };
}

export function HomeRoute() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [timer, setTimer] = useState<TimerState>(() => createIdleTimer(DEFAULT_SETTINGS));
  const [signal, setSignal] = useState<TimerSignal | null>(null);

  const timerRef = useRef(timer);
  const settingsRef = useRef(settings);
  const deadlineRef = useRef<number | null>(null);
  const audioContextRef = useRef<BrowserAudioContext | null>(null);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let active = true;

    void LocalStateRepository.getSettings()
      .then((nextSettings) => {
        if (!active) {
          return;
        }
        setSettings(nextSettings);
        setTimer((current) => (current.status === "idle" ? createIdleTimer(nextSettings) : current));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSettings(DEFAULT_SETTINGS);
        setTimer((current) => (current.status === "idle" ? createIdleTimer(DEFAULT_SETTINGS) : current));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (timer.status !== "running") {
      deadlineRef.current = null;
      return;
    }

    deadlineRef.current = Date.now() + timer.remainingSeconds * 1000;
    const intervalId = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (!deadline) {
        return;
      }
      const nextRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimer((current) => {
        if (current.status !== "running" || current.remainingSeconds === nextRemaining) {
          return current;
        }
        return { ...current, remainingSeconds: nextRemaining };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status !== "running" || timer.remainingSeconds !== 0) {
      return;
    }

    const { next, signal: nextSignal } = advanceTimerPhase(timer, settingsRef.current);
    deadlineRef.current = Date.now() + next.totalSeconds * 1000;
    setSignal(nextSignal);
    playSignalTone(audioContextRef.current, nextSignal.kind);
    setTimer({ ...next, status: "running" });
  }, [timer]);

  useEffect(() => {
    if (!signal) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSignal(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [signal]);

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      if (audioContext && typeof audioContext.close === "function") {
        void audioContext.close();
      }
    };
  }, []);

  const paused = timer.status === "paused";

  async function primeAudio() {
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    const currentAudioContext = audioContextRef.current ?? new AudioCtor();
    audioContextRef.current = currentAudioContext;
    if (currentAudioContext.state === "suspended") {
      try {
        await currentAudioContext.resume();
      } catch {
        return;
      }
    }
  }

  function startTimer() {
    void primeAudio();
    setSignal(null);
    setTimer({ ...createInitialTimer(settingsRef.current), status: "running" });
  }

  function pauseTimer() {
    const deadline = deadlineRef.current;
    const remainingSeconds = deadline
      ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      : timerRef.current.remainingSeconds;

    setTimer((current) => ({ ...current, status: "paused", remainingSeconds }));
  }

  function resumeTimer() {
    void primeAudio();
    setTimer((current) => ({ ...current, status: "running" }));
  }

  function stopTimer() {
    setSignal(null);
    setTimer(createIdleTimer(settingsRef.current));
  }

  const nextBreakMinutes =
    (timer.completedFocusSessions + 1) % Math.max(1, Math.round(settings.longBreakEvery)) === 0
      ? settings.longBreakMinutes
      : settings.breakMinutes;

  return (
    <section className={`route route--home home-timer home-timer--${timer.phase}`}>
      <div className="home-timer__panel">
        <p className="home-timer__eyebrow">오늘의 타이머</p>
        <h1 className="home-timer__clock">{formatClock(timer.remainingSeconds)}</h1>
        <p className="home-timer__subject">자유 공부</p>
        <p className="home-timer__phase">{getPhaseLabel(timer.phase, paused)}</p>
        <p className="home-timer__hint">
          집중이나 휴식이 끝나면 화면 신호가 바로 뜨고, 브라우저 소리가 허용되면 효과음도
          함께 재생됩니다.
        </p>
      </div>

      {signal ? (
        <div
          className={`home-timer__signal home-timer__signal--${signal.accent}`}
          role="status"
          aria-live="assertive"
        >
          <strong>{signal.title}</strong>
          <span>{signal.message}</span>
        </div>
      ) : null}

      <dl className="home-timer__stats">
        <div>
          <dt>집중</dt>
          <dd>{settings.focusMinutes}분</dd>
        </div>
        <div>
          <dt>짧은 휴식</dt>
          <dd>{settings.breakMinutes}분</dd>
        </div>
        <div>
          <dt>다음 휴식</dt>
          <dd>{timer.phase === "focus" ? `${nextBreakMinutes}분` : `${settings.focusMinutes}분`}</dd>
        </div>
        <div>
          <dt>완료한 집중</dt>
          <dd>{timer.completedFocusSessions}회</dd>
        </div>
      </dl>

      <div className="home-timer__actions">
        {timer.status === "idle" ? (
          <button type="button" className="home-timer__button home-timer__button--primary" onClick={startTimer}>
            집중 시작
          </button>
        ) : null}
        {timer.status === "running" ? (
          <button type="button" className="home-timer__button home-timer__button--primary" onClick={pauseTimer}>
            일시정지
          </button>
        ) : null}
        {timer.status === "paused" ? (
          <button type="button" className="home-timer__button home-timer__button--primary" onClick={resumeTimer}>
            다시 시작
          </button>
        ) : null}
        {timer.status !== "idle" ? (
          <button type="button" className="home-timer__button home-timer__button--ghost" onClick={stopTimer}>
            끝내기
          </button>
        ) : null}
      </div>
    </section>
  );
}

function playSignalTone(
  audioContext: BrowserAudioContext | null,
  kind: TimerSignal["kind"],
) {
  if (!audioContext || audioContext.state === "closed") {
    return;
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }

  const notes = kind === "focus-complete" ? [784, 988] : [988, 784];
  notes.forEach((note, index) => {
    const startAt = audioContext.currentTime + index * 0.18;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.16);
  });
}
