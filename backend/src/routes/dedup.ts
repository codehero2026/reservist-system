// src/routes/dedup.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyByRole } from "../services/notifications";

export const dedupRoutes = new Hono();
dedupRoutes.use("*", requireAuth);

// GET /api/dedup
dedupRoutes.get("/", async (c) => {
  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 25);
  const status = (query.status || "PENDING") as "PENDING" | "RESOLVED" | "MERGED" | "FLAGGED";

  const [total, groups] = await Promise.all([
    prisma.dedupGroup.count({ where: { status } }),
    prisma.dedupGroup.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        members: {
          where: { isDeleted: false },
          select: { id: true, afpsn: true, rankCode: true, lastName: true, firstName: true, company: true, reservistStatus: true },
        },
        _count: { select: { members: true } },
      },
    }),
  ]);

  return c.json({ data: groups, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// GET /api/dedup/stats
dedupRoutes.get("/stats", async (c) => {
  const [pending, resolved, merged, flagged] = await Promise.all([
    prisma.dedupGroup.count({ where: { status: "PENDING" } }),
    prisma.dedupGroup.count({ where: { status: "RESOLVED" } }),
    prisma.dedupGroup.count({ where: { status: "MERGED" } }),
    prisma.dedupGroup.count({ where: { status: "FLAGGED" } }),
  ]);
  return c.json({ pending, resolved, merged, flagged, total: pending + resolved + merged + flagged });
});

// POST /api/dedup/resolve-all — auto-keep first record in every pending group
dedupRoutes.post("/resolve-all", requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const user = c.get("user") as { userId: string };
  const pendingGroups = await prisma.dedupGroup.findMany({
    where: { status: "PENDING" },
    include: { members: { where: { isDeleted: false }, orderBy: { createdAt: "asc" } } },
  });

  if (!pendingGroups.length) return c.json({ message: "No pending groups to resolve", resolved: 0 });

  let resolved = 0;
  for (const group of pendingGroups) {
    if (group.members.length < 2) {
      await prisma.dedupGroup.update({ where: { id: group.id }, data: { status: "RESOLVED", resolution: "Auto-resolved (single record)", resolvedById: user.userId, resolvedAt: new Date() } });
      if (group.members[0]) await prisma.reservist.update({ where: { id: group.members[0].id }, data: { isDuplicate: false } });
      resolved++;
      continue;
    }

    const keep = group.members[0];
    const toArchive = group.members.slice(1);
    await prisma.reservist.updateMany({ where: { id: { in: toArchive.map(m => m.id) } }, data: { isDeleted: true } });
    await prisma.reservist.update({ where: { id: keep.id }, data: { isDuplicate: false } });
    await prisma.dedupGroup.update({
      where: { id: group.id },
      data: { status: "RESOLVED", resolution: `Auto-kept #${keep.id} (oldest), archived ${toArchive.length} records`, resolvedById: user.userId, resolvedAt: new Date() },
    });
    await createAuditLog({ userId: user.userId, action: "DEDUP_MERGE", tableName: "dedup_groups", recordId: group.id, notes: `Bulk resolve: kept #${keep.id}`, dedupGroupId: group.id });
    resolved++;
  }

  notifyByRole(["ADMIN", "S1_OFFICER"], "dedup", "Bulk Dedup Resolved", `${resolved} duplicate groups auto-resolved.`, "/dedup");
  return c.json({ message: `Resolved ${resolved} duplicate groups`, resolved });
});

// GET /api/dedup/:id
dedupRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
  const group = await prisma.dedupGroup.findUnique({
    where: { id },
    include: {
      members: { where: { isDeleted: false } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { fullName: true } } },
      },
    },
  });
  if (!group) return c.json({ error: "Group not found" }, 404);
  return c.json({ data: group });
});

// POST /api/dedup/:id/keep
dedupRoutes.post("/:id/keep", requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const user = c.get("user") as { userId: string };
  const groupId = Number(c.req.param("id"));
  if (isNaN(groupId)) return c.json({ error: "Invalid ID" }, 400);
  const { keepId, resolution } = await c.req.json();
  if (!keepId) return c.json({ error: "keepId required" }, 400);

  const group = await prisma.dedupGroup.findUnique({ where: { id: groupId }, include: { members: true } });
  if (!group) return c.json({ error: "Group not found" }, 404);

  const toArchive = group.members.filter((m) => m.id !== Number(keepId));
  await prisma.reservist.updateMany({ where: { id: { in: toArchive.map((m) => m.id) } }, data: { isDeleted: true } });
  await prisma.reservist.update({ where: { id: Number(keepId) }, data: { isDuplicate: false } });
  await prisma.dedupGroup.update({
    where: { id: groupId },
    data: { status: "RESOLVED", resolution: resolution || `Kept #${keepId}, archived ${toArchive.length} records`, resolvedById: user.userId, resolvedAt: new Date() },
  });

  await createAuditLog({ userId: user.userId, action: "DEDUP_MERGE", tableName: "dedup_groups", recordId: groupId, notes: `Kept #${keepId}`, dedupGroupId: groupId });
  notifyByRole(["ADMIN", "S1_OFFICER"], "dedup", "Duplicate Resolved", `Group #${groupId} resolved — kept record #${keepId}.`, "/dedup");
  return c.json({ message: "Resolved — kept record and archived duplicates" });
});

// POST /api/dedup/:id/merge
dedupRoutes.post("/:id/merge", requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const user = c.get("user") as { userId: string };
  const groupId = Number(c.req.param("id"));
  if (isNaN(groupId)) return c.json({ error: "Invalid ID" }, 400);
  const { primaryId, mergedData, resolution } = await c.req.json();
  if (!primaryId) return c.json({ error: "primaryId required" }, 400);

  const group = await prisma.dedupGroup.findUnique({ where: { id: groupId }, include: { members: true } });
  if (!group) return c.json({ error: "Group not found" }, 404);

  if (mergedData) await prisma.reservist.update({ where: { id: Number(primaryId) }, data: { ...mergedData, isDuplicate: false } });
  else await prisma.reservist.update({ where: { id: Number(primaryId) }, data: { isDuplicate: false } });

  const toArchive = group.members.filter((m) => m.id !== Number(primaryId));
  await prisma.reservist.updateMany({ where: { id: { in: toArchive.map((m) => m.id) } }, data: { isDeleted: true } });
  await prisma.dedupGroup.update({
    where: { id: groupId },
    data: { status: "MERGED", resolution: resolution || `Merged into #${primaryId}`, resolvedById: user.userId, resolvedAt: new Date() },
  });

  await createAuditLog({ userId: user.userId, action: "DEDUP_MERGE", tableName: "dedup_groups", recordId: groupId, notes: `Merged into #${primaryId}`, dedupGroupId: groupId });
  notifyByRole(["ADMIN", "S1_OFFICER"], "dedup", "Records Merged", `Group #${groupId} merged into record #${primaryId}.`, "/dedup");
  return c.json({ message: "Records merged successfully" });
});

// POST /api/dedup/:id/flag
dedupRoutes.post("/:id/flag", requireRole("ADMIN", "S1_OFFICER", "UNIT_CLERK"), async (c) => {
  const user = c.get("user") as { userId: string };
  const groupId = Number(c.req.param("id"));
  if (isNaN(groupId)) return c.json({ error: "Invalid ID" }, 400);
  const { notes } = await c.req.json();
  await prisma.dedupGroup.update({ where: { id: groupId }, data: { status: "FLAGGED", resolution: notes || "Flagged for review" } });
  await createAuditLog({ userId: user.userId, action: "DEDUP_FLAG", tableName: "dedup_groups", recordId: groupId, notes, dedupGroupId: groupId });
  notifyByRole(["ADMIN", "S1_OFFICER"], "dedup", "Group Flagged", `Dedup group #${groupId} flagged for review.`, "/dedup");
  return c.json({ message: "Group flagged for review" });
});
