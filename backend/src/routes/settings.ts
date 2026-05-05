// src/routes/settings.ts
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import fs from "node:fs/promises";
import path from "node:path";

export const settingsRoutes = new Hono();
settingsRoutes.use("*", requireAuth);

// ─── Role helpers ────────────────────────────────────────────────────
const ADMIN_ONLY    = ["ADMIN"];
const ADMIN_S1      = ["ADMIN", "S1_OFFICER"];

// ─── GET /api/settings — all settings (all authenticated users) ──────
settingsRoutes.get("/", async (c) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { category: "asc" },
    });
    const map: Record<string, string | null> = {};
    for (const s of settings) {
      map[s.key] = s.value ?? null;
    }
    return c.json({ data: map, raw: settings });
  } catch {
    // Table may not exist yet (before first migration)
    return c.json({ data: {}, raw: [], note: "Settings table not initialized" });
  }
});

// ─── PUT /api/settings — upsert one or many keys ────────────────────
settingsRoutes.put("/", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as Record<string, string | null>;

  console.log(`[DEBUG] Updating settings:`, body);

  for (const [key, value] of Object.entries(body)) {
    console.log(`[DEBUG] Upserting ${key} = ${value}`);
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value ?? null, updatedById: user.userId },
      create: { key, value: value ?? null, category: inferCategory(key), updatedById: user.userId },
    });
  }

  await createAuditLog({
    userId: user.userId,
    action: "SETTINGS_UPDATE",
    tableName: "system_settings",
    notes: `Updated settings: ${Object.keys(body).join(", ")}`,
  });

  console.log(`[DEBUG] Settings update complete`);
  return c.json({ message: "Settings saved" });
});

// ─── POST /api/settings/logo — upload logo (base64) ─────────────────
settingsRoutes.post("/logo", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  if (!body.data || !body.mimeType) {
    return c.json({ error: "data and mimeType required" }, 400);
  }
  // Validate mime type
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(body.mimeType)) {
    return c.json({ error: "Invalid image type. Allowed: JPG, PNG, WebP, SVG" }, 422);
  }
  // Validate size (base64 ≈ 4/3 * actual bytes; cap at 2MB actual)
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 2 * 1024 * 1024) {
    return c.json({ error: "Image too large. Maximum size is 2MB" }, 422);
  }

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "logo" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "logo", value: dataUri, category: "branding", updatedById: user.userId },
  });

  await createAuditLog({
    userId: user.userId, action: "SETTINGS_UPDATE",
    tableName: "system_settings", notes: "Updated system logo",
  });

  return c.json({ message: "Logo saved", url: dataUri });
});

// ─── POST /api/settings/developer-photo ─────────────────────────────
settingsRoutes.post("/developer-photo", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(body.mimeType)) {
    return c.json({ error: "Invalid image type" }, 422);
  }
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 1 * 1024 * 1024) {
    return c.json({ error: "Image too large. Maximum 1MB" }, 422);
  }

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "developer_photo" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "developer_photo", value: dataUri, category: "developer", updatedById: user.userId },
  });

  return c.json({ message: "Developer photo saved", url: dataUri });
});

// ─── POST /api/settings/dev1-photo ───────────────────────────────────
settingsRoutes.post("/dev1-photo", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(body.mimeType)) {
    return c.json({ error: "Invalid image type" }, 422);
  }
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 1 * 1024 * 1024) {
    return c.json({ error: "Image too large. Maximum 1MB" }, 422);
  }

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "dev1_photo" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "dev1_photo", value: dataUri, category: "developer", updatedById: user.userId },
  });
  return c.json({ message: "Dev 1 photo saved", url: dataUri });
});

// ─── POST /api/settings/dev2-photo ───────────────────────────────────
settingsRoutes.post("/dev2-photo", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(body.mimeType)) {
    return c.json({ error: "Invalid image type" }, 422);
  }
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 1 * 1024 * 1024) {
    return c.json({ error: "Image too large. Maximum 1MB" }, 422);
  }

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "dev2_photo" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "dev2_photo", value: dataUri, category: "developer", updatedById: user.userId },
  });
  return c.json({ message: "Dev 2 photo saved", url: dataUri });
});

// ─── POST /api/settings/hero-bg ──────────────────────────────────────
settingsRoutes.post("/hero-bg", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(body.mimeType)) return c.json({ error: "Invalid image type. Use JPG, PNG, or WebP." }, 422);
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 5 * 1024 * 1024) return c.json({ error: "Image too large. Maximum 5MB." }, 422);

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "hero_bg" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "hero_bg", value: dataUri, category: "branding", updatedById: user.userId },
  });
  await createAuditLog({
    userId: user.userId, action: "SETTINGS_UPDATE",
    tableName: "system_settings", notes: "Updated hero background image",
  });
  return c.json({ message: "Hero background saved", url: dataUri });
});

// ─── POST /api/settings/adviser-photo ────────────────────────────────
settingsRoutes.post("/adviser-photo", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { data: string; mimeType: string };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(body.mimeType)) return c.json({ error: "Invalid image type" }, 422);
  const approxBytes = (body.data.length * 3) / 4;
  if (approxBytes > 1 * 1024 * 1024) return c.json({ error: "Image too large. Maximum 1MB" }, 422);

  const dataUri = `data:${body.mimeType};base64,${body.data}`;
  await prisma.systemSetting.upsert({
    where: { key: "adviser_photo" },
    update: { value: dataUri, updatedById: user.userId },
    create: { key: "adviser_photo", value: dataUri, category: "developer", updatedById: user.userId },
  });
  return c.json({ message: "Adviser photo saved", url: dataUri });
});

// ─── Backup Management ────────────────────────────────────────────────
const BACKUP_DIR = path.resolve(process.cwd(), "backups");

// List all server-side backups
settingsRoutes.get("/backups", requireRole(...ADMIN_S1), async (c) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter(f => f.endsWith(".json"))
        .map(async (f) => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            filename: f,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
          };
        })
    );
    // Sort youngest first
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ data: backups });
  } catch (e) {
    return c.json({ error: "Failed to list backups: " + String(e) }, 500);
  }
});

// Helper to create a backup object — exported/used inside POST /backups
async function generateBackupObject(userId: string) {
  const [reservists, users, importBatches, dedupGroups, settings] = await Promise.all([
    prisma.reservist.findMany({ where: { isDeleted: false } }),
    prisma.user.findMany({ select: { id:true, email:true, fullName:true, role:true, company:true, isActive:true, createdAt:true } }),
    prisma.importBatch.findMany(),
    prisma.dedupGroup.findMany(),
    prisma.systemSetting.findMany(),
  ]);

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    exportedBy: userId,
    tables: { reservists, users, importBatches, dedupGroups, settings },
  };
}

// Create a new backup on the server
settingsRoutes.post("/backups", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  try {
    const backup = await generateBackupObject(user.userId);
    const filename = `backup_h12rcdg_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(backup, null, 2));

    await createAuditLog({
      userId: user.userId, action: "BACKUP",
      tableName: "system", notes: `Server-side backup created: ${filename}`,
    });

    return c.json({ message: "Backup created successfully", filename });
  } catch (e) {
    return c.json({ error: "Backup creation failed: " + String(e) }, 500);
  }
});

// Download a backup
settingsRoutes.get("/backups/:filename", requireRole(...ADMIN_S1), async (c) => {
  const filename = c.req.param("filename");
  if (!filename) return c.json({ error: "Filename required" }, 400);
  const filePath = path.join(BACKUP_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return c.json({ data: JSON.parse(content) });
  } catch {
    return c.json({ error: "Backup file not found" }, 404);
  }
});

// Delete a backup
settingsRoutes.delete("/backups/:filename", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const filename = c.req.param("filename");
  if (!filename) return c.json({ error: "Filename required" }, 400);
  const filePath = path.join(BACKUP_DIR, filename);
  try {
    await fs.unlink(filePath);
    await createAuditLog({
      userId: user.userId, action: "DELETE",
      tableName: "system", notes: `Backup deleted: ${filename}`,
    });
    return c.json({ message: "Backup deleted" });
  } catch {
    return c.json({ error: "Failed to delete backup" }, 500);
  }
});

// Restore from an existing server-side backup
settingsRoutes.post("/backups/:filename/restore", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const filename = c.req.param("filename");
  if (!filename) return c.json({ error: "Filename required" }, 400);
  const filePath = path.join(BACKUP_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    
    // Use existing restore logic for settings
    const settingsToRestore = parsed.tables.settings as { key: string; value: string | null }[];
    for (const s of settingsToRestore) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value, category: inferCategory(s.key) },
      });
    }

    await createAuditLog({
      userId: user.userId, action: "RESTORE",
      tableName: "system", notes: `Settings restored from server backup: ${filename}`,
    });

    return c.json({ message: "Settings restored successfully" });
  } catch (e) {
    return c.json({ error: "Restore failed: " + String(e) }, 500);
  }
});

// ─── Legacy endpoints (modified to use generateBackupObject) ─────────
settingsRoutes.post("/backup", requireRole(...ADMIN_S1), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  try {
    const backup = await generateBackupObject(user.userId);
    await createAuditLog({
      userId: user.userId, action: "BACKUP",
      tableName: "system", notes: `Database export downloaded by user`,
    });
    return c.json({ data: backup });
  } catch (e) {
    return c.json({ error: "Backup failed: " + String(e) }, 500);
  }
});

// ─── POST /api/settings/restore ──────────────────────────────────────
// Restore is ADMIN-only — most destructive operation
settingsRoutes.post("/restore", requireRole(...ADMIN_ONLY), async (c) => {
  const user = (c as any).get("user") as { userId: string };
  const body = await c.req.json() as { backup: string; confirmed: boolean };

  if (!body.confirmed) {
    return c.json({ error: "Restore requires explicit confirmation" }, 400);
  }

  let parsed: { version: string; tables: { reservists: unknown[]; settings: unknown[] } };
  try {
    parsed = typeof body.backup === "string" ? JSON.parse(body.backup) : body.backup;
  } catch {
    return c.json({ error: "Invalid backup file — could not parse JSON" }, 422);
  }

  if (!parsed.version || !parsed.tables) {
    return c.json({ error: "Invalid backup format — missing version or tables" }, 422);
  }

  // NOTE: Full data restore is intentionally scoped to settings only in this implementation.
  // Full table truncation + restore would require direct DB access beyond Prisma's safe API.
  // Settings restore is safe and reversible.
  try {
    const settingsToRestore = parsed.tables.settings as { key: string; value: string | null }[];
    for (const s of settingsToRestore) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value, category: inferCategory(s.key) },
      });
    }

    await createAuditLog({
      userId: user.userId, action: "RESTORE",
      tableName: "system", notes: `Settings restored from backup (v${parsed.version})`,
    });

    return c.json({ message: "Settings restored from backup successfully" });
  } catch (e) {
    return c.json({ error: "Restore failed: " + String(e) }, 500);
  }
});

function inferCategory(key: string): string {
  if (["site_name","sub_name","logo","primary_color","hero_bg"].includes(key)) return "branding";
  if (key.startsWith("developer_") || key.startsWith("dev1_") || key.startsWith("dev2_") || key.startsWith("adviser_")) return "developer";
  return "general";
}
