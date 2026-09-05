"use client";

/**
 * Doctor sign-in entry. Clerk's hosted sign-in form, themed for the
 * AYUSH console. After successful sign-in we redirect to the
 * doctor dashboard.
 *
 * If Clerk is not configured (no `pk_test_…` key), this page shows a
 * development-mode notice and a "Continue to dashboard" button so
 * the kiosk can be demoed without real Clerk credentials.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

const publishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const hasClerk = publishableKey.startsWith("pk_");

const ClerkSignIn = dynamic(
  async () => {
    const mod = await import("@clerk/nextjs");
    function Inner(): React.ReactElement {
      return (
        <mod.SignIn
          fallbackRedirectUrl="/doctor/dashboard"
          signUpForceRedirectUrl="/doctor/dashboard"
        />
      );
    }
    return Inner;
  },
  { ssr: false },
);

export default function SignInPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Back to kiosk
      </Link>
      {hasClerk ? <ClerkSignIn /> : <DevModeNotice />}
    </main>
  );
}

function DevModeNotice(): React.ReactElement {
  return (
    <section className="max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm text-center">
      <h1 className="text-2xl font-bold">Development mode</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Clerk authentication is not configured for this build (the{" "}
        <code className="rounded bg-muted px-2 py-0.5 text-sm">
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        </code>{" "}
        is missing or does not start with{" "}
        <code className="rounded bg-muted px-2 py-0.5 text-sm">pk_</code>).
        The doctor dashboard is open for exploration.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/doctor/dashboard"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          Continue to doctor dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-border bg-background px-6 text-base font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          Back to kiosk
        </Link>
      </div>
    </section>
  );
}