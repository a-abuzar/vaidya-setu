/**
 * Safe client & server check for whether Clerk authentication is active.
 *
 * Clerk is considered active ONLY when:
 * 1. Bypass is not requested via CLERK_BYPASS or NEXT_PUBLIC_CLERK_BYPASS.
 * 2. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY starts with "pk_test_" or "pk_live_".
 * 3. The key is not a dummy/placeholder string.
 */
export function isClerkActive(): boolean {
  if (
    process.env.CLERK_BYPASS === "true" ||
    process.env.NEXT_PUBLIC_CLERK_BYPASS === "true"
  ) {
    return false;
  }

  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || typeof key !== "string" || key.trim() === "") {
    return false;
  }

  if (
    key === "pk_test_placeholder" ||
    key === "clerk_publishable_bypassed" ||
    key === "placeholder"
  ) {
    return false;
  }

  return key.startsWith("pk_test_") || key.startsWith("pk_live_");
}
