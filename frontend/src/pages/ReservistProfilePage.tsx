import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, User, Shield, Phone, MapPin, Briefcase } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { api } from "../lib/api";
import {
  Button, PageHeader, SectionCard, FormField, Input, toast, Card, Avatar,
} from "../components/ui/index";

const EDITABLE_FIELDS = [
  { key: "middleName", label: "Middle Name", section: "personal" },
  { key: "sex", label: "Sex", section: "personal", type: "select", options: ["Male", "Female"] },
  { key: "dateBirth", label: "Date of Birth", section: "personal", type: "date" },
  { key: "placeBirth", label: "Place of Birth", section: "personal" },
  { key: "bloodType", label: "Blood Type", section: "personal", type: "select", options: ["A", "B", "O", "AB"] },
  { key: "religionCode", label: "Religion", section: "personal" },
  { key: "maritalStatus", label: "Marital Status", section: "personal", type: "select", options: ["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"] },
  { key: "tin", label: "TIN", section: "personal" },
  { key: "homeAddress", label: "Home Address", section: "contact" },
  { key: "townProvinceCode", label: "Town/Province", section: "contact" },
  { key: "telephoneNo", label: "Telephone No.", section: "contact" },
  { key: "mobileTelNo", label: "Mobile No.", section: "contact" },
  { key: "presentOccupationCode", label: "Present Occupation", section: "occupation" },
  { key: "officeAddress", label: "Office Address", section: "occupation" },
  { key: "officeTelNo", label: "Office Tel No.", section: "occupation" },
  { key: "sizeBoots", label: "Boot Size", section: "sizing" },
  { key: "sizeCaps", label: "Cap Size", section: "sizing" },
  { key: "sizeBda", label: "BDA Size", section: "sizing" },
] as const;

export function ReservistProfilePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: reservist, isLoading } = useQuery({
    queryKey: ["my-reservist-profile"],
    queryFn: async () => (await api.get("/register/my-profile")).data,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (reservist?.data) {
      const init: Record<string, string> = {};
      for (const f of EDITABLE_FIELDS) {
        const val = (reservist.data as any)[f.key];
        init[f.key] = val != null ? String(val) : "";
      }
      setForm(init);
      setDirty(false);
    }
  }, [reservist]);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  }

  const saveMut = useMutation({
    mutationFn: (data: Record<string, string | null>) => api.put("/register/my-profile", data),
    onSuccess: () => { toast("Profile updated", "success"); qc.invalidateQueries({ queryKey: ["my-reservist-profile"] }); setDirty(false); },
    onError: (e: any) => toast(e?.response?.data?.error || "Failed to save", "error"),
  });

  function handleSave() {
    const data: Record<string, string | null> = {};
    for (const f of EDITABLE_FIELDS) {
      data[f.key] = form[f.key]?.trim() || null;
    }
    saveMut.mutate(data);
  }

  if (isLoading) return <div className="p-8 text-center text-ink3 text-sm">Loading profile...</div>;
  if (!reservist?.data) return <div className="p-8 text-center text-ink3 text-sm">No linked reservist record found.</div>;

  const r = reservist.data;

  function renderField(f: typeof EDITABLE_FIELDS[number]) {
    if (f.type === "select") {
      return (
        <FormField label={f.label} key={f.key}>
          <select value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)}
            className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-blue-400/30">
            <option value="">Select...</option>
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      );
    }
    if (f.type === "date") {
      return (
        <FormField label={f.label} key={f.key}>
          <Input type="date" value={form[f.key]?.slice(0, 10) || ""} onChange={e => set(f.key, e.target.value)} />
        </FormField>
      );
    }
    return (
      <FormField label={f.label} key={f.key}>
        <Input value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder={f.label} />
      </FormField>
    );
  }

  const personal = EDITABLE_FIELDS.filter(f => f.section === "personal");
  const contact = EDITABLE_FIELDS.filter(f => f.section === "contact");
  const occupation = EDITABLE_FIELDS.filter(f => f.section === "occupation");
  const sizing = EDITABLE_FIELDS.filter(f => f.section === "sizing");

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Reservist Profile"
        subtitle="View and update your personal information"
        actions={
          <Button size="sm" onClick={handleSave} loading={saveMut.isPending} disabled={!dirty}>
            <Save size={14} /> Save Changes
          </Button>
        }
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6 w-full overflow-auto">
        {/* Read-only identity */}
        <Card className="p-5 bg-[rgb(var(--subtle))] border-[rgb(var(--border))]">
          <div className="flex items-center gap-4">
            <Avatar name={user?.fullName || ""} url={user?.avatarUrl} className="w-12 h-12" />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{r.rankCode} {r.lastName}, {r.firstName} {r.middleName || ""}</p>
              <p className="text-xs text-ink3 font-mono">{r.afpsn}</p>
            </div>
            <div className="text-right">
              <p className="text-2xs text-ink3">Status</p>
              <p className="text-xs font-bold text-green-500">{r.reservistStatus}</p>
            </div>
          </div>
          <p className="text-2xs text-ink3 mt-3">AFPSN, Rank, Last Name, First Name, and Status are managed by administrators and cannot be self-edited.</p>
        </Card>

        <SectionCard title="Personal Information" subtitle="Your basic personal details" action={<User size={13} className="text-ink3" />}>
          <div className="grid grid-cols-2 gap-3">
            {personal.map(f => renderField(f))}
          </div>
        </SectionCard>

        <SectionCard title="Contact Information" subtitle="How to reach you" action={<Phone size={13} className="text-ink3" />}>
          <div className="grid grid-cols-2 gap-3">
            {contact.map(f => renderField(f))}
          </div>
        </SectionCard>

        <SectionCard title="Occupation" subtitle="Current employment details" action={<Briefcase size={13} className="text-ink3" />}>
          <div className="grid grid-cols-2 gap-3">
            {occupation.map(f => renderField(f))}
          </div>
        </SectionCard>

        <SectionCard title="Uniform Sizing" subtitle="For equipment and uniform issuance" action={<Shield size={13} className="text-ink3" />}>
          <div className="grid grid-cols-3 gap-3">
            {sizing.map(f => renderField(f))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
