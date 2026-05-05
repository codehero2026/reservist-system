// src/routes/announcements.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyAll } from "../services/notifications";

export const announcementRoutes = new Hono();
announcementRoutes.use("*", requireAuth);

const ADMIN_S1 = ["ADMIN", "S1_OFFICER"];

// GET /api/announcements — active announcements for all users
announcementRoutes.get("/", async (c) => {
  const query = c.req.query();
  const includeExpired = query.all === "true";

  const where: Record<string, unknown> = {};
  if (!includeExpired) {
    where.isActive = true;
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } },
    ];
  }

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { fullName: true, role: true } } },
  });

  return c.json({ data: announcements });
});

// POST /api/announcements — create new
announcementRoutes.post("/", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json();

  const announcement = await prisma.announcement.create({
    data: {
      title: String(body.title),
      content: String(body.content),
      priority: body.priority || "normal",
      isPinned: body.isPinned ?? false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdById: user.userId,
    },
  });

  await createAuditLog({
    userId: user.userId,
    action: "ANNOUNCEMENT",
    tableName: "announcements",
    recordId: announcement.id,
    notes: `Created announcement: ${announcement.title}`,
  });

  notifyAll("announcement", `Announcement: ${announcement.title}`, String(body.content).slice(0, 100), "/announcements");
  return c.json({ data: announcement }, 201);
});

// PATCH /api/announcements/:id — update
announcementRoutes.patch("/:id", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const body = await c.req.json();
  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
    },
  });

  await createAuditLog({
    userId: user.userId,
    action: "ANNOUNCEMENT",
    tableName: "announcements",
    recordId: id,
    notes: `Updated announcement: ${updated.title}`,
  });

  return c.json({ data: updated });
});

// DELETE /api/announcements/:id — hard delete
announcementRoutes.delete("/:id", requireRole("ADMIN"), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Announcement not found" }, 404);

  await prisma.announcement.delete({ where: { id } });

  await createAuditLog({
    userId: user.userId,
    action: "DELETE",
    tableName: "announcements",
    recordId: id,
    notes: `Deleted announcement: ${existing.title}`,
  });

  return c.json({ message: "Announcement deleted" });
});
