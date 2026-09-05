import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey = publishableKey && publishableKey.startsWith("pk_");

// Only protect the physician dashboard routes. Kiosk is fully public.
const isDoctorRoute = createRouteMatcher(["/dashboard(.*)", "/doctor(.*)"]);

export default hasValidClerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (isDoctorRoute(req)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
