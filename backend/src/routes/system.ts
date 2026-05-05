// src/routes/system.ts — System health, template download, password policy
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

export const systemRoutes = new Hono();
systemRoutes.use("*", requireAuth);

const ADMIN_ONLY = ["ADMIN"];
const ADMIN_S1 = ["ADMIN", "S1_OFFICER"];

// GET /api/system/health — system health metrics
systemRoutes.get("/health", requireRole(...ADMIN_ONLY), async (c) => {
  const [
    totalReservists,
    activeReservists,
    deletedReservists,
    totalUsers,
    activeUsers,
    totalImports,
    totalAuditLogs,
    totalDedup,
    pendingDedup,
    lastImport,
    lastAudit,
    lastLogin,
  ] = await Promise.all([
    prisma.reservist.count(),
    prisma.reservist.count({ where: { isDeleted: false } }),
    prisma.reservist.count({ where: { isDeleted: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.importBatch.count(),
    prisma.auditLog.count(),
    prisma.dedupGroup.count(),
    prisma.dedupGroup.count({ where: { status: "PENDING" } }),
    prisma.importBatch.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, filename: true } }),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } }),
    prisma.auditLog.findFirst({ where: { action: "LOGIN" }, orderBy: { createdAt: "desc" }, select: { createdAt: true }, }),
  ]);

  // Backup info
  const backupDir = path.resolve(process.cwd(), "backups");
  let backupCount = 0;
  let lastBackupDate: string | null = null;
  let backupTotalSize = 0;
  try {
    const files = await fs.readdir(backupDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    backupCount = jsonFiles.length;
    for (const f of jsonFiles) {
      const stats = await fs.stat(path.join(backupDir, f));
      backupTotalSize += stats.size;
      if (!lastBackupDate || stats.mtime.toISOString() > lastBackupDate) {
        lastBackupDate = stats.mtime.toISOString();
      }
    }
  } catch {}

  return c.json({
    database: {
      totalReservists,
      activeReservists,
      deletedReservists,
      totalUsers,
      activeUsers,
      totalImports,
      totalAuditLogs,
      totalDedup,
      pendingDedup,
    },
    lastActivity: {
      lastImport: lastImport ? { date: lastImport.createdAt, filename: lastImport.filename } : null,
      lastAudit: lastAudit ? { date: lastAudit.createdAt, action: lastAudit.action } : null,
      lastLogin: lastLogin ? { date: lastLogin.createdAt } : null,
    },
    backups: {
      count: backupCount,
      lastBackupDate,
      totalSize: backupTotalSize,
    },
    server: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
});

// GET /api/system/login-analytics — user login frequency stats
systemRoutes.get("/login-analytics", requireRole(...ADMIN_ONLY), async (c) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [loginsByDay, loginsByUser, activeSessions] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ["createdAt"],
      where: { action: "LOGIN", createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
    prisma.$queryRawUnsafe<{ userId: string; fullName: string; count: bigint }[]>(`
      SELECT al.user_id as "userId", u.full_name as "fullName", COUNT(*)::bigint as count
      FROM audit_logs al
      JOIN users u ON u.id = al.user_id
      WHERE al.action = 'LOGIN' AND al.created_at >= $1
      GROUP BY al.user_id, u.full_name
      ORDER BY count DESC
    `, thirtyDaysAgo),
    prisma.session.count({ where: { expiresAt: { gte: new Date() } } }),
  ]);

  // Aggregate logins by date
  const loginMap = new Map<string, number>();
  for (const entry of loginsByDay) {
    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    loginMap.set(day, (loginMap.get(day) || 0) + entry._count.id);
  }
  const dailyLogins = Array.from(loginMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const userLogins = loginsByUser.map(u => ({
    userId: u.userId,
    fullName: u.fullName,
    count: Number(u.count),
  }));

  return c.json({ dailyLogins, userLogins, activeSessions });
});

// GET /api/system/import-template — download Excel template
systemRoutes.get("/import-template", async (c) => {
  const headers = [
    "AFPSN", "Rank", "Last Name", "First Name", "Middle Name",
    "Sex (M/F)", "Date of Birth", "Place of Birth", "Blood Type",
    "Marital Status", "TIN", "Home Address", "Town/Province Code",
    "Telephone No", "Mobile Tel No", "Branch of Service Code",
    "AFOS", "Source Commission Code", "Date of Commission",
    "Commission Authority", "Initial Rank", "Date Last Promotion",
    "Promotion Authority", "Reservist Status", "Mobilization Code",
    "Designation Code", "Squad/Team/Section", "Platoon", "Company",
    "BN Code", "Present Occupation Code", "Office Address",
    "Office Tel No", "Boot Size", "Cap Size", "BDA Size",
  ];

  const sampleRow = [
    "SK-R15-000001", "PVT", "DELA CRUZ", "JUAN", "SANTOS",
    "M", "1990-01-15", "MANILA", "O+",
    "SINGLE", "123-456-789", "123 Main St, Manila", "NCR",
    "02-1234567", "09171234567", "PA",
    "", "", "2020-01-01",
    "AFP GHQ", "PVT", "2022-06-15",
    "PA HQ", "READY", "",
    "RIFLEMAN", "1ST SQUAD", "1ST PLATOON", "ALPHA",
    "12RCDG", "", "",
    "", "9 WIDE", "56", "MEDIUM REGULAR",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  // Set column widths
  ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Template");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  c.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  c.header("Content-Disposition", "attachment; filename=H12RCDG_Import_Template.xlsx");
  return c.body(buffer);
});
