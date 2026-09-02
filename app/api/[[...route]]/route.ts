/**
 * Hono.js mount point for the VaidyaSetu API.
 * Follows eric-sison/nextjs-honojs-boilerplate pattern.
 */
import { Hono } from "hono";
import { handle } from "hono/vercel";

export const runtime = "edge";

const app = new Hono().basePath("/api");

// Mount sub-routers here (Phase 9)
const healthRouter = new Hono().get("/health", (c) => {
  return c.json({ success: true, data: { status: "ok" } });
});

const routes = app.route("/", healthRouter);

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
