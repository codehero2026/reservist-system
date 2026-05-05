import { useOutletContext } from "react-router-dom";
import { Phone, Code2, Users, Shield } from "lucide-react";
import type { PublicSettings } from "../components/layout/PublicLayout";

interface TeamMember {
  name: string;
  role: string;
  photo?: string;
  contact?: string;
  accent: string;
  badge: string;
}

export function ContactPage() {
  const { branding } = useOutletContext<{ branding: PublicSettings }>();

  const teamRaw: (TeamMember | null)[] = [
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
  ];
  const team = teamRaw.filter((m): m is TeamMember => m !== null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
          <Code2 size={12} className="text-blue-500" />
          <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider">Development Team</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">Contact Us</h1>
        <p className="text-sm text-ink3 max-w-md mx-auto">
          Reach out to the development team for support, issues, or inquiries about the system.
        </p>
      </div>

      {/* Team cards */}
      {team.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-ink3" />
          </div>
          <p className="text-sm text-ink3">Developer information has not been configured yet.</p>
          <p className="text-xs text-ink3 mt-1">An administrator can add this in Settings → Developer Details.</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${
          team.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : team.length === 2
            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
            : "grid-cols-1 sm:grid-cols-3"
        }`}>
          {team.map(member => (
            <div
              key={member.name}
              className="bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl overflow-hidden hover:shadow-card-md transition-all duration-300 hover:-translate-y-0.5 group"
            >
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

      {/* Bottom note */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))]">
          <Shield size={13} className="text-ink3" />
          <span className="text-xs text-ink3">12th Regional Community Defense Group &middot; Philippine Army</span>
        </div>
      </div>
    </div>
  );
}
