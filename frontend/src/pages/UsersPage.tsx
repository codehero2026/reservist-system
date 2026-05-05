// src/pages/UsersPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserX, Users, Edit2, Shield, UserCheck, XCircle, Clock } from "lucide-react";
import { AvatarUpload, fileToBase64 } from "../components/ui/AvatarUpload";
import { usersApi, registrationApi } from "../lib/api";
import {
  Button, Badge, Card, Table, Th, Td, Tr, TableSkeleton, PageHeader,
  EmptyState, Input, Label, Select, ConfirmDialog, Modal, FormField, RoleBadge,
  Avatar,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { formatDateTime } from "../lib/utils";
import type { User } from "../types";

const EMPTY = { id: "", email:"", fullName:"", role:"VIEWER", company:"", password:"", avatarUrl: "" };

export function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deactivateId, setDeactivateId] = useState<string|null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const isEdit = !!form.id;

  const { data, isLoading } = useQuery<{ data: User[] }>({
    queryKey: ["users"],
    queryFn: async () => (await usersApi.list()).data,
  });

  const { data: pendingData } = useQuery({
    queryKey: ["pending-registrations"],
    queryFn: async () => (await registrationApi.pending()).data,
    refetchInterval: 30_000,
  });
  const pendingRegs = pendingData?.data ?? [];

  const approveMut = useMutation({
    mutationFn: (id: string) => registrationApi.approve(id),
    onSuccess: () => { toast("Registration approved", "success"); qc.invalidateQueries({ queryKey: ["pending-registrations"] }); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast(e?.response?.data?.error || "Failed to approve", "error"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => registrationApi.reject(id),
    onSuccess: () => { toast("Registration rejected", "success"); qc.invalidateQueries({ queryKey: ["pending-registrations"] }); },
    onError: (e: any) => toast(e?.response?.data?.error || "Failed to reject", "error"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => usersApi.create(payload),
    onSuccess: () => { toast("User created", "success"); qc.invalidateQueries({queryKey:["users"]}); setShowModal(false); setForm(EMPTY); setAvatarFile(null); },
    onError: (e: any) => toast(e?.response?.data?.error || "Failed to create user", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => usersApi.update(form.id, payload),
    onSuccess: () => { toast("User updated", "success"); qc.invalidateQueries({queryKey:["users"]}); setShowModal(false); setForm(EMPTY); setAvatarFile(null); },
    onError: (e: any) => toast(e?.response?.data?.error || "Failed to update user", "error"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { toast("User deactivated", "success"); qc.invalidateQueries({queryKey:["users"]}); setDeactivateId(null); },
  });

  const f = (k: string, v: string) => setForm(p => ({...p,[k]:v}));

  async function handleSave() {
    const payload: Record<string, any> = { ...form };
    if (!isEdit && !payload.password) return;
    if (isEdit && !payload.password) delete payload.password;

    if (avatarFile) {
      const { data: base64, mimeType } = await fileToBase64(avatarFile);
      payload.avatarUrl = `data:${mimeType};base64,${base64}`;
    }

    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  function openEdit(u: User) {
    setForm({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      company: u.company || "",
      password: "",
      avatarUrl: u.avatarUrl || "",
    });
    setAvatarFile(null);
    setShowModal(true);
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="User Management" subtitle="Manage system accounts and roles"
        actions={<Button size="sm" onClick={() => { setForm(EMPTY); setAvatarFile(null); setShowModal(true); }}><Plus size={13}/>Add User</Button>}/>

      <div className="p-5 flex-1 overflow-auto space-y-4">
        {/* Pending Registrations */}
        {pendingRegs.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pending Registrations ({pendingRegs.length})</span>
            </div>
            <Table>
              <thead><tr>
                <Th>Name</Th><Th>Email / Username</Th><Th>AFPSN</Th><Th>Rank</Th><Th>Registered</Th><Th className="w-24">Actions</Th>
              </tr></thead>
              <tbody>
                {pendingRegs.map((r: any) => (
                  <Tr key={r.id}>
                    <Td className="font-medium text-xs text-[rgb(var(--text-1))]">{r.fullName}</Td>
                    <Td>
                      <p className="text-xs text-[rgb(var(--text-2))] font-mono">{r.email}</p>
                      <p className="text-2xs text-[rgb(var(--text-3))]">@{r.username}</p>
                    </Td>
                    <Td className="text-xs font-mono">{r.reservist?.afpsn ?? "—"}</Td>
                    <Td className="text-xs">{r.reservist?.rankCode ?? "—"}</Td>
                    <Td className="text-xs text-[rgb(var(--text-3))]">{formatDateTime(r.createdAt)}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => approveMut.mutate(r.id)} title="Approve"
                          loading={approveMut.isPending}>
                          <UserCheck size={14} className="text-green-500" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => rejectMut.mutate(r.id)} title="Reject"
                          loading={rejectMut.isPending}>
                          <XCircle size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        <Card>
          {isLoading ? <TableSkeleton rows={5} cols={6}/> :
           !data?.data.length ? <EmptyState icon={<Users size={36}/>} title="No users found"/> : (
            <Table>
              <thead><tr>
                <Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Company</Th><Th>Last Login</Th><Th>Status</Th><Th className="w-16"/>
              </tr></thead>
              <tbody>
                {data.data.map(u => (
                  <Tr key={u.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} url={u.avatarUrl} className="w-8 h-8" />
                        <span className="font-medium text-xs text-[rgb(var(--text-1))]">{u.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-xs text-[rgb(var(--text-2))] font-mono">{u.email}</Td>
                    <Td><RoleBadge role={u.role}/></Td>
                    <Td className="text-xs">{u.company ?? "—"}</Td>
                    <Td className="text-xs text-[rgb(var(--text-3))]">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</Td>
                    <Td><Badge variant={u.isActive?"green" as any :"default"} dot>{u.isActive?"Active":"Inactive"}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(u)} title="Edit User">
                          <Edit2 size={13}/>
                        </Button>
                        {u.isActive && (
                          <Button size="icon-sm" variant="ghost" onClick={() => setDeactivateId(u.id)} title="Deactivate">
                            <UserX size={13}/>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(EMPTY); }}
        title={isEdit ? "Edit User Account" : "Add User Account"} 
        subtitle={isEdit ? "Update user roles and information" : "Create a new system account with role-based access"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); setForm(EMPTY); }}>Cancel</Button>
            <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}
              disabled={!form.email || !form.fullName || (!isEdit && !form.password)}>
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <AvatarUpload
              label="User Avatar"
              currentUrl={form.avatarUrl}
              onUpload={f => setAvatarFile(f)}
              hint="Profile picture for this user"
            />
          </div>
          <FormField label="Full Name" required className="col-span-2">
            <Input value={form.fullName} onChange={e=>f("fullName",e.target.value)} placeholder="e.g. Juan dela Cruz"/>
          </FormField>
          <FormField label="Email Address" required>
            <Input type="email" value={form.email} onChange={e=>f("email",e.target.value)} placeholder="user@h12rcdg.mil.ph" disabled={isEdit}/>
          </FormField>
          <FormField label={isEdit ? "New Password (Optional)" : "Password"} required={!isEdit}>
            <Input type="password" value={form.password} onChange={e=>f("password",e.target.value)} placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}/>
          </FormField>
          <FormField label="Role" required>
            <Select value={form.role} onChange={e=>f("role",e.target.value)}
              options={["ADMIN","S1_OFFICER","UNIT_CLERK","VIEWER"].map(r=>({value:r,label:r.replace("_"," ")}))}/>
          </FormField>
          {(form.role === "UNIT_CLERK" || form.role === "S1_OFFICER") && (
            <FormField label="Assigned Company" hint="Unit personnel are restricted by company">
              <Input value={form.company} onChange={e=>f("company",e.target.value)} placeholder="e.g. ALPHA"/>
            </FormField>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!deactivateId} title="Deactivate user account"
        description="This user will no longer be able to log in. You can reactivate them by editing the account later."
        onConfirm={() => deactivateMutation.mutate(deactivateId!)}
        onCancel={() => setDeactivateId(null)}
        loading={deactivateMutation.isPending} destructive confirmLabel="Deactivate"/>
    </div>
  );
}
