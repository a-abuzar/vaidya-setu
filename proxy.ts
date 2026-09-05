/**
 * Clerk middleware for the (doctor) route group.
 *
 * The public kiosk flow stays untouched — only the doctor dashboard
 * and any of its subroutes are protected. The matcher is intentionally
 * narrow so that kiosk patients are never redirected through Clerk's
 * sign-in flow.
 *
 * DEV / DEMO BYPASS:
 *   When `CLERK_BYPASS=true` is in the environment (or when the
 *   Clerk publishable key is missing the required `pk_test_` /
 *   `pk_live_` prefix), this middleware becomes a no-op so the
 *   app can boot on a developer machine that does not yet have
 *   real Clerk credentials. Set `CLERK_BYPASS=false` (or unset)
 *   in production and provide valid Clerk keys.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isDoctorRoute = createRouteMatcher(["/doctor(.*)"]);

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const bypassClerk =
  process.env.CLERK_BYPASS === "true" ||
  !publishableKey.startsWith("pk_");

const realMiddleware = clerkMiddleware(async (auth, req) => {
  if (isDoctorRoute(req)) {
    await auth.protect();
  }
});

function noopMiddleware(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

export default bypassClerk ? noopMiddleware : realMiddleware;

export const config = {
  matcher: [
    // Run middleware on all routes except static assets and Next.js
    // internals.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};