import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getLocalDateKey } from "@/domain/sessionSummary";
import type { CompletionReason } from "@/domain/types";
import { SessionRepository } from "@/repositories/SessionRepository";
import { MobileAppShell } from "./components/MobileAppShell";
import { HomeRoute } from "./routes/HomeRoute";
import { TimetableRoute } from "./routes/TimetableRoute";
import { RecordsRoute } from "./routes/RecordsRoute";
import { SettingsRoute } from "./routes/SettingsRoute";

type ActiveSession = {
  id: string;
  freeTaskTitle: string;
  startedAt: string;
  focusMinutes: number;
};

export function App() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);

  function startFreeTaskSession(taskTitle: string, focusMinutes: number): void {
    if (activeSession) {
      return;
    }

    setActiveSession({
      id: globalThis.crypto.randomUUID(),
      freeTaskTitle: taskTitle,
      startedAt: new Date().toISOString(),
      focusMinutes,
    });
  }

  async function finishActiveSession(
    reason: Extract<CompletionReason, "finished" | "user_stopped">,
  ): Promise<void> {
    if (!activeSession) {
      return;
    }

    const endedAt = new Date();
    const startedAt = new Date(activeSession.startedAt);

    await SessionRepository.append({
      id: activeSession.id,
      scheduleEntryId: null,
      freeTaskTitle: activeSession.freeTaskTitle,
      sessionType: "focus",
      startedAt: activeSession.startedAt,
      endedAt: endedAt.toISOString(),
      elapsedSeconds: Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)),
      completed: reason === "finished",
      completionReason: reason,
      localDateKey: getLocalDateKey(startedAt),
      createdAt: endedAt.toISOString(),
      schemaVersion: 1,
    });

    setActiveSession(null);
    setRecordsRefreshKey((current) => current + 1);
  }

  return (
    <MobileAppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/home"
          element={(
            <HomeRoute
              activeSession={activeSession}
              onStartFreeTask={startFreeTaskSession}
              onFinishActiveSession={finishActiveSession}
            />
          )}
        />
        <Route path="/timetable" element={<TimetableRoute />} />
        <Route path="/records" element={<RecordsRoute refreshKey={recordsRefreshKey} />} />
        <Route path="/settings" element={<SettingsRoute />} />
      </Routes>
    </MobileAppShell>
  );
}
