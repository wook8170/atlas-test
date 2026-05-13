export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMinuteLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${minutes}`.padStart(2, "0")}`;
}

export function minuteToInputValue(totalMinutes: number): string {
  return formatMinuteLabel(totalMinutes);
}

export function inputValueToMinute(value: string): number {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.NaN;
  return hour * 60 + minute;
}

export function formatMinutes(value: number): string {
  if (value <= 0) return "0분";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${getLocalDateKey(date)} ${formatMinuteLabel(
    date.getHours() * 60 + date.getMinutes(),
  )}`;
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
