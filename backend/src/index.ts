// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { authRoutes } from "./routes/auth";
import { personnelRoutes } from "./routes/personnel";
import { importRoutes } from "./routes/import";
import { dedupRoutes } from "./routes/dedup";
import { dashboardRoutes } from "./routes/dashboard";
import { auditRoutes } from "./routes/audit";
import { userRoutes } from "./routes/users";
import { reportsRoutes } from "./routes/reports";
import { settingsRoutes } from "./routes/settings";
import { announcementRoutes } from "./routes/announcements";
import { trashRoutes } from "./routes/trash";
import { batchRoutes } from "./routes/batch";
import { systemRoutes } from "./routes/system";
import { registrationRoutes } from "./routes/registration";
import { notificationRoutes } from "./routes/notifications";

const app = new Hono();

// ── Global Middleware ──────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ── Health check ───────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" }));
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" }));

// ── Routes ─────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/personnel", personnelRoutes);
app.route("/api/import", importRoutes);
app.route("/api/dedup", dedupRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/audit", auditRoutes);
app.route("/api/users", userRoutes);
app.route("/api/reports", reportsRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/announcements", announcementRoutes);
app.route("/api/trash", trashRoutes);
app.route("/api/batch", batchRoutes);
app.route("/api/system", systemRoutes);
app.route("/api/register", registrationRoutes);
app.route("/api/notifications", notificationRoutes);

// ── Public settings (for landing page branding) ──────
app.get("/api/public/settings", async (c) => {
  const { prisma } = await import("./lib/prisma");
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          "site_name", "sub_name", "logo", "hero_bg",
          "dev1_name", "dev1_photo", "dev1_contact",
          "dev2_name", "dev2_photo", "dev2_contact",
          "adviser_name", "adviser_photo", "adviser_contact",
        ],
      },
    },
  });
  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value ?? "";
  return c.json(result);
});

// ── 404 ────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Route not found", path: c.req.path }, 404));

// ── Error Handler ──────────────────────────────────────
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message }, 500);
});

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

export default { port, fetch: app.fetch };
