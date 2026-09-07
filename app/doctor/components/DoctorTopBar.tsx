"use client";

/**
 * Doctor-side top bar.
 *
 * Uses the deep-navy primary (#03045E) as background to clearly
 * distinguish the physician console from the patient-facing kiosk
 * (which uses a light off-white background).
 *
 * Layout:
 *   left  — VaidyaSetu logo + "Physician Console" label
 *   center — breadcrumb / active tab (Queue or current session)
 *   right  — Demo chip / Clerk UserButton
 *
 * When Clerk is bypassed (no valid publishable key), renders a plain
 * "Demo doctor" chip so the dashboard remains explorable in development.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles, ClipboardList, Stethoscope, UserCircle2, ArrowLeft } from "lucide-react";
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
  sessionId,
}: {
  active: Active;
  sessionId?: string;
}): React.ReactElement {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-primary shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white"
          >
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
              VaidyaSetu
            </p>
            <p className="text-sm font-bold leading-tight text-white">
              Physician Console
            </p>
          </div>
        </div>

        {/* Breadcrumb / active tab */}
        <nav className="hidden gap-1 sm:flex" aria-label="Doctor navigation">
          {active === "session" && sessionId ? (
            <>
              <Link
                href="/doctor/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Queue
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white">
                <Stethoscope className="size-4" aria-hidden="true" />
                Session #{sessionId.slice(0, 8)}
              </span>
            </>
          ) : (
            <>
              <NavLink
                href="/doctor/dashboard"
                active={active === "dashboard"}
                icon={<ClipboardList className="size-4" aria-hidden="true" />}
              >
                Queue
              </NavLink>
            </>
          )}
        </nav>

        {/* User area */}
        {UserButton ? (
          <UserButton />
        ) : (
          <DemoDoctorChip />
        )}
      </div>
    </header>
  );
}

function DemoDoctorChip(): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
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
          ? "bg-white/20 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}