// src/pages/AnnouncementsPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, Plus, Pin, AlertTriangle, Info, Bell,
  Pencil, Trash2, Eye, EyeOff, Clock,
} from "lucide-react";
import { announcementsApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import {
  Button, PageHeader, SectionCard, Modal, ConfirmDialog,
  Input, Textarea, Label, Select, FormField, Badge,
  EmptyState, Spinner,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { cn, formatDateTime } from "../lib/utils";
import type { Announcement } from "../types";

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ElementType; badge: "default" | "blue" | "green" | "amber" | "red" }> = {
  low:    { color: "text-stone-400", icon: Info,            badge: "default" },
  normal: { color: "text-blue-500",  icon: Bell,            badge: "blue"    },
  high:   { color: "text-amber-500", icon: AlertTriangle,   badge: "amber"   },
  urgent: { color: "text-red-500",   icon: AlertTriangle,   badge: "red"     },
};

export function AnnouncementsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const role = user?.role ?? "";
  const canManage = ["ADMIN", "S1_OFFICER"].includes(role);

  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements", showAll],
    queryFn: async () => (await announcementsApi.list(showAll)).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => announcementsApi.delete(id),
    onSuccess: () => {
      toast("Announcement deleted", "success");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteTarget(null);
    },
    onError: () => toast("Delete failed", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      announcementsApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast("Announcement updated", "success");
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: number; isPinned: boolean }) =>
      announcementsApi.update(id, { isPinned }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const announcements: Announcement[] = data?.data ?? [];

  return (
    <div className="flex flex-col h-full in">
      <PageHeader
        title="Announcements"
        subtitle={`${announcements.length} bulletin${announcements.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? <Eye size={12} /> : <EyeOff size={12} />}
                {showAll ? "Active Only" : "Show All"}
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={() => { setEditRecord(null); setModalOpen(true); }}>
                <Plus size={12} /> New Announcement
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={18} />}
            title="No announcements"
            description="There are no active announcements at the moment."
            action={canManage ? <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={12} /> Create One</Button> : undefined}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {announcements.map((a) => {
              const cfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
              const PriorityIcon = cfg.icon;
              const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
              return (
                <div
                  key={a.id}
                  className={cn(
                    "bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-card overflow-hidden slide-in",
                    a.isPinned && "ring-2 ring-blue-400/30",
                    !a.isActive && "opacity-60",
                  )}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 shrink-0", cfg.color)}>
                        <PriorityIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-ink">{a.title}</h3>
                          {a.isPinned && <Badge variant="blue"><Pin size={10} /> Pinned</Badge>}
                          <Badge variant={cfg.badge}>{a.priority}</Badge>
                          {!a.isActive && <Badge variant="default">Inactive</Badge>}
                          {isExpired && <Badge variant="red">Expired</Badge>}
                        </div>
                        <p className="text-xs text-ink2 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                        <div className="flex items-center gap-4 mt-3 text-2xs text-ink3">
                          <span>By {a.createdBy.fullName}</span>
                          <span>{formatDateTime(a.createdAt)}</span>
                          {a.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> Expires {formatDateTime(a.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon-sm" title={a.isPinned ? "Unpin" : "Pin"}
                            onClick={() => pinMutation.mutate({ id: a.id, isPinned: !a.isPinned })}>
                            <Pin size={13} className={a.isPinned ? "text-blue-500" : ""} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" title={a.isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleMutation.mutate({ id: a.id, isActive: !a.isActive })}>
                            {a.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                          </Button>
                          <Button variant="ghost" size="icon-sm"
                            onClick={() => { setEditRecord(a); setModalOpen(true); }}>
                            <Pencil size={13} />
                          </Button>
                          {role === "ADMIN" && (
                            <Button variant="ghost" size="icon-sm" className="hover:text-[rgb(var(--red))]"
                              onClick={() => setDeleteTarget(a)}>
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnnouncementModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        editRecord={editRecord}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Announcement"
        description={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        destructive
        confirmLabel="Delete"
      />
    </div>
  );
}

function AnnouncementModal({
  open, onClose, editRecord,
}: {
  open: boolean; onClose: () => void; editRecord: Announcement | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!editRecord;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editRecord) {
      setTitle(editRecord.title);
      setContent(editRecord.content);
      setPriority(editRecord.priority);
      setIsPinned(editRecord.isPinned);
      setExpiresAt(editRecord.expiresAt?.slice(0, 16) ?? "");
    } else {
      setTitle(""); setContent(""); setPriority("normal");
      setIsPinned(false); setExpiresAt("");
    }
  }, [editRecord, open]);

  async function save() {
    if (!title.trim() || !content.trim()) {
      toast("Title and content are required", "error");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        priority,
        isPinned,
        expiresAt: expiresAt || null,
      };
      if (isEdit) {
        await announcementsApi.update(editRecord!.id, data);
      } else {
        await announcementsApi.create(data);
      }
      toast(isEdit ? "Announcement updated" : "Announcement posted", "success");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onClose();
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Announcement" : "New Announcement"}
      subtitle="Post a bulletin visible to all system users"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>
            {isEdit ? "Save Changes" : "Post Announcement"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assembly schedule update..." />
        </FormField>
        <FormField label="Content" required>
          <Textarea rows={5} value={content} onChange={e => setContent(e.target.value)} placeholder="Write your announcement here..." />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)}
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
          </FormField>
          <FormField label="Expires At (optional)">
            <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-[rgb(var(--border))] text-blue-500 focus:ring-blue-400" />
          <span className="text-xs font-medium text-ink2">Pin to top of bulletin board</span>
        </label>
      </div>
    </Modal>
  );
}
