// src/routes/personnel.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyByRole } from "../services/notifications";

export const personnelRoutes = new Hono();
personnelRoutes.use("*", requireAuth);

// GET /api/personnel
personnelRoutes.get("/", async (c) => {
  const user = c.get("user") as { userId: string; role: string; company?: string | null };
  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 25);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (user.role === "UNIT_CLERK" && user.company) where.company = user.company;
  else if (query.company) where.company = query.company;
  if (query.status) where.reservistStatus = query.status;
  if (query.platoon) where.platoon = query.platoon;
  if (query.sex) where.sex = query.sex;
  if (query.rankCode) where.rankCode = query.rankCode;
  if (query.isDuplicate !== undefined) where.isDuplicate = query.isDuplicate === "true";

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
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: limit,
      select: {
        id: true, afpsn: true, rankCode: true, lastName: true,
        firstName: true, middleName: true, sex: true, company: true,
        platoon: true, squadTeamSection: true, designationCode: true,
        reservistStatus: true, mobileTelNo: true, isDuplicate: true,
        dateOfRecord: true, updatedAt: true,
      },
    }),
  ]);

  return c.json({ data: records, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// GET /api/personnel/meta/options
personnelRoutes.get("/meta/options", async (c) => {
  const [companies, platoons, designations, ranks] = await Promise.all([
    prisma.reservist.findMany({ where: { isDeleted: false, company: { not: null } }, select: { company: true }, distinct: ["company"], orderBy: { company: "asc" } }),
    prisma.reservist.findMany({ where: { isDeleted: false, platoon: { not: null } }, select: { platoon: true }, distinct: ["platoon"], orderBy: { platoon: "asc" } }),
    prisma.reservist.findMany({ where: { isDeleted: false, designationCode: { not: null } }, select: { designationCode: true }, distinct: ["designationCode"] }),
    prisma.reservist.findMany({ where: { isDeleted: false }, select: { rankCode: true }, distinct: ["rankCode"], orderBy: { rankCode: "asc" } }),
  ]);
  return c.json({
    companies: companies.map((r) => r.company).filter(Boolean),
    platoons: platoons.map((r) => r.platoon).filter(Boolean),
    designations: designations.map((r) => r.designationCode).filter(Boolean),
    ranks: ranks.map((r) => r.rankCode).filter(Boolean),
  });
});

// GET /api/personnel/:id
personnelRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
  const record = await prisma.reservist.findFirst({ where: { id, isDeleted: false } });
  if (!record) return c.json({ error: "Reservist not found" }, 404);
  return c.json({ data: record });
});

// POST /api/personnel
personnelRoutes.post("/", requireRole("ADMIN", "S1_OFFICER", "UNIT_CLERK"), async (c) => {
  const user = c.get("user") as { userId: string; role: string; company?: string | null };
  const data = await c.req.json();

  if (user.role === "UNIT_CLERK" && user.company && data.company !== user.company)
    return c.json({ error: "You can only add personnel to your assigned company" }, 403);

  const existingCount = await prisma.reservist.count({ where: { afpsn: String(data.afpsn), isDeleted: false } });
  const isDuplicate = existingCount > 0;

  const record = await prisma.reservist.create({
    data: {
      afpsn: String(data.afpsn),
      rankCode: String(data.rankCode || ""),
      lastName: String(data.lastName || ""),
      firstName: String(data.firstName || ""),
      middleName: data.middleName || null,
      sex: data.sex || null,
      dateBirth: data.dateBirth ? new Date(data.dateBirth) : null,
      placeBirth: data.placeBirth || null,
      bloodType: data.bloodType || null,
      religionCode: data.religionCode || null,
      maritalStatus: data.maritalStatus || null,
      tin: data.tin || null,
      homeAddress: data.homeAddress || null,
      townProvinceCode: data.townProvinceCode || null,
      telephoneNo: data.telephoneNo || null,
      mobileTelNo: data.mobileTelNo || null,
      brSvcCode: data.brSvcCode || null,
      svcAfos: data.svcAfos || null,
      sourceCommissionCode: data.sourceCommissionCode || null,
      dateCommission: data.dateCommission ? new Date(data.dateCommission) : null,
      commissionAuthority: data.commissionAuthority || null,
      initialRank: data.initialRank || null,
      dateLastPromotion: data.dateLastPromotion ? new Date(data.dateLastPromotion) : null,
      promotionAuthority: data.promotionAuthority || null,
      reservistStatus: data.reservistStatus || "READY",
      mobilizationCode: data.mobilizationCode || null,
      designationCode: data.designationCode || null,
      squadTeamSection: data.squadTeamSection || null,
      platoon: data.platoon || null,
      company: data.company || null,
      bnCode: data.bnCode || null,
      presentOccupationCode: data.presentOccupationCode || null,
      officeAddress: data.officeAddress || null,
      officeTelNo: data.officeTelNo || null,
      sizeBoots: data.sizeBoots || null,
      sizeCaps: data.sizeCaps || null,
      sizeBda: data.sizeBda || null,
      dateOfRecord: data.dateOfRecord ? new Date(data.dateOfRecord) : null,
      recordBy: data.recordBy || null,
      isDuplicate,
    },
  });

  if (isDuplicate) {
    let group = await prisma.dedupGroup.findFirst({ where: { afpsn: String(data.afpsn), status: "PENDING" } });
    if (!group) {
      group = await prisma.dedupGroup.create({ data: { afpsn: String(data.afpsn) } });
      await prisma.reservist.updateMany({ where: { afpsn: String(data.afpsn), isDeleted: false, id: { not: record.id } }, data: { isDuplicate: true } });
    }
    await prisma.dedupGroup.update({ where: { id: group.id }, data: { members: { connect: { id: record.id } } } });
  }

  await createAuditLog({ userId: user.userId, action: "CREATE", tableName: "reservists", recordId: record.id, newValue: record });
  notifyByRole(["ADMIN", "S1_OFFICER"], "personnel", "New Reservist Added", `${data.lastName}, ${data.firstName} (${data.afpsn}) added to personnel.`, `/personnel`);
  return c.json({ data: record, isDuplicate }, 201);
});

// PATCH /api/personnel/:id
personnelRoutes.patch("/:id", requireRole("ADMIN", "S1_OFFICER", "UNIT_CLERK"), async (c) => {
  const user = c.get("user") as { userId: string; role: string; company?: string | null };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const existing = await prisma.reservist.findFirst({ where: { id, isDeleted: false } });
  if (!existing) return c.json({ error: "Reservist not found" }, 404);
  if (user.role === "UNIT_CLERK" && user.company && existing.company !== user.company)
    return c.json({ error: "You can only edit personnel in your assigned company" }, 403);

  const body = await c.req.json();
  const updated = await prisma.reservist.update({
    where: { id },
    data: {
      ...body,
      dateBirth: body.dateBirth ? new Date(body.dateBirth) : undefined,
      dateCommission: body.dateCommission ? new Date(body.dateCommission) : undefined,
      dateLastPromotion: body.dateLastPromotion ? new Date(body.dateLastPromotion) : undefined,
      dateOfRecord: body.dateOfRecord ? new Date(body.dateOfRecord) : undefined,
    },
  });

  await createAuditLog({ userId: user.userId, action: "UPDATE", tableName: "reservists", recordId: id, oldValue: existing, newValue: updated });
  return c.json({ data: updated });
});

// DELETE /api/personnel/:id
personnelRoutes.delete("/:id", requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const user = c.get("user") as { userId: string };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
  const existing = await prisma.reservist.findFirst({ where: { id, isDeleted: false } });
  if (!existing) return c.json({ error: "Reservist not found" }, 404);
  await prisma.reservist.update({ where: { id }, data: { isDeleted: true } });
  await createAuditLog({ userId: user.userId, action: "DELETE", tableName: "reservists", recordId: id, notes: "Soft delete" });
  notifyByRole(["ADMIN", "S1_OFFICER"], "personnel", "Reservist Deleted", `${existing.lastName}, ${existing.firstName} (${existing.afpsn}) moved to trash.`, "/trash");
  return c.json({ message: "Reservist deleted" });
});
