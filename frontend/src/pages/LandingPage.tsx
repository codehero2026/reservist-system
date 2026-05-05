import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Users, FileCheck, BarChart3, Lock, ChevronRight, Menu, X, Phone, Code2 } from "lucide-react";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const FEATURES = [
  { icon: <Users size={24} />, title: "Personnel Registry", desc: "Complete digital records for all reservists with detailed military and personal profiles." },
  { icon: <FileCheck size={24} />, title: "Smart Import & Dedup", desc: "Bulk import from Excel with automatic duplicate detection and intelligent merging." },
  { icon: <BarChart3 size={24} />, title: "Analytics Dashboard", desc: "Real-time KPIs, charts, and audit trails for informed command decisions." },
  { icon: <Lock size={24} />, title: "Role-Based Security", desc: "Granular access control with full audit logging for every action taken." },
];

interface PublicSettings {
  site_name?: string;
  sub_name?: string;
  logo?: string;
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
  { href: "#home",    label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#about",   label: "About" },
  { href: "#contact", label: "Contact Us" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [branding, setBranding] = useState<PublicSettings>({});

  useEffect(() => {
    axios.get(`${API}/public/settings`).then(r => setBranding(r.data)).catch(() => {});
  }, []);

  const siteName = branding.site_name || "H12RCDG Reservist Management System";
  const subName  = branding.sub_name  || "12th Regional Community Defense Group";

  const team = [
    branding.dev1_name ? {
      name: branding.dev1_name,
      role: "Lead Developer",
      photo: branding.dev1_photo,
      contact: branding.dev1_contact,
      accent: "from-blue-500 to-blue-600",
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    } : null,
    branding.dev2_name ? {
      name: branding.dev2_name,
      role: "Assistant Developer",
      photo: branding.dev2_photo,
      contact: branding.dev2_contact,
      accent: "from-purple-500 to-purple-600",
      badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    } : null,
    branding.adviser_name ? {
      name: branding.adviser_name,
      role: "Project Adviser",
      photo: branding.adviser_photo,
      contact: branding.adviser_contact,
      accent: "from-amber-500 to-orange-500",
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    } : null,
  ].filter(Boolean) as NonNullable<typeof team[0]>[];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[rgb(var(--card-bg))]/80 backdrop-blur-xl border-b border-[rgb(var(--border))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
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
            </div>

            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="text-xs font-semibold text-ink2 hover:text-ink transition-colors">
                  {l.label}
                </a>
              ))}
              <ThemeToggle />
              <button onClick={() => navigate("/login")} className="text-xs font-semibold text-ink2 hover:text-ink transition-colors">Login</button>
              <button onClick={() => navigate("/signup")} className="h-8 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold hover:opacity-90 transition-opacity">
                Sign Up
              </button>
            </div>

            <button className="md:hidden p-2 text-ink2" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-4 py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="block text-sm text-ink2 py-2" onClick={() => setMobileMenu(false)}>
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => navigate("/login")} className="flex-1 h-9 rounded-xl border border-[rgb(var(--border))] text-xs font-bold text-ink2">Login</button>
              <button onClick={() => navigate("/signup")} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold">Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/8 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Shield size={12} className="text-blue-500" />
            <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider">Philippine Army Reserve Command</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink leading-tight mb-4 tracking-tight">
            {siteName}
          </h1>
          <p className="text-base sm:text-lg text-ink3 max-w-2xl mx-auto mb-4">{subName}</p>
          <p className="text-sm text-ink3 max-w-xl mx-auto mb-8">
            A secure, modern platform for managing reservist personnel records, deployments, and readiness — built for the Philippine Army.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate("/signup")} className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              Register as Reservist <ChevronRight size={14} />
            </button>
            <button onClick={() => navigate("/login")} className="h-11 px-6 rounded-xl border border-[rgb(var(--border))] text-sm font-bold text-ink2 hover:bg-[rgb(var(--subtle))] transition-colors">
              Admin Login
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-[rgb(var(--subtle))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">System Capabilities</h2>
            <p className="text-sm text-ink3 max-w-lg mx-auto">Everything you need to manage reserve force readiness in one secure platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-[rgb(var(--card-bg))] rounded-2xl p-6 border border-[rgb(var(--border))] hover:shadow-card-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 flex items-center justify-center text-blue-500 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-ink mb-2">{f.title}</h3>
                <p className="text-xs text-ink3 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────────── */}
      <section id="about" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-4">About the System</h2>
          <p className="text-sm text-ink3 leading-relaxed max-w-2xl mx-auto mb-8">
            The H12RCDG Reservist Management System is a web-based profiling tool designed for the Ready Reserve Infantry Battalion
            under the 12th Regional Community Defense Group, Philippine Army. It streamlines personnel management, readiness tracking,
            and administrative operations for reserve force units.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-extrabold text-blue-500">4,400+</p>
              <p className="text-xs text-ink3 mt-1">Personnel Records</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-green-500">99.9%</p>
              <p className="text-xs text-ink3 mt-1">System Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-500">24/7</p>
              <p className="text-xs text-ink3 mt-1">Secure Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Us ───────────────────────────────────────────── */}
      <section id="contact" className="py-20 bg-[rgb(var(--subtle))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <Code2 size={12} className="text-blue-500" />
              <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider">Development Team</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">Contact Us</h2>
            <p className="text-sm text-ink3 max-w-md mx-auto">
              Reach out to the development team for support, issues, or inquiries about the system.
            </p>
          </div>

          {team.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-ink3" />
              </div>
              <p className="text-sm text-ink3">Developer information has not been configured yet.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${team.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : team.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 sm:grid-cols-3"}`}>
              {team.map((member) => (
                <div key={member.name} className="bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl overflow-hidden hover:shadow-card-md transition-all duration-300 hover:-translate-y-0.5 group">
                  {/* Gradient top bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${member.accent}`} />

                  <div className="p-6 flex flex-col items-center text-center">
                    {/* Avatar */}
                    <div className="relative mb-4">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-20 h-20 rounded-full object-cover border-2 border-[rgb(var(--border))] shadow-md group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.accent} flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-105 transition-transform duration-300`}>
                          {member.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[rgb(var(--card-bg))]" />
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-bold text-ink mb-1">{member.name}</h3>

                    {/* Role badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold border ${member.badge} mb-4`}>
                      <Code2 size={9} />
                      {member.role}
                    </span>

                    {/* Contact */}
                    {member.contact ? (
                      <a
                        href={`tel:${member.contact}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] text-xs font-semibold text-ink2 hover:text-ink hover:border-blue-400/50 transition-colors w-full justify-center"
                      >
                        <Phone size={12} className="text-ink3" />
                        {member.contact}
                      </a>
                    ) : (
                      <span className="text-2xs text-ink3 italic">No contact provided</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
            <Link to="/login" className="text-2xs text-ink3 hover:text-ink2">Admin Portal</Link>
            <Link to="/signup" className="text-2xs text-ink3 hover:text-ink2">Register</Link>
            <a href="#contact" className="text-2xs text-ink3 hover:text-ink2">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
