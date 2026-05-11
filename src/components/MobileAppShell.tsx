import { NavLink, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useStudyTimer } from "@/context/StudyTimerContext";

const TABS = [
  { to: "/home", label: "홈" },
  { to: "/timetable", label: "시간표" },
  { to: "/records", label: "기록" },
  { to: "/settings", label: "설정" },
];

export function MobileAppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const current = TABS.find((t) => pathname.startsWith(t.to))?.label ?? "초딩 뽀모도로";
  const { runtime } = useStudyTimer();
  const statusLabel =
    runtime.mode === "focus"
      ? "집중 중"
      : runtime.mode === "short-break" || runtime.mode === "long-break"
        ? "쉬는 시간"
        : runtime.mode === "completed"
          ? "사이클 완료"
          : null;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">초딩 뽀모도로</p>
          <h1 className="app-shell__title">{current}</h1>
        </div>
        {statusLabel ? <span className="app-shell__status">{statusLabel}</span> : null}
      </header>
      <main className="app-shell__main">{children}</main>
      <nav className="app-shell__tabs">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              isActive ? "app-shell__tab app-shell__tab--active" : "app-shell__tab"
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
