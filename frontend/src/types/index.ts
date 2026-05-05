export type UserRole = "ADMIN" | "S1_OFFICER" | "UNIT_CLERK" | "VIEWER" | "RESERVIST";
export type ReservistStatus = "READY" | "STANDBY" | "RETIRED" | "DISCHARGED";
export type Sex = "M" | "F";
export type MaritalStatus = "SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT" | "DEDUP_MERGE" | "DEDUP_FLAG" | "LOGIN" | "LOGOUT" | "BATCH_UPDATE" | "ANNOUNCEMENT";
export type DedupStatus = "PENDING" | "RESOLVED" | "MERGED" | "FLAGGED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  company?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface Reservist {
  id: number;
  afpsn: string;
  rankCode: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  sex: Sex;
  dateBirth?: string | null;
  placeBirth?: string | null;
  bloodType?: string | null;
  religionCode?: string | null;
  maritalStatus?: MaritalStatus | null;
  tin?: string | null;
  homeAddress?: string | null;
  townProvinceCode?: string | null;
  telephoneNo?: string | null;
  mobileTelNo?: string | null;
  brSvcCode?: string | null;
  svcAfos?: string | null;
  sourceCommissionCode?: string | null;
  dateCommission?: string | null;
  commissionAuthority?: string | null;
  initialRank?: string | null;
  dateLastPromotion?: string | null;
  promotionAuthority?: string | null;
  reservistStatus: ReservistStatus;
  mobilizationCode?: string | null;
  designationCode?: string | null;
  squadTeamSection?: string | null;
  platoon?: string | null;
  company?: string | null;
  bnCode?: string | null;
  presentOccupationCode?: string | null;
  officeAddress?: string | null;
  officeTelNo?: string | null;
  sizeBoots?: string | null;
  sizeCaps?: string | null;
  sizeBda?: string | null;
  isDuplicate: boolean;
  isDeleted: boolean;
  sourceSheet?: string | null;
  dateOfRecord?: string | null;
  recordBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ImportPreviewRow {
  rowIndex: number;
  data: Partial<Reservist>;
  errors: string[];
  isDuplicateInDb: boolean;
  isDuplicateInFile: boolean;
  status: "ok" | "warning" | "error";
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  summary: { total: number; ok: number; warnings: number; errors: number };
  sheetName: string;
}

export interface DedupGroup {
  id: number;
  afpsn: string;
  status: DedupStatus;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  members: Partial<Reservist>[];
  _count?: { members: number };
}

export interface AuditLog {
  id: number;
  action: AuditAction;
  tableName?: string | null;
  recordId?: string | null;
  notes?: string | null;
  createdAt: string;
  user: { fullName: string; role: UserRole };
}

// ─── Settings ─────────────────────────────────────────
export interface SystemSettings {
  site_name?: string;
  sub_name?: string;
  sidebar_name?: string;
  sidebar_sub_name?: string;
  logo?: string;
  hero_bg?: string;
  dev1_name?: string;
  dev1_photo?: string;
  dev1_contact?: string;
  dev2_name?: string;
  dev2_photo?: string;
  dev2_contact?: string;
  adviser_name?: string;
  adviser_contact?: string;
  adviser_photo?: string;
  password_min_length?: string;
  password_require_uppercase?: string;
  password_require_numbers?: string;
  password_require_special?: string;
  session_timeout_days?: string;
  max_login_attempts?: string;
  [key: string]: string | undefined;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  isPinned: boolean;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { fullName: string; role: UserRole };
}

export interface SystemHealth {
  database: {
    totalReservists: number;
    activeReservists: number;
    deletedReservists: number;
    totalUsers: number;
    activeUsers: number;
    totalImports: number;
    totalAuditLogs: number;
    totalDedup: number;
    pendingDedup: number;
  };
  lastActivity: {
    lastImport: { date: string; filename: string } | null;
    lastAudit: { date: string; action: string } | null;
    lastLogin: { date: string } | null;
  };
  backups: {
    count: number;
    lastBackupDate: string | null;
    totalSize: number;
  };
  server: {
    uptime: number;
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
    nodeVersion: string;
    platform: string;
  };
}

export interface DashboardStats {
  kpi: {
    total: number;
    ready: number;
    standby: number;
    retired: number;
    discharged: number;
    duplicates: number;
    pendingDedup: number;
    recentlyAdded: number;
    male: number;
    female: number;
  };
  byCompany: { company: string; count: number }[];
  byRank:    { rank: string; count: number }[];
  recentImports: {
    id: number;
    filename: string;
    successRows: number;
    createdAt: string;
    uploadedBy: { fullName: string };
  }[];
  enrollmentTrend: { date: string; count: number }[];
}
