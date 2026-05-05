// src/routes/users.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/auth";
import { notify } from "../services/notifications";

export const userRoutes = new Hono();
userRoutes.use("*", requireAuth);
userRoutes.get("/", requireRole("ADMIN"), async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, company: true, isActive: true, lastLoginAt: true, createdAt: true, avatarUrl: true } as any,
    orderBy: { createdAt: "desc" } as any,
  });
  return c.json({ data: users });
});

userRoutes.post("/", requireRole("ADMIN"), async (c) => {
  const body = await c.req.json();
  const { email, password, fullName, role, company, avatarUrl } = body;
  if (!email || !password || !fullName || !role) return c.json({ error: "Missing required fields" }, 422);
  const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (existing) return c.json({ error: "Email already in use" }, 409);
  const user = await prisma.user.create({
    data: {
      email: String(email).toLowerCase(),
      passwordHash: await hashPassword(String(password)),
      fullName: String(fullName),
      role: role as any,
      company: company || null,
      avatarUrl: avatarUrl || null,
    } as any,
    select: { id: true, email: true, fullName: true, role: true, company: true, isActive: true, createdAt: true, avatarUrl: true } as any,
  });
  return c.json({ data: user }, 201);
});

userRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const requester = (c as any).get("user") as { userId: string; role: string };

  // Allow ADMIN or the user themselves
  if (requester.role !== "ADMIN" && requester.userId !== id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const data: Record<string, unknown> = {};
  if (body.fullName) data.fullName = body.fullName;
  if (body.avatarUrl !== undefined) (data as any).avatarUrl = body.avatarUrl;

  // Only admin can change role/company/isActive
  if (requester.role === "ADMIN") {
    if (body.role) data.role = body.role;
    if (body.company !== undefined) data.company = body.company;
    if (body.isActive !== undefined) data.isActive = body.isActive;
  }

  if (body.password) (data as any).passwordHash = await hashPassword(String(body.password));

  const updated = await prisma.user.update({
    where: { id },
    data: data as any,
    select: { id: true, email: true, fullName: true, role: true, company: true, isActive: true, avatarUrl: true } as any,
  });
  return c.json({ data: updated });
});

userRoutes.delete("/:id", requireRole("ADMIN"), async (c) => {
  const id = c.req.param("id");
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  notify({ userId: id, type: "account", title: "Account Deactivated", message: "Your account has been deactivated by an administrator." });
  return c.json({ message: "User deactivated" });
});
