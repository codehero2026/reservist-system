import { useNavigate, Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { Shield, ChevronRight } from "lucide-react";
import type { PublicSettings } from "../components/layout/PublicLayout";

export function HomePage() {
  const navigate = useNavigate();
  const { branding } = useOutletContext<{ branding: PublicSettings }>();

  const siteName = branding.site_name || "H12RCDG Reservist Management System";
  const subName  = branding.sub_name  || "12th Regional Community Defense Group";
  const heroBg   = branding.hero_bg;

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
      {/* Hero background image or gradient blobs */}
      {heroBg ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          {/* Dark overlay for text legibility */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/8 blur-3xl" />
        </div>
      )}

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 ${heroBg ? "bg-white/15 border-white/30" : "bg-blue-500/10 border-blue-500/20"}`}>
          <Shield size={12} className={heroBg ? "text-white" : "text-blue-500"} />
          <span className={`text-2xs font-bold uppercase tracking-wider ${heroBg ? "text-white" : "text-blue-500"}`}>Philippine Army Reserve Command</span>
        </div>

        <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 tracking-tight ${heroBg ? "text-white drop-shadow-lg" : "text-ink"}`}>
          {siteName}
        </h1>
        <p className={`text-base sm:text-lg max-w-2xl mx-auto mb-4 ${heroBg ? "text-white/80" : "text-ink3"}`}>{subName}</p>
        <p className={`text-sm max-w-xl mx-auto mb-10 ${heroBg ? "text-white/70" : "text-ink3"}`}>
          A secure, modern platform for managing reservist personnel records, deployments, and readiness — built for the Philippine Army.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/signup")}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
          >
            Register as Reservist <ChevronRight size={14} />
          </button>
          <button
            onClick={() => navigate("/login")}
            className={`h-11 px-6 rounded-xl border text-sm font-bold transition-colors ${heroBg ? "border-white/40 text-white hover:bg-white/15" : "border-[rgb(var(--border))] text-ink2 hover:bg-[rgb(var(--subtle))]"}`}
          >
            Admin Login
          </button>
        </div>

        {/* Quick nav pills */}
        <div className="flex items-center justify-center gap-3 mt-12 flex-wrap">
          {[
            { to: "/features", label: "System Features" },
            { to: "/about",    label: "About the System" },
            { to: "/contact",  label: "Contact Developers" },
          ].map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-2xs font-semibold transition-colors ${heroBg ? "border-white/30 text-white/70 hover:text-white hover:border-white/60" : "border-[rgb(var(--border))] text-ink3 hover:text-ink hover:border-blue-400/50"}`}
            >
              {l.label} <ChevronRight size={10} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
