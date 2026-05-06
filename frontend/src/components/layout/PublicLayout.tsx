import { useState, useEffect } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";

export interface PublicSettings {
  site_name?: string;
  sub_name?: string;
  logo?: string;
  hero_bg?: string;
  dev1_name?: string;
  dev1_photo?: string;
  dev1_contact?: string;
  dev2_name?: string;
  dev2_photo?: string;
  dev2_contact?: string;
  adviser_name?: string;
  adviser_photo?: string;
  adviser_contact?: string;
}

const NAV_LINKS = [
  { to: "/",         label: "Home"       },
  { to: "/features", label: "Features"   },
  { to: "/about",    label: "About"      },
  { to: "/contact",  label: "Contact Us" },
];

export function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [branding, setBranding] = useState<PublicSettings>({});

  useEffect(() => {
    axios.get(`${API}/public/settings`).then(r => setBranding(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--page-bg))]">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[rgb(var(--card-bg))]/80 backdrop-blur-xl border-b border-[rgb(var(--border))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Brand */}
            <Link to="/" className="flex items-center gap-3">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-ink leading-tight">H12RCDG</p>
                <p className="text-2xs text-ink3">Reservist System</p>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-ink2 hover:text-ink hover:bg-[rgb(var(--subtle))]"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Right controls */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => navigate("/login", { state: { background: location } })}
                className="text-xs font-semibold text-ink2 hover:text-ink transition-colors px-3 py-1.5"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup", { state: { background: location } })}
                className="h-8 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Sign Up
              </button>
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-2 text-ink2" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-4 py-3 space-y-0.5">
            {NAV_LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setMobileMenu(false)}
                className={({ isActive }) =>
                  `block text-sm py-2 px-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "text-ink2 hover:text-ink hover:bg-[rgb(var(--subtle))]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex gap-2 pt-2 border-t border-[rgb(var(--border))] mt-2">
              <button onClick={() => { navigate("/login", { state: { background: location } }); setMobileMenu(false); }} className="flex-1 h-9 rounded-xl border border-[rgb(var(--border))] text-xs font-bold text-ink2">Login</button>
              <button onClick={() => { navigate("/signup", { state: { background: location } }); setMobileMenu(false); }} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold">Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet context={{ branding } satisfies { branding: PublicSettings }} />
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-[rgb(var(--border))] py-8 bg-[rgb(var(--card-bg))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-6 h-6 rounded-lg object-cover" />
            ) : (
              <Shield size={14} className="text-blue-500" />
            )}
            <span className="text-xs font-bold text-ink2">H12RCDG</span>
          </div>
          <p className="text-2xs text-ink3">RESTRICTED SYSTEM &middot; AUTHORIZED PERSONNEL ONLY &middot; Philippine Army</p>
          <div className="flex gap-4">
            <Link to="/login"  state={{ background: location }} className="text-2xs text-ink3 hover:text-ink2">Admin Portal</Link>
            <Link to="/signup" state={{ background: location }} className="text-2xs text-ink3 hover:text-ink2">Register</Link>
            <Link to="/contact" className="text-2xs text-ink3 hover:text-ink2">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
