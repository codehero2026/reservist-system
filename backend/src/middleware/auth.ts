// src/middleware/auth.ts
import type { Context, Next } from "hono";
import { verifyToken, extractToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

export async function requireAuth(c: Context, next: Next) {
  const token = extractToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Unauthorized — no token provided" }, 401);
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, company: true, isActive: true },
    });
    if (!user || !user.isActive) return c.json({ error: "Unauthorized — account inactive" }, 401);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Unauthorized — invalid or expired token" }, 401);
  }
}

// Alias for backward compatibility
export const authMiddleware = requireAuth;

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as { role: string } | undefined;
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!roles.includes(user.role)) return c.json({ error: `Forbidden — requires: ${roles.join(", ")}` }, 403);
    await next();
  };
}
