import { UserButton } from "@clerk/nextjs";
import { Leaf, LayoutDashboard, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">VaidyaSetu</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Physician Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted rounded-xl font-medium transition-colors">
            <Users className="w-5 h-5" />
            Patients
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
        
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-4 py-2">
            <UserButton />
            <span className="text-sm font-medium">Doctor Account</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
