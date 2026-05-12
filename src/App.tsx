import { Navigate, Route, Routes } from "react-router-dom";
import { MobileAppShell } from "./components/MobileAppShell";
import { HomeRoute } from "./routes/HomeRoute";
import { TimetableRoute } from "./routes/TimetableRoute";
import { RecordsRoute } from "./routes/RecordsRoute";
import { SettingsRoute } from "./routes/SettingsRoute";
import { TimerFlowProvider } from "./timer/TimerFlowProvider";

export function App() {
  return (
    <TimerFlowProvider>
      <MobileAppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeRoute />} />
          <Route path="/timetable" element={<TimetableRoute />} />
          <Route path="/records" element={<RecordsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
        </Routes>
      </MobileAppShell>
    </TimerFlowProvider>
  );
}
