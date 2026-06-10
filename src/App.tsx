import {
  HashRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
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

function AppLayout() {
  return (
    <div className="shell">
      <header className="app-header">
        <Link to="/" className="logo">
          <span className="logo-dot" />
          이사갈집
        </Link>
        <p className="subtitle">내 집 시세로 찾는 다음 집</p>
      </header>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function AppRoutes() {
  const { profile } = useProfile();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
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
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <FavoritesProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </FavoritesProvider>
    </ProfileProvider>
  );
}
