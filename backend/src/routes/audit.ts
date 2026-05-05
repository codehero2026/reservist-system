// src/routes/audit.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const auditRoutes = new Hono();
auditRoutes.use("*", requireAuth);
auditRoutes.use("*", requireRole("ADMIN", "S1_OFFICER"));

auditRoutes.get("/", async (c) => {
  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 25);
  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.userId) where.userId = query.userId;
  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    where.createdAt = dateFilter;
  }
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { fullName: true, email: true, role: true } } },
    }),
  ]);
  return c.json({ data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});
