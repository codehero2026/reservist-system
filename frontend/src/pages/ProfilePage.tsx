// src/pages/ProfilePage.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, User, Key, Mail, Shield } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { usersApi } from "../lib/api";
import {
  Button, Card, PageHeader, SectionCard, FormField, Input,
  toast, Spinner, Label, Avatar,
} from "../components/ui/index";
import { AvatarUpload, fileToBase64 } from "../components/ui/AvatarUpload";

export function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.update(user!.id, data),
    onSuccess: (res) => {
      const updatedUser = res.data.data;
      // Update local store as well
      if (user && token) {
        setAuth({ ...user, ...updatedUser }, token);
      }
      toast("Profile updated successfully", "success");
      qc.invalidateQueries({ queryKey: ["users"] });
      setPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => {
      toast(e?.response?.data?.error || "Failed to update profile", "error");
    },
  });

  async function handleSave() {
    if (password && password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    const data: Record<string, any> = { fullName };
    if (password) data.password = password;

    if (avatarFile) {
      const { data: base64, mimeType } = await fileToBase64(avatarFile);
      data.avatarUrl = `data:${mimeType};base64,${base64}`;
    }

    updateMutation.mutate(data);
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information and security"
      />

      <div className="p-6 max-w-2xl mx-auto space-y-6 w-full">
        {/* Profile Info */}
        <SectionCard
          title="Personal Information"
          subtitle="Your display name and account email"
          action={
            <Button
              size="sm"
              onClick={handleSave}
              loading={updateMutation.isPending}
              disabled={!fullName}
            >
              <Save size={14} /> Save Changes
            </Button>
          }
        >
          <div className="space-y-4">
            <AvatarUpload
              label="Profile Image"
              currentUrl={user?.avatarUrl}
              onUpload={(f: File) => setAvatarFile(f)}
              hint="Max 2MB · Best as a square image"
            />

            <FormField label="Full Name" required>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                <Input
                  className="pl-9"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                />
              </div>
            </FormField>

            <FormField label="Email Address">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                <Input
                  className="pl-9"
                  value={email}
                  disabled
                  title="Email cannot be changed"
                />
              </div>
              <p className="text-3xs text-ink3 mt-1.5 px-1">Email is managed by administrators and cannot be changed.</p>
            </FormField>
          </div>
        </SectionCard>

        {/* Password Security */}
        <SectionCard
          title="Security"
          subtitle="Change your password to keep your account secure"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="New Password">
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                <Input
                  className="pl-9"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </FormField>

            <FormField label="Confirm New Password">
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                <Input
                  className="pl-9"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Must match password"
                />
              </div>
            </FormField>
          </div>
        </SectionCard>

        {/* Role Info */}
        <Card className="p-4 bg-[rgb(var(--subtle))] border-[rgb(var(--border))]">
          <div className="flex items-center gap-4">
            <Avatar name={user?.fullName || ""} url={user?.avatarUrl} className="w-10 h-10 text-sm" />
            <div>
              <p className="text-xs font-bold text-ink mb-0.5">Assigned Role</p>
              <p className="text-xs text-ink2">{user?.role?.replace(/_/g, " ")} {user?.company ? `(${user.company})` : ""}</p>
            </div>
            <div className="ml-auto text-3xs text-ink3 font-mono">
              ID: {user?.id}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
