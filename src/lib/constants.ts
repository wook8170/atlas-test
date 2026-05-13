import type { PomodoroSettings } from "@/domain/types";

export const DEFAULT_FOCUS_MINUTES = 15;
export const DEFAULT_BREAK_MINUTES = 5;
export const DEFAULT_LONG_BREAK_MINUTES = 15;
export const DEFAULT_LONG_BREAK_EVERY = 4;

export const FOCUS_RANGE = { min: 10, max: 30 } as const;
export const BREAK_RANGE = { min: 3, max: 10 } as const;

export const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

export const SCHEDULE_COLORS = [
  { value: "#f97316", label: "주황" },
  { value: "#f43f5e", label: "핑크" },
  { value: "#0f766e", label: "청록" },
  { value: "#2563eb", label: "파랑" },
  { value: "#7c3aed", label: "보라" },
  { value: "#16a34a", label: "초록" },
] as const;

export function createDefaultSettings(): PomodoroSettings {
  return {
    id: "default",
    focusMinutes: DEFAULT_FOCUS_MINUTES,
    breakMinutes: DEFAULT_BREAK_MINUTES,
    longBreakMinutes: DEFAULT_LONG_BREAK_MINUTES,
    longBreakEvery: DEFAULT_LONG_BREAK_EVERY,
    schemaVersion: 1,
  };
}
