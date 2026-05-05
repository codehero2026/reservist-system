// src/routes/reports.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const reportsRoutes = new Hono();
reportsRoutes.use("*", requireAuth);

reportsRoutes.get("/roster", async (c) => {
  const query = c.req.query();
  const where: Record<string, unknown> = { isDeleted: false };
  if (query.company) where.company = query.company;
  if (query.status) where.reservistStatus = query.status;
  if (query.platoon) where.platoon = query.platoon;
  const records = await prisma.reservist.findMany({
    where,
    orderBy: [{ company: "asc" }, { platoon: "asc" }, { lastName: "asc" }],
    select: { id: true, afpsn: true, rankCode: true, lastName: true, firstName: true, middleName: true, designationCode: true, squadTeamSection: true, platoon: true, company: true, reservistStatus: true, mobileTelNo: true },
  });
  return c.json({ data: records, total: records.length, generatedAt: new Date().toISOString() });
});

reportsRoutes.get("/summary", async (c) => {
  const [byStatus, byCompany, byRank, bySex, byBloodType] = await Promise.all([
    prisma.reservist.groupBy({ by: ["reservistStatus"], where: { isDeleted: false }, _count: { id: true } }),
    prisma.reservist.groupBy({ by: ["company"], where: { isDeleted: false, company: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.reservist.groupBy({ by: ["rankCode"], where: { isDeleted: false }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.reservist.groupBy({ by: ["sex"], where: { isDeleted: false, sex: { not: null } }, _count: { id: true } }),
    prisma.reservist.groupBy({ by: ["bloodType"], where: { isDeleted: false, bloodType: { not: null } }, _count: { id: true } }),
  ]);
  return c.json({ byStatus, byCompany, byRank, bySex, byBloodType, generatedAt: new Date().toISOString() });
});

reportsRoutes.get("/uniforms", async (c) => {
  const query = c.req.query();
  const where: Record<string, unknown> = { isDeleted: false };
  if (query.company) where.company = query.company;
  const [byBoots, byCaps, byBda] = await Promise.all([
    prisma.reservist.groupBy({ by: ["sizeBoots"], where: { ...where, sizeBoots: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.reservist.groupBy({ by: ["sizeCaps"], where: { ...where, sizeCaps: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.reservist.groupBy({ by: ["sizeBda"], where: { ...where, sizeBda: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
  ]);
  return c.json({ byBoots, byCaps, byBda });
});
