import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
});
