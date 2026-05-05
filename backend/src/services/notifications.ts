import { prisma } from "../lib/prisma";

interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function notify(params: NotifyParams) {
  try {
    await prisma.notification.create({ data: params });
  } catch (e) {
    console.error("[NOTIFY] Failed:", e);
  }
}

export async function notifyByRole(roles: string[], type: string, title: string, message: string, link?: string) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles as any }, isActive: true, isApproved: true },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, type, title, message, link })),
    });
  } catch (e) {
    console.error("[NOTIFY] Failed bulk:", e);
  }
}

export async function notifyAll(type: string, title: string, message: string, link?: string) {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, isApproved: true },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, type, title, message, link })),
    });
  } catch (e) {
    console.error("[NOTIFY] Failed all:", e);
  }
}
