// src/middleware/errorHandler.ts
import type { Context } from "hono";

export function errorHandler(err: Error, c: Context) {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);

  if (err.name === "ZodError") {
    return c.json({ error: "Validation failed", details: JSON.parse(err.message) }, 422);
  }

  if (err.message.includes("Unique constraint")) {
    return c.json({ error: "Duplicate record — unique constraint violated" }, 409);
  }

  if (err.message.includes("Record to update not found")) {
    return c.json({ error: "Record not found" }, 404);
  }

  return c.json(
    {
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
    500
  );
}
