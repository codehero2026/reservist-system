import { Users, FileCheck, BarChart3, Lock, Shield, GitMerge, Bell, UserCog } from "lucide-react";

const FEATURES = [
  {
    icon: <Users size={22} />,
    title: "Personnel Registry",
    desc: "Complete digital records for all reservists with detailed military and personal profiles. Search, filter, and export with ease.",
    color: "from-blue-500/15 to-blue-600/15",
    text: "text-blue-500",
  },
  {
    icon: <FileCheck size={22} />,
    title: "Smart Import & Dedup",
    desc: "Bulk import from Excel with automatic duplicate detection, intelligent merging, and row-level validation feedback.",
    color: "from-purple-500/15 to-purple-600/15",
    text: "text-purple-500",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Analytics Dashboard",
    desc: "Real-time KPIs, readiness gauges, enrollment trends, and rank/company breakdowns for informed command decisions.",
    color: "from-green-500/15 to-emerald-600/15",
    text: "text-green-500",
  },
  {
    icon: <Lock size={22} />,
    title: "Role-Based Security",
    desc: "Granular access control — Admin, S1 Officer, Unit Clerk, Viewer, and Reservist roles — with full audit logging.",
    color: "from-red-500/15 to-rose-600/15",
    text: "text-red-500",
  },
  {
    icon: <Shield size={22} />,
    title: "Audit Trail",
    desc: "Every action is logged — who did what, when. Full audit history for compliance and accountability.",
    color: "from-amber-500/15 to-orange-600/15",
    text: "text-amber-500",
  },
  {
    icon: <GitMerge size={22} />,
    title: "Deduplication Engine",
    desc: "Automatically flags potential duplicate records for review and allows merge or flagging with resolution notes.",
    color: "from-cyan-500/15 to-teal-600/15",
    text: "text-cyan-500",
  },
  {
    icon: <Bell size={22} />,
    title: "Notifications",
    desc: "Real-time in-app notifications for key events — imports, personnel changes, dedup activity, and announcements.",
    color: "from-indigo-500/15 to-blue-600/15",
    text: "text-indigo-500",
  },
  {
    icon: <UserCog size={22} />,
    title: "User Management",
    desc: "Invite, activate, deactivate, and manage system users. Assign roles and monitor login activity.",
    color: "from-pink-500/15 to-rose-600/15",
    text: "text-pink-500",
  },
];

export function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
          <Shield size={12} className="text-blue-500" />
          <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider">System Capabilities</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">Platform Features</h1>
        <p className="text-sm text-ink3 max-w-lg mx-auto">
          Everything you need to manage reserve force readiness in one secure, modern platform.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="bg-[rgb(var(--card-bg))] rounded-2xl p-6 border border-[rgb(var(--border))] hover:shadow-card-md transition-all duration-200 hover:-translate-y-0.5 group"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center ${f.text} mb-4 group-hover:scale-110 transition-transform duration-200`}>
              {f.icon}
            </div>
            <h3 className="text-sm font-bold text-ink mb-2">{f.title}</h3>
            <p className="text-xs text-ink3 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
