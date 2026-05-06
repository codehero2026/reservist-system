// src/pages/SettingsPage.tsx — Website Settings · Backup/Restore · Developer Details
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings, Globe, Database, Code2, Upload,
  Save, Download, AlertTriangle, CheckCircle2,
  Eye, EyeOff, Shield, RefreshCw, User, Phone, X, Trash2,
  Activity, Server, HardDrive, Users, Clock, Lock,
} from "lucide-react";
import { settingsApi, systemApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import {
  Button, Input, Label, Modal, ConfirmDialog,
  PageHeader, SectionCard, FormField, Spinner, Divider,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { ProgressModal, useSimulatedProgress } from "../components/ui/ProgressModal";
import { cn } from "../lib/utils";
import type { SystemSettings, SystemHealth } from "../types";

// ─── Permission helpers ──────────────────────────────────────────────
function canEditWebsite(role: string)   { return role === "ADMIN"; }
function canBackup(role: string)        { return ["ADMIN", "S1_OFFICER"].includes(role); }
function canRestore(role: string)       { return role === "ADMIN"; }
function canEditDeveloper(role: string) { return role === "ADMIN"; }

// ─── Image upload helper ─────────────────────────────────────────────
async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const mimeType = header.replace("data:", "").replace(";base64", "");
      resolve({ data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Image Upload Preview Component ─────────────────────────────────
function ImageUpload({
  label, currentUrl, onUpload, maxSizeMb = 2, disabled,
  hint,
}: {
  label: string; currentUrl?: string | null; onUpload: (file: File) => void;
  maxSizeMb?: number; disabled?: boolean; hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Invalid type. Use JPG, PNG, WebP, or SVG.");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Too large. Maximum ${maxSizeMb}MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload(file);
  }

  const displayUrl = preview ?? currentUrl;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className="w-20 h-20 rounded-xl border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center bg-[rgb(var(--subtle))] overflow-hidden shrink-0 cursor-pointer hover:border-[rgb(var(--blue))] transition-colors"
          onClick={() => !disabled && inputRef.current?.click()}
          title="Click to upload"
        >
          {displayUrl ? (
            <img src={displayUrl} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <Upload size={20} className="text-[rgb(var(--ink-3))]" />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload size={12} /> Choose Image
          </Button>
          {hint && <p className="text-2xs text-[rgb(var(--ink-3))] mt-1.5">{hint}</p>}
          {error && <p className="text-2xs text-[rgb(var(--red))] mt-1">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
      />
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────
type Tab = "website" | "backup" | "developer" | "health" | "security";

// ─── SettingsPage ─────────────────────────────────────────────────────
export function SettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const role = user?.role ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("website");

  // ─── Fetch settings ──────────────────────────────────────────────
  const { data: settings, isLoading, isError } = useQuery<{ data: SystemSettings }>({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        return (await settingsApi.get()).data;
      } catch {
        // Return empty settings if table doesn't exist yet or API fails
        return { data: {} };
      }
    },
    retry: false,
  });
  const s: SystemSettings = settings?.data ?? {};

  const tabs: { id: Tab; label: string; icon: React.ElementType; visible: boolean }[] = [
    { id: "website",   label: "Website Settings",  icon: Globe,    visible: true },
    { id: "backup",    label: "Backup & Restore",  icon: Database, visible: canBackup(role) },
    { id: "health",    label: "System Health",      icon: Activity, visible: role === "ADMIN" },
    { id: "security",  label: "Security",           icon: Lock,     visible: role === "ADMIN" },
    { id: "developer", label: "Developer Details",  icon: Code2,    visible: true },
  ];

  return (
    <div className="in flex flex-col h-full">
      <PageHeader
        title="Settings"
        subtitle="System configuration and administration"
      />

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div className="bg-[rgb(var(--card))] border-b border-[rgb(var(--border))] px-5">
        <div className="flex items-center gap-0">
          {tabs.filter(t => t.visible).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-[rgb(var(--blue))] text-[rgb(var(--blue))]"
                  : "border-transparent text-[rgb(var(--ink-3))] hover:text-[rgb(var(--ink-2))]"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {activeTab === "website"   && <WebsiteTab    settings={s} role={role} onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />}
            {activeTab === "backup"    && <BackupTab     role={role} />}
            {activeTab === "health"    && <HealthTab />}
            {activeTab === "security"  && <SecurityTab   settings={s} role={role} onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />}
            {activeTab === "developer" && <DeveloperTab  settings={s} role={role} onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab A: Website Settings ──────────────────────────────────────────
function WebsiteTab({ settings, role, onSaved }: { settings: SystemSettings; role: string; onSaved: () => void }) {
  const canEdit = canEditWebsite(role);
  const [siteName,  setSiteName]  = useState(settings.site_name ?? "H12RCDG");
  const [subName,   setSubName]   = useState(settings.sub_name  ?? "Reserve System");
  const [logoFile,  setLogoFile]  = useState<File | null>(null);
  const [heroBgFile,setHeroBgFile]= useState<File | null>(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    setSiteName(settings.site_name ?? "H12RCDG");
    setSubName(settings.sub_name ?? "Reserve System");
  }, [settings.site_name, settings.sub_name]);

  async function save() {
    setSaving(true);
    try {
      await settingsApi.save({ site_name: siteName, sub_name: subName });

      if (logoFile) {
        const { data, mimeType } = await fileToBase64(logoFile);
        await settingsApi.uploadLogo(data, mimeType);
      }
      if (heroBgFile) {
        const { data, mimeType } = await fileToBase64(heroBgFile);
        await settingsApi.uploadHeroBg(data, mimeType);
      }

      toast("Website settings saved", "success");
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err?.response?.data?.error ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  const heroBgPreview = heroBgFile
    ? URL.createObjectURL(heroBgFile)
    : (settings.hero_bg ?? null);

  return (
    <SectionCard
      title="Website Settings"
      subtitle="Customize the system name and branding"
      action={
        canEdit && (
          <Button size="sm" onClick={save} loading={saving}>
            <Save size={12} /> Save Changes
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {!canEdit && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgb(var(--amber-bg))] border border-[rgb(var(--amber)/0.2)] text-[rgb(var(--amber))] text-xs">
            <Shield size={13} /> You have view-only access to website settings.
          </div>
        )}

        <FormField label="Website / System Name" required>
          <Input
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
            placeholder="H12RCDG"
            disabled={!canEdit}
          />
        </FormField>

        <FormField label="Sub Name / Description">
          <Input
            value={subName}
            onChange={e => setSubName(e.target.value)}
            placeholder="Reserve System"
            disabled={!canEdit}
          />
        </FormField>

        <ImageUpload
          label="System Logo"
          currentUrl={settings.logo}
          onUpload={f => setLogoFile(f)}
          maxSizeMb={2}
          disabled={!canEdit}
          hint="JPG, PNG, WebP or SVG · Maximum 2MB"
        />

        {/* ── Hero Background ─────────────────────────────────── */}
        <Divider label="HERO SECTION" />

        <ImageUpload
          label="Hero Background Image"
          currentUrl={settings.hero_bg}
          onUpload={f => setHeroBgFile(f)}
          maxSizeMb={5}
          disabled={!canEdit}
          hint="JPG, PNG or WebP · Maximum 5MB · Recommended 1920×1080 or wider"
        />

        {/* Hero preview */}
        <div className="rounded-xl overflow-hidden border border-[rgb(var(--border))]">
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-wide px-4 pt-3 pb-2 bg-[rgb(var(--subtle))]">
            Hero Preview
          </p>
          <div
            className="relative h-36 flex items-center justify-center bg-[rgb(var(--subtle))] bg-cover bg-center"
            style={heroBgPreview ? { backgroundImage: `url(${heroBgPreview})` } : {}}
          >
            {heroBgPreview && <div className="absolute inset-0 bg-black/50" />}
            <div className="relative z-10 text-center px-4">
              <p className={`text-sm font-extrabold mb-0.5 ${heroBgPreview ? "text-white drop-shadow" : "text-[rgb(var(--ink))]"}`}>
                {siteName || "System Name"}
              </p>
              <p className={`text-xs ${heroBgPreview ? "text-white/75" : "text-[rgb(var(--ink-3))]"}`}>
                {subName || "Sub name"}
              </p>
              {!heroBgPreview && (
                <p className="text-2xs text-[rgb(var(--ink-4))] mt-2 italic">No background image set</p>
              )}
            </div>
          </div>
        </div>

        {/* Logo preview row */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))] p-4">
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-wide mb-3">Logo Preview</p>
          <div className="flex items-center gap-3">
            {settings.logo || logoFile ? (
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : (settings.logo ?? "")}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-contain bg-white border border-[rgb(var(--border))] p-1"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--blue))] flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-[rgb(var(--ink))]">{siteName || "System Name"}</p>
              <p className="text-2xs text-[rgb(var(--ink-3))]">{subName || "Sub name"}</p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Tab B: Backup & Restore (ENHANCED) ─────────────────────────────
interface ServerBackup {
  filename: string;
  size: number;
  createdAt: string;
}

function BackupTab({ role }: { role: string }) {
  const qc = useQueryClient();
  const canBkp = canBackup(role);
  const canRstr = canRestore(role);
  const [creating, setCreating] = useState(false);
  const [loading, setActionLoading] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetProg = useSimulatedProgress(4000); // 4s to 85%

  // Fetch backups from server
  const { data: backups, isLoading, refetch } = useQuery<{ data: ServerBackup[] }>({
    queryKey: ["backups"],
    queryFn: async () => (await settingsApi.listBackups()).data,
  });

  async function createServerBackup() {
    setCreating(true);
    try {
      await settingsApi.createServerBackup();
      toast("Server backup created successfully", "success");
      refetch();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to create server backup";
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(filename: string) {
    setActionLoading(filename + "_download");
    try {
      const res = await settingsApi.downloadBackup(filename);
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("Download failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function restoreBackup(filename: string) {
    setActionLoading(filename + "_restore");
    try {
      await settingsApi.restoreFromServer(filename);
      toast("System settings restored successfully", "success");
      setRestoreConfirm(null);
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch {
      toast("Restore failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function resetDatabase() {
    setResetting(true);
    setResetConfirm(false);
    resetProg.start();
    try {
      await settingsApi.resetDatabase();
      resetProg.finish();
      toast("Database reset successfully. All records deleted, users and settings retained.", "success");
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
      qc.invalidateQueries({ queryKey: ["dashboard-announcements"] });
      qc.invalidateQueries({ queryKey: ["dedup"] });
      qc.invalidateQueries({ queryKey: ["dedup-stats"] });
      qc.invalidateQueries({ queryKey: ["personnel"] });
    } catch {
      resetProg.error();
      toast("Reset failed", "error");
    } finally {
      setResetting(false);
    }
  }

  async function deleteBackup(filename: string) {
    setActionLoading(filename + "_delete");
    try {
      await settingsApi.deleteBackup(filename);
      toast("Backup deleted permanently", "success");
      setDeleteConfirm(null);
      refetch();
    } catch {
      toast("Delete failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Action Section ─────────────────────────────────── */}
      <SectionCard
        title="Backup Management"
        subtitle="Manage secure system snapshots and repository data"
        action={
          canBkp && (
            <Button size="sm" onClick={createServerBackup} loading={creating}>
              <RefreshCw size={12} className={creating ? "animate-spin" : ""} /> Create New Backup
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgb(var(--subtle))] border border-[rgb(var(--border))]">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Database size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[rgb(var(--ink))]">Automated Data Protection</p>
              <p className="text-2xs text-[rgb(var(--ink-3))]">All personnel records and configuration settings are included in snapshots.</p>
            </div>
          </div>

          {!canBkp && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgb(var(--amber-bg))] border border-[rgb(var(--amber)/0.2)] text-[rgb(var(--amber))] text-xs font-medium">
              <Shield size={13} /> You have limited backup access.
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Backup List ───────────────────────────────────── */}
      <SectionCard title="Backup Repository" subtitle="Stored snapshots on server">
        {isLoading ? (
          <div className="py-8"><Spinner className="mx-auto" /></div>
        ) : !backups?.data?.length ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[rgb(var(--subtle))] flex items-center justify-center mx-auto mb-3">
              <Database size={20} className="text-[rgb(var(--ink-4))]" />
            </div>
            <p className="text-xs text-[rgb(var(--ink-3))] font-medium">No backups found in the repository.</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-[rgb(var(--border))] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[rgb(var(--subtle))] text-[rgb(var(--ink-3))] font-bold uppercase tracking-widest border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Date Created</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {backups.data.map((b) => (
                  <tr key={b.filename} className="hover:bg-[rgb(var(--subtle))/0.5] transition-colors group">
                    <td className="px-4 py-3 font-medium text-[rgb(var(--ink))] truncate max-w-[180px]" title={b.filename}>
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--ink-2))]">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--ink-3))] font-mono">
                      {formatSize(b.size)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="xs" title="Download" onClick={() => downloadBackup(b.filename)} loading={loading === b.filename + "_download"}>
                        <Download size={12} />
                      </Button>
                      {canRstr && (
                        <Button variant="ghost" size="xs" title="Restore" onClick={() => setRestoreConfirm(b.filename)} loading={loading === b.filename + "_restore"}>
                          <RefreshCw size={12} />
                        </Button>
                      )}
                      {canRstr && (
                        <Button variant="ghost" size="xs" title="Delete" className="hover:text-[rgb(var(--red))] hover:bg-[rgb(var(--red)/0.1)]" onClick={() => setDeleteConfirm(b.filename)} loading={loading === b.filename + "_delete"}>
                          <X size={12} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Danger Zone: Reset Database ────────────────────── */}
      {canRstr && (
        <SectionCard title="Danger Zone" subtitle="Irreversible operations — use with caution">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[rgb(var(--red)/0.3)] bg-[rgb(var(--red)/0.05)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[rgb(var(--red))]">Reset Database</p>
              <p className="text-2xs text-[rgb(var(--ink-3))] mt-0.5">Permanently deletes all personnel records, import batches, dedup groups, audit logs, and notifications. Users and system settings are kept.</p>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0 text-[rgb(var(--red))] border border-[rgb(var(--red)/0.4)] hover:bg-[rgb(var(--red)/0.1)]" onClick={() => setResetConfirm(true)}>
              <Trash2 size={13} /> Reset Database
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Confirm Reset */}
      <ConfirmDialog
        open={resetConfirm}
        title="Reset Entire Database?"
        description="This will permanently delete ALL personnel records, import batches, dedup groups, audit logs, and notifications. Users and system settings will be kept. This action cannot be undone."
        confirmLabel="Yes, Reset Database"
        onConfirm={resetDatabase}
        onCancel={() => setResetConfirm(false)}
        loading={resetting}
        destructive
      />

      {/* Confirm Restore */}
      <ConfirmDialog
        open={!!restoreConfirm}
        title="Confirm System Restore"
        description={`Are you sure you want to restore the system state from "${restoreConfirm}"? All current settings will be overwritten with data from this snapshot.`}
        confirmLabel="Yes, Restore Now"
        onConfirm={() => restoreConfirm && restoreBackup(restoreConfirm)}
        onCancel={() => setRestoreConfirm(null)}
        loading={loading === restoreConfirm + "_restore"}
        destructive
      />

       {/* Confirm Delete */}
       <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove Backup Snapshot"
        description={`Permanently delete "${deleteConfirm}" from the server? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        onConfirm={() => deleteConfirm && deleteBackup(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        loading={loading === deleteConfirm + "_delete"}
        destructive
      />

      <ProgressModal
        open={resetProg.status === "running" || resetProg.status === "complete" || resetProg.status === "error"}
        progress={resetProg.progress}
        status={resetProg.status === "running" ? "running" : resetProg.status === "complete" ? "complete" : "error"}
        label="Resetting Database…"
        sublabel="Deleting all records, keeping users & settings"
        onDone={resetProg.reset}
      />
    </div>
  );
}

// ─── Tab C: Developer Details ─────────────────────────────────────────
function DeveloperTab({ settings, role, onSaved }: { settings: SystemSettings; role: string; onSaved: () => void }) {
  const canEdit = canEditDeveloper(role);
  const [saving, setSaving] = useState(false);

  // Dev 1 State
  const [d1Name, setD1Name] = useState(settings.dev1_name ?? "");
  const [d1Contact, setD1Contact] = useState(settings.dev1_contact ?? "");
  const [d1Photo, setD1Photo] = useState<File | null>(null);

  // Dev 2 State
  const [d2Name, setD2Name] = useState(settings.dev2_name ?? "");
  const [d2Contact, setD2Contact] = useState(settings.dev2_contact ?? "");
  const [d2Photo, setD2Photo] = useState<File | null>(null);

  // Adviser State
  const [advName, setAdvName] = useState(settings.adviser_name ?? "");
  const [advContact, setAdvContact] = useState(settings.adviser_contact ?? "");
  const [advPhoto, setAdvPhoto] = useState<File | null>(null);

  // Sync state with props
  useEffect(() => {
    setD1Name(settings.dev1_name ?? "");
    setD1Contact(settings.dev1_contact ?? "");
    setD2Name(settings.dev2_name ?? "");
    setD2Contact(settings.dev2_contact ?? "");
    setAdvName(settings.adviser_name ?? "");
    setAdvContact(settings.adviser_contact ?? "");
  }, [settings.dev1_name, settings.dev1_contact, settings.dev2_name, settings.dev2_contact, settings.adviser_name, settings.adviser_contact]);

  async function save() {
    setSaving(true);
    try {
      // Save text details
      await settingsApi.save({
        dev1_name: d1Name, dev1_contact: d1Contact,
        dev2_name: d2Name, dev2_contact: d2Contact,
        adviser_name: advName, adviser_contact: advContact,
      });

      // Handle photos
      if (d1Photo) {
        const { data, mimeType } = await fileToBase64(d1Photo);
        await settingsApi.uploadDev1Photo(data, mimeType);
      }
      if (d2Photo) {
        const { data, mimeType } = await fileToBase64(d2Photo);
        await settingsApi.uploadDev2Photo(data, mimeType);
      }
      if (advPhoto) {
        const { data, mimeType } = await fileToBase64(advPhoto);
        await settingsApi.uploadAdviserPhoto(data, mimeType);
      }

      toast("Developer details saved", "success");
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast(err?.response?.data?.error ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="System Developers"
      subtitle="Manage the development team information"
      action={
        canEdit && (
          <Button size="sm" onClick={save} loading={saving}>
            <Save size={12} /> Save Developer Info
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {!canEdit && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgb(var(--amber-bg))] border border-[rgb(var(--amber)/0.2)] text-[rgb(var(--amber))] text-xs">
            <Shield size={13} /> Developer details are managed by administrators only.
          </div>
        )}

        {/* Developer 1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[rgb(var(--blue))]">
            <Code2 size={16} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Lead Developer / Dev 1</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <ImageUpload
              label="Dev 1 Photo"
              currentUrl={settings.dev1_photo}
              onUpload={f => setD1Photo(f)}
              maxSizeMb={1}
              disabled={!canEdit}
              hint="Square image recommended"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name">
                <Input value={d1Name} onChange={e => setD1Name(e.target.value)} placeholder="Juan Dela Cruz" disabled={!canEdit} />
              </FormField>
              <FormField label="Contact Number">
                <Input value={d1Contact} onChange={e => setD1Contact(e.target.value)} placeholder="+63 9xx xxx xxxx" disabled={!canEdit} />
              </FormField>
            </div>
          </div>
        </div>

        <Divider label="AND" />

        {/* Developer 2 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[rgb(var(--purple))]">
            <Code2 size={16} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Assistant Developer / Dev 2</h4>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <ImageUpload
              label="Dev 2 Photo"
              currentUrl={settings.dev2_photo}
              onUpload={f => setD2Photo(f)}
              maxSizeMb={1}
              disabled={!canEdit}
              hint="Square image recommended"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name">
                <Input value={d2Name} onChange={e => setD2Name(e.target.value)} placeholder="Maria Clara" disabled={!canEdit} />
              </FormField>
              <FormField label="Contact Number">
                <Input value={d2Contact} onChange={e => setD2Contact(e.target.value)} placeholder="+63 9xx xxx xxxx" disabled={!canEdit} />
              </FormField>
            </div>
          </div>
        </div>

        <Divider label="ADVISER" />

        {/* Adviser */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Shield size={16} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Project Adviser</h4>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <ImageUpload
              label="Adviser Photo"
              currentUrl={settings.adviser_photo}
              onUpload={f => setAdvPhoto(f)}
              maxSizeMb={1}
              disabled={!canEdit}
              hint="Square image recommended"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name">
                <Input value={advName} onChange={e => setAdvName(e.target.value)} placeholder="Adviser Name" disabled={!canEdit} />
              </FormField>
              <FormField label="Contact Number">
                <Input value={advContact} onChange={e => setAdvContact(e.target.value)} placeholder="+63 9xx xxx xxxx" disabled={!canEdit} />
              </FormField>
            </div>
          </div>
        </div>

        {/* Live Sidebar Preview */}
        <div className="mt-8 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--sidebar-bg))] p-4 shadow-xl">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Sidebar Preview</p>
          <div className="space-y-3 max-w-[200px]">
            {[
              { photo: d1Photo, savedPhoto: settings.dev1_photo, name: d1Name, contact: d1Contact, label: "Developer 1", accent: "blue" },
              { photo: d2Photo, savedPhoto: settings.dev2_photo, name: d2Name, contact: d2Contact, label: "Developer 2", accent: "purple" },
              { photo: advPhoto, savedPhoto: settings.adviser_photo, name: advName, contact: advContact, label: "Adviser", accent: "amber" },
            ].map(({ photo, savedPhoto, name, contact, label, accent }) => (
              (name || savedPhoto) ? (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full bg-${accent}-500/20 border border-${accent}-500/30 flex items-center justify-center overflow-hidden`}>
                    {photo ? <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" /> : savedPhoto ? <img src={savedPhoto} alt="" className="w-full h-full object-cover" /> : <User size={14} className={`text-${accent}-400`} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white/80 truncate leading-none mb-1">{name || label}</p>
                    <div className="flex items-center gap-1 text-white/40">
                      <Phone size={10} />
                      <p className="text-[10px] truncate">{contact || "No contact"}</p>
                    </div>
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Tab D: System Health ────────────────────────────────────────────
function HealthTab() {
  const { data: healthData, isLoading, refetch, isRefetching } = useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: async () => (await systemApi.health()).data,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["login-analytics"],
    queryFn: async () => (await systemApi.loginAnalytics()).data,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!healthData) return null;

  const h = healthData;
  const formatBytes = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  };
  const formatUptime = (secs: number) => {
    const d = Math.floor(secs / 86400);
    const hrs = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="System Health"
        subtitle="Database metrics, server status, and storage"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isRefetching}>
            <RefreshCw size={12} /> Refresh
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Records", value: h.database.activeReservists.toLocaleString(), icon: <Users size={14} />, color: "text-blue-500 bg-blue-500/10" },
            { label: "Deleted (Trash)", value: h.database.deletedReservists.toLocaleString(), icon: <HardDrive size={14} />, color: "text-amber-500 bg-amber-500/10" },
            { label: "Total Records", value: h.database.totalReservists.toLocaleString(), icon: <Database size={14} />, color: "text-purple-500 bg-purple-500/10" },
            { label: "Active Users", value: `${h.database.activeUsers} / ${h.database.totalUsers}`, icon: <Users size={14} />, color: "text-green-500 bg-green-500/10" },
            { label: "Import Batches", value: h.database.totalImports.toLocaleString(), icon: <Upload size={14} />, color: "text-cyan-500 bg-cyan-500/10" },
            { label: "Audit Logs", value: h.database.totalAuditLogs.toLocaleString(), icon: <Activity size={14} />, color: "text-stone-500 bg-stone-500/10" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-ink tabular-nums leading-tight">{item.value}</p>
                <p className="text-2xs text-ink3 font-medium">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Server Information" subtitle="Runtime and memory usage">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between text-xs"><span className="text-ink3">Uptime</span><span className="font-semibold text-ink">{formatUptime(h.server.uptime)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-ink3">Platform</span><span className="font-semibold text-ink">{h.server.platform}</span></div>
            <div className="flex justify-between text-xs"><span className="text-ink3">Node Version</span><span className="font-semibold text-ink font-mono">{h.server.nodeVersion}</span></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs"><span className="text-ink3">Heap Used</span><span className="font-semibold text-ink font-mono">{formatBytes(h.server.memoryUsage.heapUsed)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-ink3">Heap Total</span><span className="font-semibold text-ink font-mono">{formatBytes(h.server.memoryUsage.heapTotal)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-ink3">RSS</span><span className="font-semibold text-ink font-mono">{formatBytes(h.server.memoryUsage.rss)}</span></div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-2xs text-ink3 mb-1"><span>Heap Usage</span><span>{Math.round((h.server.memoryUsage.heapUsed / h.server.memoryUsage.heapTotal) * 100)}%</span></div>
          <div className="h-2 bg-[rgb(var(--subtle))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(h.server.memoryUsage.heapUsed / h.server.memoryUsage.heapTotal) * 100}%` }} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Backup Status" subtitle="Server-side backup summary">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
            <p className="text-xl font-bold text-ink tabular-nums">{h.backups.count}</p>
            <p className="text-2xs text-ink3">Total Backups</p>
          </div>
          <div className="text-center p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
            <p className="text-xl font-bold text-ink tabular-nums">{formatBytes(h.backups.totalSize)}</p>
            <p className="text-2xs text-ink3">Storage Used</p>
          </div>
          <div className="text-center p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
            <p className="text-sm font-bold text-ink">{h.backups.lastBackupDate ? new Date(h.backups.lastBackupDate).toLocaleDateString() : "Never"}</p>
            <p className="text-2xs text-ink3">Last Backup</p>
          </div>
        </div>
      </SectionCard>

      {analyticsData && (
        <SectionCard title="Login Analytics" subtitle="Last 30 days user activity">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/10 text-green-500"><Server size={14} /></div>
              <div>
                <p className="text-lg font-bold text-ink tabular-nums leading-tight">{analyticsData.activeSessions}</p>
                <p className="text-2xs text-ink3 font-medium">Active Sessions</p>
              </div>
            </div>
            {analyticsData.userLogins?.length > 0 && (
              <div>
                <p className="text-2xs font-bold text-ink3 uppercase tracking-widest mb-2">Login Frequency by User</p>
                <div className="space-y-2">
                  {analyticsData.userLogins.map((u: { userId: string; fullName: string; count: number }) => (
                    <div key={u.userId} className="flex items-center gap-3">
                      <span className="text-xs text-ink2 flex-1 truncate">{u.fullName}</span>
                      <div className="w-32 h-2 bg-[rgb(var(--subtle))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((u.count / Math.max(...analyticsData.userLogins.map((x: { count: number }) => x.count))) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-ink tabular-nums w-8 text-right">{u.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Last Activity" subtitle="Most recent system events">
        <div className="space-y-3">
          {[
            { label: "Last Import", value: h.lastActivity.lastImport ? `${h.lastActivity.lastImport.filename} — ${new Date(h.lastActivity.lastImport.date).toLocaleString()}` : "No imports yet", icon: <Upload size={13} /> },
            { label: "Last Login", value: h.lastActivity.lastLogin ? new Date(h.lastActivity.lastLogin.date).toLocaleString() : "No logins recorded", icon: <Users size={13} /> },
            { label: "Last Audit Entry", value: h.lastActivity.lastAudit ? `${h.lastActivity.lastAudit.action} — ${new Date(h.lastActivity.lastAudit.date).toLocaleString()}` : "No audit entries", icon: <Clock size={13} /> },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 text-xs">
              <div className="text-ink3">{item.icon}</div>
              <span className="font-semibold text-ink2 w-24 shrink-0">{item.label}</span>
              <span className="text-ink3 truncate">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab E: Security / Password Policy ───────────────────────────────
function SecurityTab({ settings, role, onSaved }: { settings: SystemSettings; role: string; onSaved: () => void }) {
  const [minLength, setMinLength] = useState(settings.password_min_length ?? "8");
  const [requireUppercase, setRequireUppercase] = useState(settings.password_require_uppercase ?? "true");
  const [requireNumbers, setRequireNumbers] = useState(settings.password_require_numbers ?? "true");
  const [requireSpecial, setRequireSpecial] = useState(settings.password_require_special ?? "true");
  const [sessionTimeout, setSessionTimeout] = useState(settings.session_timeout_days ?? "7");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(settings.max_login_attempts ?? "5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMinLength(settings.password_min_length ?? "8");
    setRequireUppercase(settings.password_require_uppercase ?? "true");
    setRequireNumbers(settings.password_require_numbers ?? "true");
    setRequireSpecial(settings.password_require_special ?? "true");
    setSessionTimeout(settings.session_timeout_days ?? "7");
    setMaxLoginAttempts(settings.max_login_attempts ?? "5");
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      await settingsApi.save({
        password_min_length: minLength,
        password_require_uppercase: requireUppercase,
        password_require_numbers: requireNumbers,
        password_require_special: requireSpecial,
        session_timeout_days: sessionTimeout,
        max_login_attempts: maxLoginAttempts,
      });
      toast("Security settings saved", "success");
      onSaved();
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Password Policy"
        subtitle="Configure password requirements for user accounts"
        action={
          <Button size="sm" onClick={save} loading={saving}>
            <Save size={12} /> Save Security Settings
          </Button>
        }
      >
        <div className="space-y-4">
          <FormField label="Minimum Password Length">
            <Input type="number" min="6" max="32" value={minLength} onChange={e => setMinLength(e.target.value)} />
          </FormField>
          <div className="space-y-3">
            <p className="text-2xs font-bold text-ink3 uppercase tracking-widest">Requirements</p>
            {[
              { label: "Require uppercase letter (A-Z)", value: requireUppercase, set: setRequireUppercase },
              { label: "Require number (0-9)", value: requireNumbers, set: setRequireNumbers },
              { label: "Require special character (!@#$...)", value: requireSpecial, set: setRequireSpecial },
            ].map(item => (
              <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={item.value === "true"} onChange={e => item.set(e.target.checked ? "true" : "false")}
                  className="w-4 h-4 rounded border-[rgb(var(--border))] text-blue-500 focus:ring-blue-400" />
                <span className="text-xs text-ink2">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Session Settings" subtitle="Configure session timeout and login attempt limits">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Session Timeout (days)" hint="How long before a session expires">
            <Input type="number" min="1" max="30" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />
          </FormField>
          <FormField label="Max Login Attempts" hint="Lock account after N failed attempts (0 = disabled)">
            <Input type="number" min="0" max="20" value={maxLoginAttempts} onChange={e => setMaxLoginAttempts(e.target.value)} />
          </FormField>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
        <Shield size={16} className="text-ink3 shrink-0" />
        <p className="text-2xs text-ink3 leading-relaxed">
          Security settings apply to new password changes and new login sessions. Existing sessions will continue until they expire naturally.
        </p>
      </div>
    </div>
  );
}
