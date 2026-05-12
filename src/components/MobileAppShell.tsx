import { NavLink, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useOfflineApp } from "@/state/OfflineAppContext";

const TABS = [
  { to: "/home", label: "홈" },
  { to: "/timetable", label: "시간표" },
  { to: "/records", label: "기록" },
  { to: "/settings", label: "설정" },
];

export function MobileAppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { online } = useOfflineApp();
  const current = TABS.find((t) => pathname.startsWith(t.to))?.label ?? "초딩 뽀모도로";
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <div className="app-shell__eyebrow">초딩 뽀모도로</div>
          <div className="app-shell__title">{current}</div>
        </div>
        <span className={`status-pill ${online ? "status-pill--online" : "status-pill--offline"}`}>
          {online ? "온라인" : "오프라인"}
        </span>
      </header>
      <main className="app-shell__main">{children}</main>
      <nav className="app-shell__tabs">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className="app-shell__tab">
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
