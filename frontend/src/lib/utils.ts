import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, fmt = "dd MMM yyyy"): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt);
  } catch { return String(date); }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function fullName(r: { lastName: string; firstName: string; middleName?: string | null }): string {
  const mid = r.middleName ? ` ${r.middleName.charAt(0)}.` : "";
  return `${r.lastName}, ${r.firstName}${mid}`;
}

export function canEdit(role: string): boolean {
  return ["ADMIN","S1_OFFICER","UNIT_CLERK"].includes(role);
}
export function canDelete(role: string): boolean {
  return ["ADMIN","S1_OFFICER"].includes(role);
}
export function canImport(role: string): boolean {
  return ["ADMIN","S1_OFFICER"].includes(role);
}
export function canManageUsers(role: string): boolean {
  return role === "ADMIN";
}

// Legacy — kept for old pages that still import these
export const STATUS_COLORS: Record<string,string> = {
  READY:      "bg-green-50 text-green-700 border-green-200",
  STANDBY:    "bg-amber-50 text-amber-700 border-amber-200",
  RETIRED:    "bg-stone-50 text-stone-600 border-stone-200",
  DISCHARGED: "bg-red-50 text-red-700 border-red-200",
};
export const ROLE_COLORS: Record<string,string> = {
  ADMIN:      "bg-blue-50 text-blue-700 border-blue-200",
  S1_OFFICER: "bg-blue-50 text-blue-700 border-blue-200",
  UNIT_CLERK: "bg-stone-50 text-stone-600 border-stone-200",
  VIEWER:     "bg-stone-50 text-stone-500 border-stone-200",
};
export const DEDUP_COLORS: Record<string,string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  MERGED:   "bg-blue-50 text-blue-700 border-blue-200",
  FLAGGED:  "bg-red-50 text-red-700 border-red-200",
};
export const AUDIT_COLORS: Record<string,string> = {
  CREATE:       "text-green-600",
  UPDATE:       "text-blue-600",
  DELETE:       "text-red-600",
  IMPORT:       "text-purple-600",
  EXPORT:       "text-cyan-600",
  DEDUP_MERGE:  "text-orange-600",
  DEDUP_FLAG:   "text-amber-600",
  LOGIN:        "text-stone-400",
  LOGOUT:       "text-stone-400",
  BATCH_UPDATE: "text-indigo-600",
  ANNOUNCEMENT: "text-teal-600",
};
