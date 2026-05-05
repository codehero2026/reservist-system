// src/routes/batch.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyByRole } from "../services/notifications";

export const batchRoutes = new Hono();
batchRoutes.use("*", requireAuth);

const ADMIN_S1 = ["ADMIN", "S1_OFFICER"];

// POST /api/batch/status — batch update status for multiple reservists
batchRoutes.post("/status", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as {
    ids: number[];
    status: string;
    notes?: string;
  };

  if (!body.ids?.length) return c.json({ error: "No records selected" }, 400);
  const validStatuses = ["READY", "STANDBY", "RETIRED", "DISCHARGED"];
  if (!validStatuses.includes(body.status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
  }

  const existing = await prisma.reservist.findMany({
    where: { id: { in: body.ids }, isDeleted: false },
    select: { id: true, lastName: true, firstName: true, reservistStatus: true },
  });

  if (existing.length === 0) return c.json({ error: "No valid records found" }, 404);

  await prisma.reservist.updateMany({
    where: { id: { in: existing.map(r => r.id) } },
    data: { reservistStatus: body.status as any },
  });

  await createAuditLog({
    userId: user.userId,
    action: "BATCH_UPDATE",
    tableName: "reservists",
    notes: `Batch status update to ${body.status} for ${existing.length} records${body.notes ? `: ${body.notes}` : ""}`,
    newValue: { ids: existing.map(r => r.id), newStatus: body.status },
    oldValue: { records: existing.map(r => ({ id: r.id, oldStatus: r.reservistStatus })) },
  });

  notifyByRole(["ADMIN", "S1_OFFICER"], "batch", "Batch Status Update", `${existing.length} records updated to ${body.status}.`, "/personnel");
  return c.json({
    message: `${existing.length} records updated to ${body.status}`,
    updated: existing.length,
  });
});
