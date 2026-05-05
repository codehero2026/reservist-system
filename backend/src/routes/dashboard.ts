// src/routes/dashboard.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = new Hono();
dashboardRoutes.use("*", requireAuth);

dashboardRoutes.get("/stats", async (c) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    total, ready, standby, retired, discharged,
    duplicates, recentlyAdded, female, male,
    byCompany, byRank, pendingDedup, recentImports,
    trendRecords,
  ] = await Promise.all([
    prisma.reservist.count({ where: { isDeleted: false } }),
    prisma.reservist.count({ where: { isDeleted: false, reservistStatus: "READY" } }),
    prisma.reservist.count({ where: { isDeleted: false, reservistStatus: "STANDBY" } }),
    prisma.reservist.count({ where: { isDeleted: false, reservistStatus: "RETIRED" } }),
    prisma.reservist.count({ where: { isDeleted: false, reservistStatus: "DISCHARGED" } }),
    prisma.reservist.count({ where: { isDeleted: false, isDuplicate: true } }),
    prisma.reservist.count({ where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.reservist.count({ where: { isDeleted: false, sex: "F" } }),
    prisma.reservist.count({ where: { isDeleted: false, sex: "M" } }),
    prisma.reservist.groupBy({ by: ["company"], where: { isDeleted: false, company: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.reservist.groupBy({ by: ["rankCode"], where: { isDeleted: false }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    prisma.dedupGroup.count({ where: { status: "PENDING" } }),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { uploadedBy: { select: { fullName: true } } },
    }),
    prisma.reservist.findMany({
      where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Build 30-day daily trend
  const trendMap = new Map<string, number>();
  for (const r of trendRecords) {
    const day = r.createdAt.toISOString().slice(0, 10);
    trendMap.set(day, (trendMap.get(day) || 0) + 1);
  }
  const enrollmentTrend: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    enrollmentTrend.push({ date: key.slice(5), count: trendMap.get(key) || 0 });
  }

  return c.json({
    kpi: { total, ready, standby, retired, discharged, duplicates, recentlyAdded, female, male, pendingDedup },
    byCompany: byCompany.map((r) => ({ company: r.company, count: r._count.id })),
    byRank: byRank.map((r) => ({ rank: r.rankCode, count: r._count.id })),
    recentImports,
    enrollmentTrend,
  });
});

dashboardRoutes.get("/activity", async (c) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { fullName: true, role: true } } },
    select: { id: true, action: true, tableName: true, recordId: true, notes: true, createdAt: true, user: { select: { fullName: true, role: true } } },
  });
  return c.json({ data: logs });
});
