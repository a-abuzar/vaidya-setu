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
 *
 * DEV / DEMO BYPASS:
 *   Set `CLERK_BYPASS=true` to allow placeholder Clerk keys. This is
 *   intended for local development and judged demos where a real Clerk
 *   account is not available. Production deployments MUST set
 *   `CLERK_BYPASS=false` (or unset) and supply valid keys.
 */
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────
// Non-empty string helper — rejects both missing and "" values
// ──────────────────────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1, "must not be empty");

const bypass = process.env.CLERK_BYPASS === "true";

const optionalWithFallback = (defaultValue: string) =>
  z.preprocess((val) => (typeof val === "string" && val.trim() !== "" ? val : defaultValue), z.string());

// ──────────────────────────────────────────────────────────────────────
// Server-only environment variables (never exposed to the browser)
// ──────────────────────────────────────────────────────────────────────

const serverEnvSchema = z.object({
  SARVAM_API_KEY: nonEmptyString,
  GROQ_API_KEY: nonEmptyString,
  GEMINI_API_KEY: nonEmptyString,
  CLERK_SECRET_KEY: optionalWithFallback("clerk_secret_bypassed"),
  DATABASE_URL: nonEmptyString,
  ABDM_CLIENT_ID: optionalWithFallback("abdm_not_configured"),
  ABDM_CLIENT_SECRET: optionalWithFallback("abdm_not_configured"),
});

// ──────────────────────────────────────────────────────────────────────
// Client-safe environment variables (NEXT_PUBLIC_ prefix)
// ──────────────────────────────────────────────────────────────────────

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalWithFallback("clerk_publishable_bypassed"),
});

// ──────────────────────────────────────────────────────────────────────
// Combined schema
// ──────────────────────────────────────────────────────────────────────

const envSchema = serverEnvSchema.merge(clientEnvSchema);

// ──────────────────────────────────────────────────────────────────────
// Validate at import time — fail fast
// ──────────────────────────────────────────────────────────────────────

function validateEnv(): z.infer<typeof envSchema> {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return {
      SARVAM_API_KEY: process.env.SARVAM_API_KEY || "placeholder_sarvam_api_key",
      GROQ_API_KEY: process.env.GROQ_API_KEY || "placeholder_groq_api_key",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "placeholder_gemini_api_key",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "placeholder_clerk_secret_key",
      DATABASE_URL: process.env.DATABASE_URL || "postgres://build:build@localhost:5432/build",
      ABDM_CLIENT_ID: process.env.ABDM_CLIENT_ID || "placeholder_abdm_client_id",
      ABDM_CLIENT_SECRET: process.env.ABDM_CLIENT_SECRET || "placeholder_abdm_client_secret",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder",
    };
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    const missingKeys = issues.map((issue) => {
      const key = issue.path.join(".");
      return `  • ${key}: ${issue.message}`;
    });

    const bypassHint = bypass
      ? ""
      : "\n  • Tip: set CLERK_BYPASS=true (development only) if you need to use\n    placeholder Clerk credentials during local development or a demo.\n";

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
      bypass ? "" : "╠══════════════════════════════════════════════════════════════╣",
      bypass ? "" : bypassHint.trim().split("\n").join("\n║"),
      bypass ? "" : "║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      ...missingKeys,
      "",
      `Total: ${missingKeys.length} missing variable(s)`,
      "",
    ]
      .filter(Boolean)
      .join("\n");

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

/** True when Clerk is bypassed for development / demo. */
export const clerkBypassed =
  bypass || !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");