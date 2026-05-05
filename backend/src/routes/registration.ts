// src/routes/registration.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notify, notifyByRole } from "../services/notifications";

export const registrationRoutes = new Hono();

// POST /api/register — public self-registration for reservists
registrationRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const { email, username, password, fullName, afpsn, rankCode, lastName, firstName, middleName, sex, mobileTelNo } = body;

  if (!email || !username || !password || !fullName || !afpsn || !rankCode || !lastName || !firstName)
    return c.json({ error: "All required fields must be provided" }, 400);

  if (String(password).length < 8)
    return c.json({ error: "Password must be at least 8 characters" }, 400);

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: String(email).toLowerCase() }, { username: String(username).toLowerCase() }] },
  });
  if (existingUser) return c.json({ error: "Email or username already taken" }, 409);

  const trimmedAfpsn = String(afpsn).trim();

  // Check if a reservist with this AFPSN already exists (e.g. from import)
  const existingReservist = await prisma.reservist.findFirst({
    where: { afpsn: trimmedAfpsn, isDeleted: false },
    include: { userAccount: { select: { id: true } } },
  });

  if (existingReservist?.userAccount) {
    return c.json({ error: "This AFPSN is already linked to an account" }, 409);
  }

  let reservistId: number;

  if (existingReservist) {
    // Link to existing imported record
    reservistId = existingReservist.id;
  } else {
    // Create new reservist record
    const reservist = await prisma.reservist.create({
      data: {
        afpsn: trimmedAfpsn,
        rankCode: String(rankCode).trim(),
        lastName: String(lastName).trim(),
        firstName: String(firstName).trim(),
        middleName: middleName ? String(middleName).trim() : null,
        sex: sex || null,
        mobileTelNo: mobileTelNo || null,
      },
    });
    reservistId = reservist.id;
  }

  const user = await prisma.user.create({
    data: {
      email: String(email).toLowerCase().trim(),
      username: String(username).toLowerCase().trim(),
      passwordHash: await hashPassword(String(password)),
      fullName: String(fullName).trim(),
      role: "RESERVIST",
      isActive: true,
      isApproved: false,
      reservistId,
    },
    select: { id: true, email: true, username: true, fullName: true, role: true },
  });

  notifyByRole(["ADMIN", "S1_OFFICER"], "registration", "New Registration", `${String(fullName).trim()} has registered and is pending approval.`, "/users");

  const linked = !!existingReservist;
  return c.json({
    message: linked
      ? "Registration submitted. Your account has been linked to your existing record and is pending admin approval."
      : "Registration submitted. Your account is pending admin approval.",
    user,
    linked,
  });
});

// GET /api/register/pending — admin: list pending registrations
registrationRoutes.get("/pending", requireAuth, requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const pending = await prisma.user.findMany({
    where: { isApproved: false, role: "RESERVIST" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, username: true, fullName: true, role: true,
      createdAt: true, isApproved: true, isActive: true,
      reservist: { select: { id: true, afpsn: true, rankCode: true, lastName: true, firstName: true, middleName: true, sex: true, mobileTelNo: true } },
    },
  });
  return c.json({ data: pending, total: pending.length });
});

// POST /api/register/:id/approve — admin: approve a registration
registrationRoutes.post("/:id/approve", requireAuth, requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const adminUser = c.get("user") as { userId: string };
  const id = c.req.param("id");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return c.json({ error: "User not found" }, 404);
  if (target.isApproved) return c.json({ error: "Already approved" }, 400);

  await prisma.user.update({ where: { id }, data: { isApproved: true } });
  await createAuditLog({ userId: adminUser.userId, action: "REGISTER", tableName: "users", recordId: id, notes: `Approved registration: ${target.email}` });
  notify({ userId: id, type: "approval", title: "Account Approved", message: "Your registration has been approved. You can now access the system.", link: "/dashboard" });
  return c.json({ message: "Registration approved" });
});

// POST /api/register/:id/reject — admin: reject (delete) a registration
registrationRoutes.post("/:id/reject", requireAuth, requireRole("ADMIN", "S1_OFFICER"), async (c) => {
  const adminUser = c.get("user") as { userId: string };
  const id = c.req.param("id");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return c.json({ error: "User not found" }, 404);

  if (target.reservistId) {
    await prisma.user.delete({ where: { id } });
    await prisma.reservist.delete({ where: { id: target.reservistId } });
  } else {
    await prisma.user.delete({ where: { id } });
  }

  await createAuditLog({ userId: adminUser.userId, action: "REGISTER", tableName: "users", recordId: id, notes: `Rejected registration: ${target.email}` });
  return c.json({ message: "Registration rejected" });
});

// GET /api/register/my-profile — reservist: get own linked reservist record
registrationRoutes.get("/my-profile", requireAuth, async (c) => {
  const user = c.get("user") as { userId: string };
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { reservistId: true } });
  if (!dbUser?.reservistId) return c.json({ error: "No linked reservist record" }, 404);
  const reservist = await prisma.reservist.findUnique({ where: { id: dbUser.reservistId } });
  if (!reservist) return c.json({ error: "Reservist record not found" }, 404);
  return c.json({ data: reservist });
});

// PUT /api/register/my-profile — reservist: update own profile fields
registrationRoutes.put("/my-profile", requireAuth, async (c) => {
  const user = c.get("user") as { userId: string };
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { reservistId: true } });
  if (!dbUser?.reservistId) return c.json({ error: "No linked reservist record" }, 404);

  const body = await c.req.json();
  const ALLOWED = [
    "middleName", "sex", "dateBirth", "placeBirth", "bloodType", "religionCode", "maritalStatus", "tin",
    "homeAddress", "townProvinceCode", "telephoneNo", "mobileTelNo",
    "presentOccupationCode", "officeAddress", "officeTelNo",
    "sizeBoots", "sizeCaps", "sizeBda",
  ];

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) {
      if (key === "dateBirth" && body[key]) {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  const updated = await prisma.reservist.update({ where: { id: dbUser.reservistId }, data });
  await createAuditLog({ userId: user.userId, action: "UPDATE", tableName: "reservists", recordId: dbUser.reservistId, notes: "Self-service profile update" });
  return c.json({ data: updated, message: "Profile updated" });
});
