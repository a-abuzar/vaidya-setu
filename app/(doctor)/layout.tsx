import Link from "next/link";
import { Leaf, LayoutDashboard } from "lucide-react";

/**
 * Doctor dashboard layout — desktop-optimized shell.
 * No Clerk auth for now; will be added in Phase 12.
 */
export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-card border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground text-base leading-tight">
              VaidyaSetu
            </p>
            <p className="text-xs text-muted-foreground">Physician Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Patient Sessions
          </Link>
        </nav>

        {/* Footer note */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Auth: disabled (Phase 12)
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
