// src/routes/trash.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyByRole } from "../services/notifications";

export const trashRoutes = new Hono();
trashRoutes.use("*", requireAuth);

const ADMIN_S1 = ["ADMIN", "S1_OFFICER"];

// GET /api/trash — list soft-deleted reservists
trashRoutes.get("/", requireRole(...ADMIN_S1), async (c) => {
  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 25);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: true };
  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { afpsn: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
      { firstName: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.reservist.count({ where }),
    prisma.reservist.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, afpsn: true, rankCode: true, lastName: true,
        firstName: true, middleName: true, sex: true, company: true,
        platoon: true, reservistStatus: true, mobileTelNo: true,
        updatedAt: true,
      },
    }),
  ]);

  return c.json({ data: records, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// POST /api/trash/:id/restore — restore a soft-deleted reservist
trashRoutes.post("/:id/restore", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const record = await prisma.reservist.findFirst({ where: { id, isDeleted: true } });
  if (!record) return c.json({ error: "Record not found in trash" }, 404);

  await prisma.reservist.update({ where: { id }, data: { isDeleted: false } });

  await createAuditLog({
    userId: user.userId,
    action: "UPDATE",
    tableName: "reservists",
    recordId: id,
    notes: `Restored from trash: ${record.lastName}, ${record.firstName}`,
  });

  notifyByRole(["ADMIN", "S1_OFFICER"], "trash", "Record Restored", `${record.lastName}, ${record.firstName} restored from trash.`, "/personnel");
  return c.json({ message: "Record restored successfully" });
});

// POST /api/trash/restore-all — restore all deleted records
trashRoutes.post("/restore-all", requireRole("ADMIN"), async (c) => {
  const user = (c as any).get("user") as { userId: string };

  const count = await prisma.reservist.count({ where: { isDeleted: true } });
  if (count === 0) return c.json({ message: "No records in trash" });

  await prisma.reservist.updateMany({ where: { isDeleted: true }, data: { isDeleted: false } });

  await createAuditLog({
    userId: user.userId,
    action: "UPDATE",
    tableName: "reservists",
    notes: `Restored all ${count} records from trash`,
  });

  notifyByRole(["ADMIN", "S1_OFFICER"], "trash", "Bulk Restore", `${count} records restored from trash.`, "/personnel");
  return c.json({ message: `${count} records restored` });
});
