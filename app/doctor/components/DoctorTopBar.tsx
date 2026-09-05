"use client";

/**
 * Doctor-side top bar. Different from the kiosk KioskTopBar — this
 * renders the AYUSH physician identity area, a signed-in indicator,
 * and a tabbed navigation between the queue and the per-session
 * detail page.
 *
 * When Clerk is bypassed (no valid publishable key), we render a
 * plain "Demo doctor" chip instead of the <UserButton /> so the
 * dashboard remains explorable in development.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles, ClipboardList, Stethoscope, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const publishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const hasClerk = publishableKey.startsWith("pk_");

const UserButton = hasClerk
  ? dynamic(
      async () => {
        const mod = await import("@clerk/nextjs");
        return mod.UserButton;
      },
      { ssr: false },
    )
  : null;

type Active = "dashboard" | "session";

export function DoctorTopBar({
  active,
}: {
  active: Active;
}): React.ReactElement {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              VaidyaSetu
            </p>
            <p className="text-sm font-bold leading-tight">AYUSH Clinician Console</p>
          </div>
        </div>
        <nav className="hidden gap-1 sm:flex" aria-label="Doctor navigation">
          <NavLink href="/doctor/dashboard" active={active === "dashboard"} icon={<ClipboardList className="size-4" aria-hidden="true" />}>
            Queue
          </NavLink>
          <NavLink href="/doctor/session" active={active === "session"} icon={<Stethoscope className="size-4" aria-hidden="true" />}>
            Review
          </NavLink>
        </nav>
        {UserButton ? <UserButton /> : <DemoDoctorChip />}
      </div>
    </header>
  );
}

function DemoDoctorChip(): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
      <UserCircle2 className="size-5" aria-hidden="true" />
      Demo doctor
    </span>
  );
}

function NavLink({
  href,
  active,
  children,
  icon,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}