/**
 * Doctor route-group layout.
 *
 * Wraps the dashboard in a signed-in check via Clerk. The middleware
 * already protects the route, but this layout provides a friendly
 * fallback so the user sees a branded redirect message rather than a
 * raw Clerk sign-in iframe.
 *
 * If Clerk is not configured (no valid `pk_test_…` / `pk_live_…`
 * publishable key), we treat every visitor as signed-in so the
 * dashboard remains explorable for local development. Real
 * deployments must set `CLERK_BYPASS=false` and provide valid keys.
 */
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isBypassed = process.env.CLERK_BYPASS === "true";
const hasClerk = !isBypassed && publishableKey.startsWith("pk_");

export default async function DoctorLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {
  if (!hasClerk) {
    // Development / demo bypass.
    return <div className="min-h-screen bg-background font-sans">{children}</div>;
  }

  // Lazy import Clerk only when keys are valid.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return <div className="min-h-screen bg-background font-sans">{children}</div>;
}