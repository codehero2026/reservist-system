// src/components/layout/AppLayout.tsx — Dark sidebar, light main, search topbar
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, GitMerge,
  ClipboardList, UserCog, BarChart3, Settings,
  LogOut, Shield, ChevronDown,
  Menu, X,
  User, Phone, Megaphone, Trash2, Activity, UserCheck, FileText,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { authApi } from "../../lib/api";
import { cn, canImport, canManageUsers } from "../../lib/utils";
import { ThemeToggle } from "../ui/ThemeToggle";
import { NotificationDropdown } from "../ui/NotificationDropdown";
import { Avatar } from "../ui/index";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../../lib/api";
import type { SystemSettings } from "../../types";

const ADMIN_NAV = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/personnel",     icon: Users,           label: "Personnel" },
  { to: "/import",        icon: Upload,          label: "Import",        guard: "import" },
  { to: "/dedup",         icon: GitMerge,        label: "Dedup" },
  { to: "/announcements", icon: Megaphone,       label: "Announcements" },
  { to: "/reports",       icon: BarChart3,       label: "Reports" },
  { to: "/audit",         icon: ClipboardList,   label: "Audit Log" },
  { to: "/trash",         icon: Trash2,          label: "Trash",         guard: "admin" },
  { to: "/users",         icon: UserCog,         label: "Users",         guard: "admin" },
  { to: "/settings",      icon: Settings,        label: "Settings",      guard: "admin" },
] as const;

const RESERVIST_NAV = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/my-profile",    icon: FileText,        label: "My Profile" },
  { to: "/announcements", icon: Megaphone,       label: "Announcements" },
] as const;

export function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch system settings for branding
  const { data: settingsRes } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await settingsApi.get()).data,
  });
  const settings: SystemSettings = settingsRes?.data ?? {};

  async function logout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate("/login");
  }

  const Sidebar = (
    <aside className="flex flex-col h-full bg-[rgb(var(--sidebar-bg))] w-[var(--sidebar-w)] shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-white/10 shrink-0 min-h-[var(--topbar-h)]">
        <div className="shrink-0">
          {settings.logo ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-md" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield size={18} className="text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {(role === "RESERVIST" ? RESERVIST_NAV : ADMIN_NAV).map(item => {
          const guard = (item as any).guard;
          if (guard === "import" && !canImport(role)) return null;
          if (guard === "admin"  && !canManageUsers(role)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/50 hover:bg-white/8 hover:text-white/80"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} className={isActive ? "text-white" : "text-white/50"} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Developers + Adviser Section */}
      {(settings.dev1_name || settings.dev2_name || settings.adviser_name) && (
        <div className="px-3 pb-4 pt-2 border-t border-white/10 shrink-0">
          <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">System Developers</p>
          <div className="space-y-3">
            {[
              { name: settings.dev1_name, photo: settings.dev1_photo, contact: settings.dev1_contact, accent: "blue" },
              { name: settings.dev2_name, photo: settings.dev2_photo, contact: settings.dev2_contact, accent: "purple" },
            ].map(({ name, photo, contact, accent }) =>
              name ? (
                <div key={name} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group">
                  {photo ? (
                    <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shadow-sm shrink-0" />
                  ) : (
                    <div className={`w-7 h-7 rounded-full bg-${accent}-500/20 flex items-center justify-center text-${accent}-400 shrink-0`}>
                      <User size={12} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/80 truncate leading-none mb-1">{name}</p>
                    {contact && (
                      <div className="flex items-center gap-1 text-white/40">
                        <Phone size={10} className={`shrink-0 group-hover:text-${accent}-400 transition-colors`} />
                        <p className="text-[10px] font-medium truncate">{contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            )}

            {settings.adviser_name && (
              <>
                <div className="px-3">
                  <div className="border-t border-white/10 pt-2.5">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Adviser</p>
                    <div className="flex items-center gap-2.5 rounded-lg hover:bg-white/5 transition-colors group py-1">
                      {settings.adviser_photo ? (
                        <img src={settings.adviser_photo} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shadow-sm shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <User size={12} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-white/80 truncate leading-none mb-1">{settings.adviser_name}</p>
                        {settings.adviser_contact && (
                          <div className="flex items-center gap-1 text-white/40">
                            <Phone size={10} className="shrink-0 group-hover:text-amber-400 transition-colors" />
                            <p className="text-[10px] font-medium truncate">{settings.adviser_contact}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen bg-[rgb(var(--page-bg))] overflow-hidden font-sans">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex flex-col" style={{ width: "var(--sidebar-w)" }}>
            {Sidebar}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[var(--topbar-h)] flex items-center gap-4 px-5 bg-[rgb(var(--card-bg))] border-b border-[rgb(var(--border))] shrink-0">
          {/* Mobile menu */}
          <button className="md:hidden text-ink2 hover:text-ink transition-colors"
            onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-ink truncate leading-tight">
              {settings.site_name || "H12RCDG"}
            </h2>
            <p className="text-ink3 text-2xs truncate font-medium">
              {settings.sub_name || "Reserve System"}
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Active badge — like the reference */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-100 dark:bg-green-950 dark:border-green-900">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
            </div>

            {/* Notifications */}
            <NotificationDropdown />

            <ThemeToggle />

            {/* User chip with dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 cursor-pointer group focus:outline-none"
              >
                <Avatar name={user?.fullName ?? ""} url={user?.avatarUrl} />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-ink leading-tight">Hi, {user?.fullName?.split(" ")[0]}</p>
                  <p className="text-3xs text-ink3 leading-tight">{user?.role?.replace(/_/g, " ")}</p>
                </div>
                <ChevronDown size={12} className={cn("text-ink3 transition-transform duration-200", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-[rgb(var(--border))] mb-1.5">
                      <p className="text-xs font-bold text-ink truncate">{user?.fullName}</p>
                      <p className="text-2xs text-ink3 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate("/profile"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink2 hover:text-ink hover:bg-[rgb(var(--page-bg))] transition-colors"
                    >
                      <UserCog size={13} />
                      Edit Profile
                    </button>
                    {role === "RESERVIST" && (
                      <button
                        onClick={() => { navigate("/my-profile"); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink2 hover:text-ink hover:bg-[rgb(var(--page-bg))] transition-colors"
                      >
                        <FileText size={13} />
                        My Reservist Profile
                      </button>
                    )}
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto bg-[rgb(var(--page-bg))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
