/**
 * Hono.js mount point for the VaidyaSetu API.
 * All API routes are handled by this catch-all route handler.
 */
import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");

// Health check — the only endpoint until Phase 9.
app.get("/health", (c) => {
  return c.json({ success: true, data: { status: "ok" } });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
