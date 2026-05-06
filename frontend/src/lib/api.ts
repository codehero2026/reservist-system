// src/lib/api.ts
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout on 401 from auth-specific endpoints
    // Don't redirect if the request was to /settings or other pages
    // (would cause jarring logout when token is slightly stale)
    if (error.response?.status === 401) {
      const url = error.config?.url ?? "";
      const isAuthCheck = url.includes("/auth/me") || url.includes("/auth/login");
      if (isAuthCheck) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

// ─── Personnel ────────────────────────────────────────
export const personnelApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get("/personnel", { params }),
  get: (id: number) => api.get(`/personnel/${id}`),
  create: (data: Record<string, unknown>) => api.post("/personnel", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/personnel/${id}`, data),
  delete: (id: number) => api.delete(`/personnel/${id}`),
  options: () => api.get("/personnel/meta/options"),
};

// ─── Import ───────────────────────────────────────────
export const importApi = {
  preview: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/import/preview", form, {
      headers: { "Content-Type": undefined },
    });
  },
  commit: (rows: unknown[], filename: string) =>
    api.post("/import/commit", { rows, filename }, { timeout: 120000 }),
  batches: (params?: Record<string, number>) =>
    api.get("/import/batches", { params }),
};

// ─── Dedup ────────────────────────────────────────────
export const dedupApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/dedup", { params }),
  stats: () => api.get("/dedup/stats"),
  get: (id: number) => api.get(`/dedup/${id}`),
  keep: (id: number, keepId: number, resolution?: string) =>
    api.post(`/dedup/${id}/keep`, { keepId, resolution }),
  merge: (id: number, primaryId: number, mergedData: unknown, resolution?: string) =>
    api.post(`/dedup/${id}/merge`, { primaryId, mergedData, resolution }),
  flag: (id: number, notes?: string) =>
    api.post(`/dedup/${id}/flag`, { notes }),
  resolveAll: () => api.post("/dedup/resolve-all"),
};

// ─── Dashboard ────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  activity: () => api.get("/dashboard/activity"),
};

// ─── Audit ────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/audit", { params }),
};

// ─── Users ────────────────────────────────────────────
export const usersApi = {
  list: () => api.get("/users"),
  create: (data: Record<string, unknown>) => api.post("/users", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

// ─── Reports ──────────────────────────────────────────
export const reportsApi = {
  roster: (params?: Record<string, string>) =>
    api.get("/reports/roster", { params }),
  summary: () => api.get("/reports/summary"),
  uniforms: (params?: Record<string, string>) =>
    api.get("/reports/uniforms", { params }),
};

// ─── Announcements ───────────────────────────────────────
export const announcementsApi = {
  list: (all?: boolean) => api.get("/announcements", { params: all ? { all: "true" } : {} }),
  create: (data: Record<string, unknown>) => api.post("/announcements", data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/announcements/${id}`, data),
  delete: (id: number) => api.delete(`/announcements/${id}`),
};

// ─── Trash ────────────────────────────────────────────────
export const trashApi = {
  list: (params?: Record<string, string | number>) => api.get("/trash", { params }),
  restore: (id: number) => api.post(`/trash/${id}/restore`),
  restoreAll: () => api.post("/trash/restore-all"),
};

// ─── Batch Operations ─────────────────────────────────────
export const batchApi = {
  updateStatus: (ids: number[], status: string, notes?: string) =>
    api.post("/batch/status", { ids, status, notes }),
};

// ─── System ───────────────────────────────────────────────
export const systemApi = {
  health: () => api.get("/system/health"),
  loginAnalytics: () => api.get("/system/login-analytics"),
  downloadTemplate: () => api.get("/system/import-template", { responseType: "blob" }),
};

// ─── Settings ──────────────────────────────────────────
export const settingsApi = {
  get:              ()                                  => api.get("/settings"),
  save:             (data: Record<string, string|null>) => api.put("/settings", data),
  uploadLogo:       (data: string, mimeType: string)    => api.post("/settings/logo", { data, mimeType }),
  uploadDevPhoto:   (data: string, mimeType: string)    => api.post("/settings/developer-photo", { data, mimeType }),
  uploadDev1Photo:  (data: string, mimeType: string)    => api.post("/settings/dev1-photo", { data, mimeType }),
  uploadDev2Photo:  (data: string, mimeType: string)    => api.post("/settings/dev2-photo", { data, mimeType }),
  uploadAdviserPhoto: (data: string, mimeType: string) => api.post("/settings/adviser-photo", { data, mimeType }),
  uploadHeroBg:       (data: string, mimeType: string) => api.post("/settings/hero-bg", { data, mimeType }),
  backup:           ()                                  => api.post("/settings/backup"),
  restore:          (backup: string)                    => api.post("/settings/restore", { backup, confirmed: true }),
  
  // Server-side backups
  listBackups:      ()                                  => api.get("/settings/backups"),
  createServerBackup: ()                                => api.post("/settings/backups"),
  downloadBackup:   (filename: string)                  => api.get(`/settings/backups/${filename}`),
  restoreFromServer: (filename: string)                  => api.post(`/settings/backups/${filename}/restore`),
  deleteBackup:     (filename: string)                  => api.delete(`/settings/backups/${filename}`),
  resetDatabase:    ()                                  => api.post("/settings/reset-database"),
};

// ─── Notifications ───────────────────────────────────
export const notificationsApi = {
  list: (limit?: number) => api.get("/notifications", { params: limit ? { limit } : {} }),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

// ─── Registration / Approval ─────────────────────────
export const registrationApi = {
  pending: () => api.get("/register/pending"),
  approve: (id: string) => api.post(`/register/${id}/approve`),
  reject: (id: string) => api.post(`/register/${id}/reject`),
};
