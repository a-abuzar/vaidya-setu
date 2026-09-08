import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { serverEnv } from "../env";


// Configure resilient HTTP transport for Neon serverless queries.
// Handles compute cold starts and transient network disconnects with exponential backoff.
neonConfig.fetchFunction = async (
  url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    // 25 second timeout per attempt to accommodate Neon compute spin-up
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const signal =
        typeof AbortSignal.any === "function" && init?.signal
          ? AbortSignal.any([init.signal, controller.signal])
          : (init?.signal ?? controller.signal);

      const res = await fetch(url, {
        ...init,
        signal,
      });
      return res;
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[neon-http] Connection attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1500ms
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
};

// Normalize connection string: remove -pooler for direct HTTP proxy connection if present
const connectionString = serverEnv.DATABASE_URL.replace("-pooler.", ".");
const sql = neon(connectionString);
export const db = drizzle({ client: sql, schema });

