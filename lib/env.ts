/**
 * Environment variable validation — fail-fast at import time.
 *
 * Uses Zod to validate process.env against the exact keys required by VaidyaSetu.
 * Split into server-only and client-safe (NEXT_PUBLIC_) groups.
 *
 * Imported at the top of app/layout.tsx so a misconfigured deployment fails
 * at build/boot, never at a random runtime request.
 *
 * If any required var is missing or empty, throws a single formatted error
 * listing ALL missing keys — not just the first.
 */
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────
// Non-empty string helper — rejects both missing and "" values
// ──────────────────────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1, "must not be empty");

// ──────────────────────────────────────────────────────────────────────
// Server-only environment variables (never exposed to the browser)
// ──────────────────────────────────────────────────────────────────────

const serverEnvSchema = z.object({
  SARVAM_API_KEY: nonEmptyString,
  GROQ_API_KEY: nonEmptyString,
  GEMINI_API_KEY: nonEmptyString,
  CLERK_SECRET_KEY: nonEmptyString,
  DATABASE_URL: nonEmptyString,
  ABDM_CLIENT_ID: nonEmptyString,
  ABDM_CLIENT_SECRET: nonEmptyString,
});

// ──────────────────────────────────────────────────────────────────────
// Client-safe environment variables (NEXT_PUBLIC_ prefix)
// ──────────────────────────────────────────────────────────────────────

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonEmptyString,
});

// ──────────────────────────────────────────────────────────────────────
// Combined schema
// ──────────────────────────────────────────────────────────────────────

const envSchema = serverEnvSchema.merge(clientEnvSchema);

// ──────────────────────────────────────────────────────────────────────
// Validate at import time — fail fast
// ──────────────────────────────────────────────────────────────────────

function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    const missingKeys = issues.map((issue) => {
      const key = issue.path.join(".");
      return `  • ${key}: ${issue.message}`;
    });

    const message = [
      "",
      "╔══════════════════════════════════════════════════════════════╗",
      "║  VaidyaSetu — Missing Environment Variables                  ║",
      "╠══════════════════════════════════════════════════════════════╣",
      "║                                                              ║",
      "║  The following required environment variables are missing    ║",
      "║  or empty. Copy .env.example to .env.local and fill in       ║",
      "║  all values before starting the application.                 ║",
      "║                                                              ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      ...missingKeys,
      "",
      `Total: ${missingKeys.length} missing variable(s)`,
      "",
    ].join("\n");

    throw new Error(message);
  }

  return result.data;
}

/**
 * Validated environment variables.
 *
 * Validation runs once at import time. If this module loads without
 * throwing, all env vars are guaranteed present and non-empty.
 */
export const env = validateEnv();

// ──────────────────────────────────────────────────────────────────────
// Typed accessors for convenience
// ──────────────────────────────────────────────────────────────────────

/** Server-only env vars — never import this in client components. */
export const serverEnv = {
  SARVAM_API_KEY: env.SARVAM_API_KEY,
  GROQ_API_KEY: env.GROQ_API_KEY,
  GEMINI_API_KEY: env.GEMINI_API_KEY,
  CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
  DATABASE_URL: env.DATABASE_URL,
  ABDM_CLIENT_ID: env.ABDM_CLIENT_ID,
  ABDM_CLIENT_SECRET: env.ABDM_CLIENT_SECRET,
} as const;

/** Client-safe env vars — safe to use in browser code. */
export const clientEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
} as const;
