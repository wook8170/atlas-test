import type {
  PomodoroSettings,
  SessionRecord,
  StudentProfile,
  WeeklyScheduleEntry,
} from "@/domain/types";

const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

export type AgendaStatus = "upcoming" | "in_progress" | "completed";
export type StudyUiMode = "ready" | "focus" | "break" | "completed";
export type StudyVisualFamily = "start" | "break" | "complete";

export interface TodayAgendaItem {
  id: string;
  subject: string;
  color: string;
  timeRangeLabel: string;
  plannedFocusMinutes: number;
  plannedBreakMinutes: number;
  focusLabel: string;
  breakLabel: string;
  status: AgendaStatus;
  statusLabel: string;
  completedCount: number;
}

export interface StudyPanelView {
  family: StudyVisualFamily;
  mode: StudyUiMode;
  chipLabel: string;
  headline: string;
  helperText: string;
  remainingLabel: string;
  currentStepLabel: string;
  summaryLabel: string;
  subjectLabel?: string;
  timeLabel?: string;
}

export interface HomeDashboardView {
  profileLabel: string;
  dateLabel: string;
  scheduleHeadline: string;
  progressLabel: string;
  todaySummaryLabel: string;
  totalFocusLabel: string;
  agenda: TodayAgendaItem[];
  hasAgenda: boolean;
  emptyMessage: string;
  state: StudyPanelView;
}

interface BuildHomeDashboardInput {
  profile?: StudentProfile;
  settings: PomodoroSettings;
  entries: WeeklyScheduleEntry[];
  sessions: SessionRecord[];
  now: Date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinuteOfDay(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${pad(hour)}:${pad(minute)}`;
}

function formatMinutesLabel(minutes: number): string {
  if (minutes >= 60) {
    const hour = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return remain > 0 ? `${hour}시간 ${remain}분` : `${hour}시간`;
  }
  return `${minutes}분`;
}

export function formatRemainingTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = safeSeconds % 60;
  return `${pad(minutes)}:${pad(remainSeconds)}`;
}

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildTodayAgenda(input: {
  entries: WeeklyScheduleEntry[];
  settings: PomodoroSettings;
  sessions: SessionRecord[];
  now: Date;
}): TodayAgendaItem[] {
  const { entries, settings, sessions, now } = input;
  const currentMinute = toMinuteOfDay(now);
  const completedCountByEntryId = new Map<string, number>();

  sessions
    .filter((session) => session.sessionType === "focus" && session.completed && session.scheduleEntryId)
    .forEach((session) => {
      const entryId = session.scheduleEntryId!;
      completedCountByEntryId.set(entryId, (completedCountByEntryId.get(entryId) ?? 0) + 1);
    });

  return [...entries]
    .sort((left, right) => left.startMinute - right.startMinute)
    .map((entry) => {
      const completedCount = completedCountByEntryId.get(entry.id) ?? 0;
      const isInProgress =
        currentMinute >= entry.startMinute &&
        currentMinute < entry.endMinute &&
        completedCount === 0;
      const status: AgendaStatus =
        completedCount > 0 ? "completed" : isInProgress ? "in_progress" : "upcoming";

      return {
        id: entry.id,
        subject: entry.subjectName,
        color: entry.subjectColor,
        timeRangeLabel: `${formatMinuteOfDay(entry.startMinute)}-${formatMinuteOfDay(entry.endMinute)}`,
        plannedFocusMinutes: settings.focusMinutes,
        plannedBreakMinutes: settings.breakMinutes,
        focusLabel: `${formatMinutesLabel(settings.focusMinutes)} 집중`,
        breakLabel: `${formatMinutesLabel(settings.breakMinutes)} 휴식`,
        status,
        statusLabel:
          status === "completed"
            ? `완료 ${completedCount}회`
            : status === "in_progress"
              ? "진행 중"
              : "예정",
        completedCount,
      };
    });
}

function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}`;
}

function formatTotalFocusLabel(totalFocusMinutes: number): string {
  return totalFocusMinutes > 0 ? `${formatMinutesLabel(totalFocusMinutes)} 집중` : "아직 기록 없음";
}

function buildStudyPanelView(input: {
  settings: PomodoroSettings;
  agenda: TodayAgendaItem[];
  completedSessionCount: number;
  totalFocusMinutes: number;
}): StudyPanelView {
  const { settings, agenda, completedSessionCount, totalFocusMinutes } = input;
  const activeAgenda = agenda.find((item) => item.status === "in_progress");
  const nextAgenda = agenda.find((item) => item.status !== "completed");
  const allAgendaCompleted = agenda.length > 0 && agenda.every((item) => item.status === "completed");
  const mode: StudyUiMode = allAgendaCompleted ? "completed" : activeAgenda ? "focus" : "ready";
  const cycleIndex = (completedSessionCount % settings.longBreakEvery) + 1;

  if (mode === "completed") {
    return {
      family: "complete",
      mode,
      chipLabel: "완료",
      headline: "오늘도 해냈어",
      helperText: "오늘 계획한 공부를 모두 확인했어요. 기록 탭에서 누적 시간을 다시 볼 수 있어요.",
      remainingLabel: "00:00",
      currentStepLabel: "오늘 계획 완료",
      summaryLabel:
        completedSessionCount > 0
          ? `${completedSessionCount}회 완료`
          : "오늘 기록 없음",
      subjectLabel: agenda.at(-1)?.subject,
      timeLabel: agenda.at(-1)?.timeRangeLabel,
    };
  }

  if (mode === "focus" && activeAgenda) {
    return {
      family: "start",
      mode,
      chipLabel: "집중 중",
      headline: `${activeAgenda.subject} 집중 시간`,
      helperText: "메인 화면에서 지금 공부할 과목과 오늘 남은 흐름을 한 번에 볼 수 있어요.",
      remainingLabel: formatRemainingTime(activeAgenda.plannedFocusMinutes * 60),
      currentStepLabel: `집중 ${cycleIndex}/${settings.longBreakEvery}`,
      summaryLabel:
        completedSessionCount > 0
          ? `${completedSessionCount}회 완료`
          : "첫 집중 진행 중",
      subjectLabel: activeAgenda.subject,
      timeLabel: activeAgenda.timeRangeLabel,
    };
  }

  return {
    family: "start",
    mode,
    chipLabel: "시작 전",
    headline: nextAgenda ? "집중 시작할 시간" : "오늘 시간표를 준비해 볼까",
    helperText: nextAgenda
      ? `${nextAgenda.subject}부터 차근차근 시작하면 돼요.`
      : "예정된 공부가 없으면 시간표 탭에서 오늘 공부를 먼저 채워 보세요.",
    remainingLabel: formatRemainingTime((nextAgenda?.plannedFocusMinutes ?? settings.focusMinutes) * 60),
    currentStepLabel: `집중 ${cycleIndex}/${settings.longBreakEvery} 준비`,
    summaryLabel:
      completedSessionCount > 0
        ? `${completedSessionCount}회 완료`
        : "첫 집중 전",
    subjectLabel: nextAgenda?.subject,
    timeLabel: nextAgenda?.timeRangeLabel,
  };
}

export function buildHomeDashboard(input: BuildHomeDashboardInput): HomeDashboardView {
  const { profile, settings, entries, sessions, now } = input;
  const agenda = buildTodayAgenda({
    entries,
    settings,
    sessions,
    now,
  });
  const completedSessions = sessions.filter(
    (session) => session.sessionType === "focus" && session.completed,
  );
  const completedSessionCount = completedSessions.length;
  const totalFocusMinutes = completedSessions.reduce(
    (sum, session) => sum + Math.round(sessionElapsedSeconds(session) / 60),
    0,
  );
  const completedAgendaCount = agenda.filter((item) => item.status === "completed").length;

  return {
    profileLabel: profile?.name ? `${profile.name}의 오늘 공부` : "오늘 공부 한눈에",
    dateLabel: formatDateLabel(now),
    scheduleHeadline: agenda.length > 0 ? "오늘 시간표" : "오늘 일정",
    progressLabel: agenda.length > 0 ? `${completedAgendaCount}/${agenda.length} 완료` : "예정 없음",
    todaySummaryLabel:
      completedSessionCount > 0
        ? `오늘 ${completedSessionCount}번 집중했어요.`
        : "오늘 첫 집중을 준비해요.",
    totalFocusLabel: formatTotalFocusLabel(totalFocusMinutes),
    agenda,
    hasAgenda: agenda.length > 0,
    emptyMessage: "오늘 예정된 공부가 없어요. 시간표 탭에서 오늘 공부를 추가해 주세요.",
    state: buildStudyPanelView({
      settings,
      agenda,
      completedSessionCount,
      totalFocusMinutes,
    }),
  };
}

function sessionElapsedSeconds(session: SessionRecord): number {
  if (typeof session.elapsedSeconds === "number" && session.elapsedSeconds >= 0) {
    return session.elapsedSeconds;
  }
  const startedAtMs = Date.parse(session.startedAt);
  const endedAtMs = Date.parse(session.endedAt);
  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs) || endedAtMs < startedAtMs) {
    return 0;
  }
  return Math.floor((endedAtMs - startedAtMs) / 1000);
}
