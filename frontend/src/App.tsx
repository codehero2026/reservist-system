// src/App.tsx
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { AppLayout } from "./components/layout/AppLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { LoadingPage, Toaster } from "./components/ui/index";
import { LoginPage } from "./pages/LoginPage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api";

// Public pages
const HomePage           = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const FeaturesPage       = lazy(() => import("./pages/FeaturesPage").then(m => ({ default: m.FeaturesPage })));
const AboutPage          = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const ContactPage        = lazy(() => import("./pages/ContactPage").then(m => ({ default: m.ContactPage })));
const SignUpPage         = lazy(() => import("./pages/SignUpPage").then(m => ({ default: m.SignUpPage })));

// Lazy-load all heavy pages — prevents one broken import crashing everything
const DashboardPage      = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const PersonnelListPage  = lazy(() => import("./pages/PersonnelListPage").then(m => ({ default: m.PersonnelListPage })));
const PersonnelDetailPage= lazy(() => import("./pages/PersonnelDetailPage").then(m => ({ default: m.PersonnelDetailPage })));
const PersonnelFormPage  = lazy(() => import("./pages/PersonnelFormPage").then(m => ({ default: m.PersonnelFormPage })));
const ImportPage         = lazy(() => import("./pages/ImportPage").then(m => ({ default: m.ImportPage })));
const DedupPage          = lazy(() => import("./pages/DedupPage").then(m => ({ default: m.DedupPage })));
const DedupDetailPage    = lazy(() => import("./pages/DedupDetailPage").then(m => ({ default: m.DedupDetailPage })));
const AuditLogPage       = lazy(() => import("./pages/AuditLogPage").then(m => ({ default: m.AuditLogPage })));
const UsersPage          = lazy(() => import("./pages/UsersPage").then(m => ({ default: m.UsersPage })));
const ReportsPage        = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage       = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ProfilePage        = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const AnnouncementsPage  = lazy(() => import("./pages/AnnouncementsPage").then(m => ({ default: m.AnnouncementsPage })));
const TrashPage          = lazy(() => import("./pages/TrashPage").then(m => ({ default: m.TrashPage })));
const ReservistProfilePage = lazy(() => import("./pages/ReservistProfilePage").then(m => ({ default: m.ReservistProfilePage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Page({ el: El }: { el: React.ComponentType }) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <El />
    </Suspense>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const background = location.state?.background;
  const isModalPath = location.pathname === "/login" || location.pathname === "/signup";

  // Wake up Render free-tier using public endpoint (no auth, no 401 risk)
  useEffect(() => {
    fetch(`${BASE_URL}/public/settings`).catch(() => {});
  }, []);

  // When on a modal path without background state (e.g. direct URL nav to /login),
  // fake "/" as background so the homepage renders behind the modal.
  const routerLocation = background ?? (isModalPath ? { ...location, pathname: "/" } : location);

  return (
    <>
      <Routes location={routerLocation}>
        {/* Public site — shared nav/footer layout */}
        <Route element={<PublicLayout />}>
          <Route index element={
            isAuthenticated
              ? <Navigate to="/dashboard" replace />
              : <Suspense fallback={<LoadingPage />}><HomePage /></Suspense>
          } />
          <Route path="features" element={<Suspense fallback={<LoadingPage />}><FeaturesPage /></Suspense>} />
          <Route path="about"    element={<Suspense fallback={<LoadingPage />}><AboutPage /></Suspense>} />
          <Route path="contact"  element={<Suspense fallback={<LoadingPage />}><ContactPage /></Suspense>} />
        </Route>

        {/* Protected — all inside AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"              element={<Page el={DashboardPage} />} />
          <Route path="personnel"              element={<Page el={PersonnelListPage} />} />
          <Route path="personnel/new"          element={<Page el={PersonnelFormPage} />} />
          <Route path="personnel/:id"          element={<Page el={PersonnelDetailPage} />} />
          <Route path="personnel/:id/edit"     element={<Page el={PersonnelFormPage} />} />
          <Route path="import"                 element={<Page el={ImportPage} />} />
          <Route path="dedup"                  element={<Page el={DedupPage} />} />
          <Route path="dedup/:id"              element={<Page el={DedupDetailPage} />} />
          <Route path="audit"                  element={<Page el={AuditLogPage} />} />
          <Route path="users"                  element={<Page el={UsersPage} />} />
          <Route path="reports"                element={<Page el={ReportsPage} />} />
          <Route path="announcements"          element={<Page el={AnnouncementsPage} />} />
          <Route path="trash"                  element={<Page el={TrashPage} />} />
          <Route path="settings"               element={<Page el={SettingsPage} />} />
          <Route path="profile"                element={<Page el={ProfilePage} />} />
          <Route path="my-profile"             element={<Page el={ReservistProfilePage} />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal overlays — render on top of whichever background page is active */}
      {(background || isModalPath) && (
        <Routes>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<Suspense fallback={null}><SignUpPage /></Suspense>} />
        </Routes>
      )}

      <Toaster />
    </>
  );
}
