// src/services/audit.ts
import { prisma } from "../lib/prisma";

type AuditActionType =
  | "CREATE" | "UPDATE" | "DELETE"
  | "IMPORT" | "EXPORT"
  | "DEDUP_MERGE" | "DEDUP_FLAG"
  | "LOGIN" | "LOGOUT"
  | "SETTINGS_UPDATE" | "BACKUP" | "RESTORE"
  | "BATCH_UPDATE" | "ANNOUNCEMENT" | "REGISTER";

interface AuditParams {
  userId: string;
  action: AuditActionType;
  tableName?: string;
  recordId?: string | number;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string;
  ipAddress?: string;
  dedupGroupId?: number;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:      params.userId,
        action:      params.action as never,
        tableName:   params.tableName ?? null,
        recordId:    params.recordId != null ? String(params.recordId) : null,
        oldValue:    params.oldValue  ? (params.oldValue  as object) : undefined,
        newValue:    params.newValue  ? (params.newValue  as object) : undefined,
        notes:       params.notes    ?? null,
        ipAddress:   params.ipAddress ?? null,
        dedupGroupId:params.dedupGroupId ?? null,
      },
    });
  } catch (e) {
    console.error("[AUDIT] Failed to write log:", e);
  }
}
