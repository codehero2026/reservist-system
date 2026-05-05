import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const notificationRoutes = new Hono();
notificationRoutes.use("*", requireAuth);

// GET /api/notifications — list user's notifications + unread count
notificationRoutes.get("/", async (c) => {
  const user = c.get("user") as { userId: string };
  const limit = Math.min(50, Number(c.req.query("limit")) || 20);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: user.userId, isRead: false },
    }),
  ]);

  return c.json({ data: notifications, unreadCount });
});

// POST /api/notifications/:id/read — mark one as read
notificationRoutes.post("/:id/read", async (c) => {
  const user = c.get("user") as { userId: string };
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  await prisma.notification.updateMany({
    where: { id, userId: user.userId },
    data: { isRead: true },
  });
  return c.json({ message: "Marked as read" });
});

// POST /api/notifications/read-all — mark all as read
notificationRoutes.post("/read-all", async (c) => {
  const user = c.get("user") as { userId: string };
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });
  return c.json({ message: "All marked as read" });
});
