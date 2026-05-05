// src/App.tsx
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { AppLayout } from "./components/layout/AppLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { LoadingPage, Toaster } from "./components/ui/index";
import { LoginPage } from "./pages/LoginPage";

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

  return (
    <>
      <Routes>
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

        <Route path="/signup" element={<Suspense fallback={<LoadingPage />}><SignUpPage /></Suspense>} />
        <Route path="/login" element={<LoginPage />} />

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

      <Toaster />
    </>
  );
}
