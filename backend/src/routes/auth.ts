// src/routes/auth.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { requireAuth } from "../middleware/auth";
import { createAuditLog } from "../services/audit";

export const authRoutes = new Hono();

// POST /api/auth/login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;
  if (!email || !password) return c.json({ error: "Email and password required" }, 400);

  const emailOrUsername = String(email).toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
  });
  if (!user || !user.isActive) return c.json({ error: "Invalid credentials" }, 401);
  if (!(user as any).isApproved) return c.json({ error: "Your account is pending admin approval" }, 403);

  const valid = await verifyPassword(String(password), user.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ userId: user.id, email: user.email, role: user.role, company: user.company });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

  await createAuditLog({ userId: user.id, action: "LOGIN", notes: `Login: ${email}` });

  return c.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, company: user.company, avatarUrl: (user as any).avatarUrl },
  });
});

// POST /api/auth/logout
authRoutes.post("/logout", requireAuth, async (c) => {
  const token = c.req.header("Authorization")?.slice(7);
  const user = (c as any).get("user") as { userId: string };
  if (token) await prisma.session.deleteMany({ where: { token } });
  await createAuditLog({ userId: user.userId, action: "LOGOUT" });
  return c.json({ message: "Logged out" });
});

// GET /api/auth/me
authRoutes.get("/me", requireAuth, async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true, fullName: true, role: true, company: true, lastLoginAt: true, createdAt: true, avatarUrl: true } as any,
  });
  if (!dbUser) return c.json({ error: "User not found" }, 404);
  return c.json({ user: dbUser });
});

// POST /api/auth/change-password
authRoutes.post("/change-password", requireAuth, async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword || String(newPassword).length < 8)
    return c.json({ error: "Invalid password data" }, 422);
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return c.json({ error: "User not found" }, 404);
  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return c.json({ error: "Current password is incorrect" }, 400);
  await prisma.user.update({ where: { id: user.userId }, data: { passwordHash: await hashPassword(newPassword) } });
  return c.json({ message: "Password changed successfully" });
});

// POST /api/auth/setup — one-time admin creation (only works if zero users exist)
authRoutes.post("/setup", async (c) => {
  const count = await prisma.user.count();
  if (count > 0) return c.json({ error: "Setup already complete — users already exist" }, 403);

  const { email, password, fullName } = await c.req.json();
  if (!email || !password || !fullName) return c.json({ error: "email, password, fullName required" }, 400);

  const user = await prisma.user.create({
    data: {
      email: String(email).toLowerCase(),
      passwordHash: await hashPassword(String(password)),
      fullName: String(fullName),
      role: "ADMIN",
      isActive: true,
    },
    select: { id: true, email: true, fullName: true, role: true, avatarUrl: true } as any,
  });

  return c.json({ message: "Admin account created. You can now log in.", user });
});

// GET /api/auth/debug-login — temporary debug (remove in production)
authRoutes.post("/debug-login", async (c) => {
  const { email, password } = await c.req.json();
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) return c.json({ step: "FAIL", reason: "User not found in database", email });
  
  const hashPreview = user.passwordHash ? user.passwordHash.substring(0, 20) + "..." : "NULL";
  const valid = await verifyPassword(String(password), user.passwordHash);
  
  return c.json({
    step: valid ? "PASS" : "FAIL",
    reason: valid ? "Password matches" : "Password does NOT match hash",
    userFound: true,
    isActive: user.isActive,
    role: user.role,
    hashPreview,
    passwordReceived: String(password),
  });
});
