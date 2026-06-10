import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { SetupPage } from "./pages/SetupPage";
import { ValuePage } from "./pages/ValuePage";
import { PurposePage } from "./pages/PurposePage";
import { BudgetPage } from "./pages/BudgetPage";
import { ExplorePage } from "./pages/ExplorePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { FavoritesProvider } from "./state/FavoritesContext";
import { ProfileProvider, useProfile } from "./state/ProfileContext";

const TABS = [
  { to: "/setup", label: "내 정보" },
  { to: "/value", label: "시세" },
  { to: "/purpose", label: "목적 추천" },
  { to: "/budget", label: "대출·예산" },
  { to: "/explore", label: "조합 탐색" },
  { to: "/favorites", label: "찜·비교" },
];

function RequireProfile({ children }: { children: JSX.Element }) {
  const { profile } = useProfile();
  const location = useLocation();
  if (!profile) return <Navigate to="/setup" replace state={{ from: location }} />;
  return children;
}

function Shell() {
  const { profile } = useProfile();
  return (
    <div className="shell">
      <header className="app-header">
        <h1>이사갈집</h1>
        <p className="subtitle">내 집 시세로 찾는 다음 집</p>
      </header>
      <main>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route
            path="/value"
            element={
              <RequireProfile>
                <ValuePage />
              </RequireProfile>
            }
          />
          <Route
            path="/purpose"
            element={
              <RequireProfile>
                <PurposePage />
              </RequireProfile>
            }
          />
          <Route
            path="/budget"
            element={
              <RequireProfile>
                <BudgetPage />
              </RequireProfile>
            }
          />
          <Route
            path="/explore"
            element={
              <RequireProfile>
                <ExplorePage />
              </RequireProfile>
            }
          />
          <Route
            path="/favorites"
            element={
              <RequireProfile>
                <FavoritesPage />
              </RequireProfile>
            }
          />
          <Route
            path="/listing/:id"
            element={
              <RequireProfile>
                <ListingDetailPage />
              </RequireProfile>
            }
          />
          <Route path="*" element={<Navigate to={profile ? "/value" : "/setup"} replace />} />
        </Routes>
      </main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <FavoritesProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </FavoritesProvider>
    </ProfileProvider>
  );
}
