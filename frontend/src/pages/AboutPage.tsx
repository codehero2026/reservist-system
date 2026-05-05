import { Shield, Target, CheckCircle2 } from "lucide-react";

const STATS = [
  { value: "4,400+", label: "Personnel Records",  color: "text-blue-500"   },
  { value: "99.9%",  label: "System Uptime",      color: "text-green-500"  },
  { value: "24/7",   label: "Secure Access",       color: "text-purple-500" },
  { value: "5",      label: "User Roles",          color: "text-amber-500"  },
];

const VALUES = [
  "Accurate and up-to-date reservist profiles",
  "Fast bulk data import with validation",
  "Transparent audit trail for all actions",
  "Secure, role-based access control",
  "Real-time readiness and analytics reporting",
  "Streamlined deduplication and data integrity",
];

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
          <Shield size={12} className="text-blue-500" />
          <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider">About the System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">H12RCDG Reservist Management System</h1>
        <p className="text-sm text-ink3 max-w-2xl mx-auto leading-relaxed">
          A web-based profiling tool designed for the Ready Reserve Infantry Battalion under the
          12th Regional Community Defense Group, Philippine Army — streamlining personnel management,
          readiness tracking, and administrative operations.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-14">
        {STATS.map(s => (
          <div key={s.label} className="bg-[rgb(var(--card-bg))] rounded-2xl p-6 border border-[rgb(var(--border))] text-center">
            <p className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</p>
            <p className="text-xs text-ink3">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Mission */}
        <div className="bg-[rgb(var(--card-bg))] rounded-2xl p-7 border border-[rgb(var(--border))]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Target size={16} className="text-blue-500" />
            </div>
            <h2 className="text-sm font-bold text-ink">Mission</h2>
          </div>
          <p className="text-xs text-ink3 leading-relaxed mb-4">
            To provide the 12th RCDG with a reliable, secure digital platform for managing the full lifecycle
            of reservist records — from enlistment to separation — enabling commanders to make data-driven
            readiness decisions at any time.
          </p>
          <p className="text-xs text-ink3 leading-relaxed">
            The system is designed to eliminate paper-based inefficiencies, reduce duplicate records,
            and give authorized personnel instant access to accurate, up-to-date information.
          </p>
        </div>

        {/* Core commitments */}
        <div className="bg-[rgb(var(--card-bg))] rounded-2xl p-7 border border-[rgb(var(--border))]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <h2 className="text-sm font-bold text-ink">Core Commitments</h2>
          </div>
          <ul className="space-y-2.5">
            {VALUES.map(v => (
              <li key={v} className="flex items-start gap-2.5">
                <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                <span className="text-xs text-ink3">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Unit info banner */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-500/8 to-purple-500/8 border border-blue-500/15 p-7 text-center">
        <Shield size={28} className="text-blue-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-ink mb-1">12th Regional Community Defense Group</p>
        <p className="text-xs text-ink3">Ready Reserve Infantry Battalion &middot; Philippine Army</p>
        <p className="text-xs text-ink3 mt-2 italic">
          "Service, Sacrifice, Success"
        </p>
      </div>
    </div>
  );
}
